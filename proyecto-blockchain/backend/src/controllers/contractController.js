import * as contractModel from "../models/contractModel.js";
import { uploadFileToIPFS } from "../services/ipfsService.js";
import { sendMail } from "../utils/mailer.js";
import * as signerModel from "../models/signerModel.js";
import db from "../config/db.js";

// Helper: parsea firmantes que pueden venir como string (FormData) o como array
function parseFirmantes(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch {
            return [];
        }
    }
    return [];
}

// Obtener todos los contratos del usuario autenticado
export const getContracts = async (req, res) => {
    try {
        const usuario_id = req.usuario.id;
        console.log("👉 getContracts - usuario_id:", usuario_id);

        // Traer solo contratos del usuario
        const contracts = await contractModel.getContractsForUser(usuario_id);

        res.json(contracts);
    } catch (error) {
        console.error("❌ Error al obtener contratos:", error);
        res.status(500).json({ error: "Error al obtener contratos" });
    }
};


// Obtener contrato por ID
// Obtener contrato por ID o UUID
export const getContractById = async (req, res) => {
    try {
        const { id } = req.params;
        let contract;

        // Verificamos si es un número
        if (/^\d+$/.test(id)) {
            contract = await contractModel.getContractById(Number(id));
        }
        // Verificamos si es un UUID válido
        else if (/^[0-9a-fA-F-]{36}$/.test(id)) {
            contract = await contractModel.getContractByUUID(id);
        }
        else {
            return res.status(400).json({ error: "Identificador inválido" });
        }

        if (!contract) {
            return res.status(404).json({ error: "Contrato no encontrado" });
        }

        res.json(contract);
    } catch (error) {
        console.error("Error al obtener contrato:", error);
        res.status(500).json({ error: "Error al obtener contrato" });
    }
};


// Agregar contrato a la lista de un usuario usando UUID
export const addContractByUUID = async (req, res) => {
    try {
        const { uuid } = req.body;
        const usuario_id = req.usuario.id;

        if (!uuid) {
            return res.status(400).json({ error: "UUID requerido" });
        }

        // Buscar contrato
        const contrato = await contractModel.getContractByUUID(uuid);
        if (!contrato) {
            return res.status(404).json({ error: "Contrato no encontrado" });
        }

        // Asociar usuario al contrato
        await contractModel.linkUserToContract(usuario_id, contrato.id);

        return res.json({ mensaje: "Contrato agregado a tu lista", contrato });
    } catch (error) {
        console.error("❌ Error en addContractByUUID:", error);
        res.status(500).json({ error: "Error al agregar contrato" });
    }
};

// Crear contrato


