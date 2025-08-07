import pool from "../config/db.js";

// Obtener transacciones por contrato
export const getTransactionsByContractId = async (contratoId) => {
    const result = await pool.query(`
    SELECT t.id, t.transaction_hash, rt.nombre AS red, et.nombre AS estado, t.fecha_envio
    FROM transacciones_blockchain t
    JOIN redes_blockchain rt ON t.network_id = rt.id
    JOIN estados_transaccion et ON t.estado_id = et.id
    WHERE t.contrato_id = $1
  `, [contratoId]);
    return result.rows;
};

// Agregar transacción
export const addTransaction = async ({ contrato_id, usuario_id, tipo_transaccion, transaction_hash, network_id }) => {
    const result = await pool.query(`
    INSERT INTO transacciones_blockchain (contrato_id, usuario_id, tipo_transaccion, transaction_hash, network_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, contrato_id, transaction_hash, network_id, estado_id
  `, [contrato_id, usuario_id || null, tipo_transaccion, transaction_hash, network_id || 1]);
    return result.rows[0];
};

// Actualizar estado de transacción
export const updateTransactionStatus = async (id, estado_id) => {
    const result = await pool.query(`
    UPDATE transacciones_blockchain
    SET estado_id = $1
    WHERE id = $2
    RETURNING id, contrato_id, transaction_hash, estado_id
  `, [estado_id, id]);
    return result.rows[0];
};
