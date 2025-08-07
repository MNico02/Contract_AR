import pool from "../config/db.js";

// Obtener todos los contratos
export const getAllContracts = async () => {
    const result = await pool.query(`
        SELECT
            c.id,
            c.uuid,
            c.titulo,
            c.descripcion,
            c.ipfs_hash,
            c.ipfs_url,
            ec.nombre AS estado,
            c.fecha_creacion,
            u.nombre || ' ' || u.apellido AS creador
        FROM contratos c
                 JOIN estados_contrato ec ON c.estado_id = ec.id
                 LEFT JOIN usuarios u ON c.creador_id = u.id
    `);
    return result.rows;
};


// Obtener contrato por ID
export const getContractById = async (id) => {
    const result = await pool.query(`
        SELECT
            c.id,
            c.uuid,
            c.titulo,
            c.descripcion,
            c.ipfs_hash,
            c.ipfs_url,
            ec.nombre AS estado,
            c.fecha_creacion,
            u.nombre || ' ' || u.apellido AS creador
        FROM contratos c
                 JOIN estados_contrato ec ON c.estado_id = ec.id
                 LEFT JOIN usuarios u ON c.creador_id = u.id
        WHERE c.id = $1
    `, [id]);
    return result.rows[0];
};


export const createContract = async ({ titulo, descripcion, ipfs_hash, ipfs_url, creador_id }) => {
    console.log({ titulo, descripcion, ipfs_hash, ipfs_url, creador_id });
    const result = await pool.query(`
    INSERT INTO contratos (titulo, descripcion, ipfs_hash, ipfs_url, creador_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, uuid, titulo, descripcion, ipfs_hash, ipfs_url, creador_id
  `, [titulo, descripcion, ipfs_hash, ipfs_url, creador_id]);
    return result.rows[0];
};
export const updateIPFSData = async (id, cid, url) => {
    const result = await pool.query(`
    UPDATE contratos
    SET ipfs_hash = $1, ipfs_url = $2
    WHERE id = $3
    RETURNING id, titulo, ipfs_hash, ipfs_url
  `, [cid, url, id]);
    return result.rows[0];
};