export const createContract = async (req, res) => {
    const client = await db.connect();
    try {
        await client.query("BEGIN");

        const { titulo, descripcion } = req.body;
        const creador_id = req.usuario.id;

        // 1. Validar archivo PDF
        if (!req.file) {
            return res.status(400).json({ error: "Se requiere un archivo PDF" });
        }

        const fileBuffer = req.file.buffer;
        const fileName = req.file.originalname;
        console.log("Subiendo a IPFS:", fileName);

        // 2. Subir a IPFS
        const { cid, url } = await uploadFileToIPFS(fileBuffer, fileName);

        // 3. Guardar contrato en DB (usando tu modelo existente)
        const nuevoContrato = await contractModel.createContract({
            titulo,
            descripcion,
            ipfs_hash: cid,
            ipfs_url: url,
            creador_id,
        });

        // Relacionar contrato con usuario creador
        await contractModel.linkUserToContract(creador_id, nuevoContrato.id);

        // 4. Parsear firmantes
        let firmantesArray = parseFirmantes(req.body.firmantes);

        firmantesArray = firmantesArray
            .map((f) => ({
                email: (f.email || "").trim(),
                nombre_completo: (f.nombre_completo || f.nombre || "").trim(),
                rol_firmante: f.rol_firmante || f.rol || "firmante",
                usuario_id: f.usuario_id || null,
            }))
            .filter((f) => !!f.email);

        // 5. Insertar firmantes
        let invitados = 0;
        for (const f of firmantesArray) {
            try {
                await signerModel.addSigner({
                    contrato_id: nuevoContrato.id,
                    usuario_id: f.usuario_id || null,
                    email: f.email,
                    nombre_completo: f.nombre_completo || f.email,
                    rol_firmante: f.rol_firmante,
                });
                invitados++;
            } catch (e) {
                console.error("⚠️ No se pudo insertar firmante:", f.email, e?.message);
            }
        }

        // 6. Enviar mails a firmantes
        for (const f of firmantesArray) {
            try {
                await sendMail(
                    f.email,
                    `📄 Nuevo contrato asignado: ${nuevoContrato.titulo}`,
                    `
  <div style="font-family: Arial, sans-serif; color: #333; background: #f7f7f7; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      
      <!-- Encabezado -->
      <div style="background: #0d6efd; color: #fff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Blockchain Contracts</h2>
      </div>
      
      <!-- Cuerpo -->
      <div style="padding: 20px;">
        <p>Hola <b>${f.nombre_completo || "firmante"}</b>,</p>
        <p>Se te ha asignado un nuevo contrato en el sistema <b>Blockchain Contracts</b>:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">📌 UUID:</td>
            <td style="padding: 8px;">${nuevoContrato.uuid}</td>
          </tr>
          <tr style="background: #f2f2f2;">
            <td style="padding: 8px; font-weight: bold;">📄 Título:</td>
            <td style="padding: 8px;">${nuevoContrato.titulo}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">📝 Descripción:</td>
            <td style="padding: 8px;">${nuevoContrato.descripcion || "-"}</td>
          </tr>
          <tr style="background: #f2f2f2;">
            <td style="padding: 8px; font-weight: bold;">🔗 URL IPFS:</td>
            <td style="padding: 8px;">
              <a href="${nuevoContrato.ipfs_url}" target="_blank" style="color: #0d6efd; text-decoration: none;">
                Ver documento
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">📅 Fecha de creación:</td>
            <td style="padding: 8px;">${nuevoContrato.fecha_creacion}</td>
          </tr>
        </table>

        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:3000/login" 
             style="background: #0d6efd; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Ingresar al sistema y firmar
          </a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background: #f2f2f2; color: #555; text-align: center; padding: 10px; font-size: 12px;">
        © 2025 Blockchain Contracts. Todos los derechos reservados.
      </div>
    </div>
  </div>
  `
                );

                console.log("📩 Enviando mail a:", f.email);
            } catch (e) {
                console.error("⚠️ Error enviando mail a:", f.email, e?.message);
            }
        }

        // 7. Vincular el contrato al último pago confirmado del usuario
        await client.query(
            `UPDATE contratos_pagos
             SET contrato_id = $1
             WHERE id = (
                 SELECT id
                 FROM contratos_pagos
                 WHERE usuario_id = $2
                   AND contrato_id IS NULL
                   AND estado_id = 2
                 ORDER BY fecha_actualizacion DESC
                 LIMIT 1
                 )`,
            [nuevoContrato.id, creador_id]
        );

        await client.query("COMMIT");

        console.log("Contrato guardado en DB:", nuevoContrato, "— firmantes insertados:", invitados);
        res.status(201).json({
            mensaje:
                invitados > 0
                    ? "Contrato creado, subido a IPFS, firmantes invitados y notificados."
                    : "Contrato creado y subido a IPFS (sin firmantes).",
            contrato: nuevoContrato,
            firmantes_invitados: invitados,
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error detallado al crear contrato:", error);
        res.status(500).json({ error: "Error al crear contrato", detalle: error.message });
    } finally {
        client.release();
    }
};



export const uploadContractToIPFS = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si el contrato existe
        const contrato = await contractModel.getContractById(id);
        if (!contrato) {
            return res.status(404).json({ error: "Contrato no encontrado" });
        }

        // Verificar que tenga un PDF para subir
        if (!contrato.contenido_pdf_path) {
            return res.status(400).json({ error: "El contrato no tiene un PDF para subir a IPFS" });
        }

        // Subir archivo a IPFS usando Storacha
        const { cid, url } = await uploadFileToIPFS(contrato.contenido_pdf_path);

        // Guardar hash y URL en la base
        const contratoActualizado = await contractModel.updateIPFSData(id, cid, url);

        res.json({
            mensaje: "Contrato subido a IPFS correctamente",
            contrato: contratoActualizado
        });
    } catch (error) {
        console.error("Error al subir contrato a IPFS:", error);
        res.status(500).json({ error: "Error al subir contrato a IPFS" });
    }
};
export const deleteContract = async (req, res) => {
    try {
        const { id } = req.params;
        const contrato = await contractModel.getContractById(id);

        if (!contrato) {
            return res.status(404).json({ error: "Contrato no encontrado" });
        }

        const usuario_id = req.usuario.id;
        const esAdmin = req.usuario.rol === "admin";
        const esCreador = Number(contrato.creador_id) === Number(usuario_id);

        // 🔒 Si el contrato ya tiene firmas → no se puede eliminar
        const firmado = await contractModel.hasSignedUsers(contrato.id);
        if (firmado) {
            return res.status(403).json({ error: "No podés eliminar un contrato que ya tiene firmas." });
        }

        // Si no es admin ni creador → no puede
        if (!esAdmin && !esCreador) {
            return res.status(403).json({ error: "No autorizado para eliminar este contrato" });
        }

        // 🔑 Chequear cuántos vínculos hay
        const vinculados = await contractModel.countUsersLinkedToContract(contrato.id);

        if (vinculados > 1) {
            // Si hay más de un usuario vinculado → solo se elimina el vínculo del que borra
            await contractModel.unlinkUserFromContract(usuario_id, contrato.id);
            return res.json({ mensaje: "Contrato eliminado solo de tu lista" });
        } else {
            // Si es el único vinculado → eliminar contrato completo
            const eliminado = await contractModel.deleteContract(id);
            return res.json({
                mensaje: "Contrato eliminado definitivamente",
                contrato: eliminado,
            });
        }
    } catch (error) {
        console.error("Error al eliminar contrato:", error);
        return res.status(500).json({ error: "Error al eliminar contrato" });
    }
};


