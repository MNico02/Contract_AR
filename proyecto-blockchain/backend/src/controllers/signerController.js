import * as signerModel from "../models/signerModel.js";

// Obtener firmantes por contrato
export const getSignersByContract = async (req, res) => {
    try {
        const { contratoId } = req.params;
        const signers = await signerModel.getSignersByContractId(contratoId);
        res.json(signers);
    } catch (error) {
        console.error("Error al obtener firmantes:", error);
        res.status(500).json({ error: "Error al obtener firmantes" });
    }
};

// Agregar firmante
export const addSigner = async (req, res) => {
    try {
        const { contrato_id, usuario_id, email, nombre_completo, rol_firmante } = req.body;

        if (!contrato_id || !email || !nombre_completo) {
            return res.status(400).json({ error: "Datos incompletos para firmante" });
        }

        const newSigner = await signerModel.addSigner({ contrato_id, usuario_id, email, nombre_completo, rol_firmante });
        res.status(201).json(newSigner);
    } catch (error) {
        console.error("Error al agregar firmante:", error);
        res.status(500).json({ error: "Error al agregar firmante" });
    }
};

// Actualizar estado de firma
export const updateSignerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado_id } = req.body;

        if (!estado_id) {
            return res.status(400).json({ error: "Debe especificar estado_id" });
        }

        const updatedSigner = await signerModel.updateSignerStatus(id, estado_id);
        res.json(updatedSigner);
    } catch (error) {
        console.error("Error al actualizar estado del firmante:", error);
        res.status(500).json({ error: "Error al actualizar estado del firmante" });
    }
};
