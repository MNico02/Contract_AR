// controllers/contractController.js
import * as contractModel from "../models/contractModel.js";
import * as signerModel from "../models/signerModel.js"; // 👈 NUEVO
import { uploadFileToIPFS } from "../services/ipfsService.js";
import { sendMail } from "../utils/mailer.js";
import crypto from "crypto";

// helper para hash sha256 hex prefijado con 0x
function sha256Hex0x(buffer) {
    const h = crypto.createHash("sha256");
    h.update(buffer);
    
    return "0x" + h.digest("hex");
}

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

        const contracts = await contractModel.getContractsForUser(usuario_id);
        res.json(contracts);
    } catch (error) {
        console.error("❌ Error al obtener contratos:", error);
        res.status(500).json({ error: "Error al obtener contratos" });
    }
};

// Obtener contrato por ID o UUID
export const getContractById = async (req, res) => {
    try {
        const { id } = req.params;
        let contract;

        if (/^\d+$/.test(id)) {
            contract = await contractModel.getContractById(Number(id));
        } else if (/^[0-9a-fA-F-]{36}$/.test(id)) {
            contract = await contractModel.getContractByUUID(id);
        } else {
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

        const contrato = await contractModel.getContractByUUID(uuid);
        if (!contrato) {
            return res.status(404).json({ error: "Contrato no encontrado" });
        }

        await contractModel.linkUserToContract(usuario_id, contrato.id);

        return res.json({ mensaje: "Contrato agregado a tu lista", contrato });
    } catch (error) {
        console.error("❌ Error en addContractByUUID:", error);
        res.status(500).json({ error: "Error al agregar contrato" });
    }
};

// Crear contrato
export const createContract = async (req, res) => {
    try {
        console.log("Body recibido:", req.body);
        console.log("Archivo recibido:", req.file);

        const { titulo, descripcion } = req.body;
        const creador_id = req.usuario.id;

        if (!req.file) {
            return res.status(400).json({ error: "Se requiere un archivo PDF" });
        }

        const fileBuffer = req.file.buffer;
        const fileName = req.file.originalname;
        console.log("Subiendo a IPFS:", fileName);

        const { cid, url } = await uploadFileToIPFS(fileBuffer, fileName);
        console.log("IPFS:", cid, url);

        const fileHash = sha256Hex0x(fileBuffer);

        // 1) Crear contrato en DB (modelo)
        const nuevoContrato = await contractModel.createContract({
            titulo,
            descripcion,
            ipfs_hash: cid,
            ipfs_url: url,
            creador_id,
            blockchain_hash: fileHash,
        });
        await contractModel.linkUserToContract(creador_id, nuevoContrato.id);
        // 2) Parsear firmantes (vienen como string en multipart/form-data)
        let firmantesArray = parseFirmantes(req.body.firmantes);

        // Normalizar campos y filtrar inválidos
        firmantesArray = firmantesArray
            .map((f) => ({
                email: (f.email || "").trim(),
                nombre_completo: (f.nombre_completo || f.nombre || "").trim(),
                rol_firmante: f.rol_firmante || f.rol || "firmante",
                usuario_id: f.usuario_id || null,
            }))
            .filter((f) => !!f.email);

        // 3) Insertar firmantes usando el modelo (MVC)
        let invitados = 0;
        for (const f of firmantesArray) {
            try {
                await signerModel.addSigner({
                    contrato_id: nuevoContrato.id,     // 👈 usamos ID numérico del contrato recién creado
                    usuario_id: f.usuario_id || null,  // si viene, mejor para matchear por usuario_id
                    email: f.email,
                    nombre_completo: f.nombre_completo || f.email,
                    rol_firmante: f.rol_firmante,
                });
                invitados++;
            } catch (e) {
                // No frenamos toda la creación por un firmante fallido; log y seguimos
                console.error("⚠️ No se pudo insertar firmante:", f.email, e?.message);
            }
        }

        // 4) (Opcional) Si hubo firmantes, actualizar estado del contrato a 'pendiente_firmas'
        // Solo si tu modelo tiene este método; no rompemos si no existe.
       /* if (invitados > 0 && typeof contractModel.updateContractEstadoByNombre === "function") {
            try {
                await contractModel.updateContractEstadoByNombre(nuevoContrato.id, "pendiente_firmas");
            } catch (e) {
                console.warn("⚠️ No se pudo actualizar estado a pendiente_firmas:", e?.message);
            }
        }*/

        // 5) Enviar mails a los firmantes (después de insertarlos)
        for (const f of firmantesArray) {
            try {
                await sendMail(
                    f.email,
                    `Nuevo contrato creado: ${nuevoContrato.titulo}`,
                    `
          <p>Hola <b>${f.nombre_completo || "firmante"}</b>,</p>
          <p>Se te ha asignado un nuevo contrato en el sistema <b>Blockchain Contracts</b>.</p>
          <ul>
            <li><b>UUID:</b> ${nuevoContrato.uuid}</li>
            <li><b>Título:</b> ${nuevoContrato.titulo}</li>
            <li><b>Descripción:</b> ${nuevoContrato.descripcion || "-"}</li>
            <li><b>URL IPFS:</b> <a href="${nuevoContrato.ipfs_url}" target="_blank" rel="noreferrer">${nuevoContrato.ipfs_url}</a></li>
            <li><b>Fecha de creación:</b> ${nuevoContrato.fecha_creacion}</li>
          </ul>
          <p>Ingresá al sistema para ver y firmar el documento.</p>
          `
                );
                console.log("📩 Enviando mail a:", f.email);
            } catch (e) {
                console.error("⚠️ Error enviando mail a:", f.email, e?.message);
            }
        }

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
        console.error("Error detallado al crear contrato:", error);
        res.status(500).json({ error: "Error al crear contrato", detalle: error.message });
    }
};

// POST /api/contratos/:uuid/blockchain-created
// body: { txHash, network_id }  // network_id = 1 polygon, 2 ethereum (según tu tabla redes_blockchain)
export const recordBlockchainCreationTx = async (req, res) => {
    try {
        const { uuid } = req.params;
        const { txHash, network_id } = req.body;
        if (!txHash) return res.status(400).json({ error: "txHash requerido" });

        const contrato = await contractModel.getContractByUUID(uuid);
        if (!contrato) return res.status(404).json({ error: "Contrato no encontrado" });

        // guardar tx de creación
        await contractModel.updateContractTx(contrato.id, {
            transaction_hash: txHash,
            blockchain_network_id: network_id || 1,
        });

        // log a transacciones_blockchain
        await contractModel.insertBlockchainTx({
            contrato_id: contrato.id,
            usuario_id: req.usuario.id || null,
            tipo_transaccion: "create",
            transaction_hash: txHash,
            network_id: network_id || 1,
        });

        return res.json({ ok: true });
    } catch (e) {
        console.error("recordBlockchainCreationTx:", e);
        return res.status(500).json({ error: "No se pudo registrar la transacción" });
    }
};

// POST /api/contratos/:uuid/blockchain-signed
// body: { txHash, network_id, rol: "proveedor"|"consumidor" }
export const recordBlockchainSignatureTx = async (req, res) => {
    try {
        const { uuid } = req.params;
        const { txHash, network_id, rol } = req.body;
        if (!txHash) return res.status(400).json({ error: "txHash requerido" });

        const contrato = await contractModel.getContractByUUID(uuid);
        if (!contrato) return res.status(404).json({ error: "Contrato no encontrado" });

        await contractModel.insertBlockchainTx({
            contrato_id: contrato.id,
            usuario_id: req.usuario.id || null,
            tipo_transaccion: rol === "proveedor" ? "sign_provider" : "sign_consumer",
            transaction_hash: txHash,
            network_id: network_id || 1,
        });

        return res.json({ ok: true });
    } catch (e) {
        console.error("recordBlockchainSignatureTx:", e);
        return res.status(500).json({ error: "No se pudo registrar la transacción de firma" });
    }
};

export const uploadContractToIPFS = async (req, res) => {
    try {
        const { id } = req.params;

        const contrato = await contractModel.getContractById(id);
        if (!contrato) {
            return res.status(404).json({ error: "Contrato no encontrado" });
        }

        if (!contrato.contenido_pdf_path) {
            return res.status(400).json({ error: "El contrato no tiene un PDF para subir a IPFS" });
        }

        const { cid, url } = await uploadFileToIPFS(contrato.contenido_pdf_path);
        const contratoActualizado = await contractModel.updateIPFSData(id, cid, url);

        res.json({
            mensaje: "Contrato subido a IPFS correctamente",
            contrato: contratoActualizado,
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

        // Si no es admin ni creador, no puede
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
