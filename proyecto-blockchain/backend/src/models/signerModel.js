import pool from "../config/db.js";

// Obtener todos los firmantes de un contrato
export const getSignersByContractId = async (contratoId) => {
    const result = await pool.query(`
    SELECT f.id, f.email, f.nombre_completo, f.rol_firmante, ef.nombre AS estado, f.fecha_invitacion, f.fecha_firma
    FROM firmantes f
    JOIN estados_firma ef ON f.estado_id = ef.id
    WHERE f.contrato_id = $1
  `, [contratoId]);
    return result.rows;
};

// Agregar un firmante
export const addSigner = async ({ contrato_id, usuario_id, email, nombre_completo, rol_firmante }) => {
    const result = await pool.query(`
    INSERT INTO firmantes (contrato_id, usuario_id, email, nombre_completo, rol_firmante)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, contrato_id, usuario_id, email, nombre_completo, rol_firmante, estado_id
  `, [contrato_id, usuario_id || null, email, nombre_completo, rol_firmante]);
    return result.rows[0];
};

// Actualizar estado de firma
export const updateSignerStatus = async (id, estado_id) => {
    const result = await pool.query(`
    UPDATE firmantes
    SET estado_id = $1, fecha_firma = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id, contrato_id, email, nombre_completo, estado_id, fecha_firma
  `, [estado_id, id]);
    return result.rows[0];
};
