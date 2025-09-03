import * as contractModel from "../models/contractModel.js";
import { uploadFileToIPFS } from "../services/ipfsService.js";
import { sendMail } from "../utils/mailer.js";
// Obtener todos los contratos
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

        //guadar contrato en DB
        const nuevoContrato = await contractModel.createContract({
            titulo,
            descripcion,
            ipfs_hash: cid,
            ipfs_url: url,
            creador_id
        });
        await contractModel.linkUserToContract(creador_id, nuevoContrato.id);
        let firmantesArray = [];
        try {
            if (req.body.firmantes) {
                firmantesArray = JSON.parse(req.body.firmantes); // viene como string desde el front
            }
        } catch (e) {
            console.error("Error parseando firmantes:", e);
        }

        for (const f of firmantesArray) {
            if (f.email) {
                await sendMail(
                    f.email,
                    `Nuevo contrato creado: ${nuevoContrato.titulo}`,
                    `
                    <p>Hola <b>${f.nombre || "firmante"}</b>,</p>
                    <p>Se te ha asignado un nuevo contrato en el sistema <b>Blockchain Contracts</b>.</p>
                    <ul>
                        <li><b>UUID:</b> ${nuevoContrato.uuid}</li>
                        <li><b>Título:</b> ${nuevoContrato.titulo}</li>
                        <li><b>Descripción:</b> ${nuevoContrato.descripcion}</li>
                        <li><b>URL IPFS:</b> <a href="${nuevoContrato.ipfs_url}" target="_blank">${nuevoContrato.ipfs_url}</a></li>
                        <li><b>Fecha de creación:</b> ${nuevoContrato.fecha_creacion}</li>
                    </ul>
                    <p>Por favor, accedé al sistema para ver más detalles.</p>
                    `
                );
            }
        }

        console.log("Contrato guardado en DB:", nuevoContrato);

        res.status(201).json({
            mensaje: "Contrato creado, subido a IPFS correctamente y notificado a los firmantes",
            contrato: nuevoContrato
        });

    } catch (error) {
        console.error("Error detallado al crear contrato:", error);
        res.status(500).json({ error: "Error al crear contrato", detalle: error.message });
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

        // Si no es admin ni creador, no puede
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

