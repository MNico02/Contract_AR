import * as transactionModel from "../models/transactionModel.js";

// Obtener transacciones por contrato
export const getTransactionsByContract = async (req, res) => {
    try {
        const { contratoId } = req.params;
        const transactions = await transactionModel.getTransactionsByContractId(contratoId);
        res.json(transactions);
    } catch (error) {
        console.error("Error al obtener transacciones:", error);
        res.status(500).json({ error: "Error al obtener transacciones" });
    }
};

// Agregar transacción
export const addTransaction = async (req, res) => {
    try {
        const { contrato_id, usuario_id, tipo_transaccion, transaction_hash, network_id } = req.body;

        if (!contrato_id || !tipo_transaccion || !transaction_hash) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        const newTransaction = await transactionModel.addTransaction({
            contrato_id,
            usuario_id,
            tipo_transaccion,
            transaction_hash,
            network_id
        });

        res.status(201).json(newTransaction);
    } catch (error) {
        console.error("Error al agregar transacción:", error);
        res.status(500).json({ error: "Error al agregar transacción" });
    }
};

// Actualizar estado de transacción
export const updateTransactionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado_id } = req.body;

        if (!estado_id) {
            return res.status(400).json({ error: "Debe especificar estado_id" });
        }

        const updatedTransaction = await transactionModel.updateTransactionStatus(id, estado_id);
        res.json(updatedTransaction);
    } catch (error) {
        console.error("Error al actualizar transacción:", error);
        res.status(500).json({ error: "Error al actualizar transacción" });
    }
};
