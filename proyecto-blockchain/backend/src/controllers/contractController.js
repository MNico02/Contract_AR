import * as contractModel from "../models/contractModel.js";
import { uploadFileToIPFS } from "../services/ipfsService.js";
import blockchain from "../blockchain/contract.js";
// Obtener todos los contratos
export const getContracts = async (req, res) => {
    try {
        const contracts = await contractModel.getAllContracts();
        res.json(contracts);
    } catch (error) {
        console.error("Error al obtener contratos:", error);
        res.status(500).json({ error: "Error al obtener contratos" });
    }
};

// Obtener contrato por ID
export const getContractById = async (req, res) => {
    try {
        const { id } = req.params;
        const contract = await contractModel.getContractById(id);
        if (!contract) {
            return res.status(404).json({ error: "Contrato no encontrado" });
        }
        res.json(contract);
    } catch (error) {
        console.error("Error al obtener contrato:", error);
        res.status(500).json({ error: "Error al obtener contrato" });
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

        const nuevoContrato = await contractModel.createContract({
            titulo,
            descripcion,
            ipfs_hash: cid,
            ipfs_url: url,
            creador_id
        });

        console.log("Contrato guardado en DB:", nuevoContrato);

        res.status(201).json({
            mensaje: "Contrato creado y subido a IPFS correctamente",
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

        // Solo puede eliminar el creador o un admin
        const esAdmin = req.usuario.rol === "admin";
        const esCreador = Number(contrato.creador_id) === Number(req.usuario.id);

        if (!esAdmin && !esCreador) {
            return res.status(403).json({ error: "No autorizado para eliminar este contrato" });
        }

        const eliminado = await contractModel.deleteContract(id);
        // eliminado trae { id, titulo } por el RETURNING del modelo
        return res.json({
            mensaje: "Contrato eliminado exitosamente",
            contrato: eliminado,
        });
    } catch (error) {
        console.error("Error al eliminar contrato:", error);
        return res.status(500).json({ error: "Error al eliminar contrato" });
    }
};

export const getBlockchainContract = async (req, res) => {
  try {
    const { uuid } = req.params;
    const contrato = await blockchain.readOnlyContract.obtenerContrato(uuid);

    res.json({
      uuid,
      blockchainData: contrato,
    });
  } catch (error) {
    console.error("Error al consultar contrato en blockchain:", error);
    res.status(500).json({ error: "Error al consultar en blockchain" });
  }
};