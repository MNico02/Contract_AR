import pool from "../config/db.js";

// Obtener todos los contratos con filtros
export const getAllContracts = async (filters = {}) => {
    let query = `
        SELECT
            c.id,
            c.uuid,
            c.titulo,
            c.descripcion,
            c.ipfs_hash,
            c.ipfs_url,
            c.blockchain_hash,
            c.transaction_hash,
            ec.nombre AS estado,
            c.estado_id,
            rb.nombre AS blockchain_network,
            c.fecha_creacion,
            c.fecha_firmado,
            u.nombre || ' ' || u.apellido AS creador,
            c.creador_id
        FROM contratos c
        JOIN estados_contrato ec ON c.estado_id = ec.id
        LEFT JOIN usuarios u ON c.creador_id = u.id
        LEFT JOIN redes_blockchain rb ON c.blockchain_network_id = rb.id
        WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 1;

    // Aplicar filtros
    if (filters.creador_id) {
        query += ` AND c.creador_id = $${paramCount}`;
        values.push(filters.creador_id);
        paramCount++;
    }

    if (filters.estado) {
        query += ` AND ec.nombre = $${paramCount}`;
        values.push(filters.estado);
        paramCount++;
    }

    if (filters.search) {
        query += ` AND (c.titulo ILIKE $${paramCount} OR c.descripcion ILIKE $${paramCount})`;
        values.push(`%${filters.search}%`);
        paramCount++;
    }

    if (filters.fecha_desde) {
        query += ` AND c.fecha_creacion >= $${paramCount}`;
        values.push(filters.fecha_desde);
        paramCount++;
    }

    if (filters.fecha_hasta) {
        query += ` AND c.fecha_creacion <= $${paramCount}`;
        values.push(filters.fecha_hasta);
        paramCount++;
    }

    query += ` ORDER BY c.fecha_creacion DESC`;

    // Paginación
    if (filters.limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(filters.limit);
        paramCount++;
    }

    if (filters.offset) {
        query += ` OFFSET $${paramCount}`;
        values.push(filters.offset);
    }

    const result = await pool.query(query, values);
    return result.rows;
};

// Obtener contrato por ID con detalles completos
export const getContractById = async (id) => {
    const result = await pool.query(`
        SELECT
            c.id,
            c.uuid,
            c.titulo,
            c.descripcion,
            c.ipfs_hash,
            c.ipfs_url,
            c.blockchain_hash,
            c.transaction_hash,
            ec.nombre AS estado,
            c.estado_id,
            rb.nombre AS blockchain_network,
            c.fecha_creacion,
            c.fecha_firmado,
            u.id as creador_id,
            u.nombre || ' ' || u.apellido AS creador,
            u.email as creador_email
        FROM contratos c
        JOIN estados_contrato ec ON c.estado_id = ec.id
        LEFT JOIN usuarios u ON c.creador_id = u.id
        LEFT JOIN redes_blockchain rb ON c.blockchain_network_id = rb.id
        WHERE c.id = $1
    `, [id]);
    return result.rows[0];
};

// Crear contrato
export const createContract = async ({ 
    titulo, 
    descripcion,
    ipfs_hash, 
    ipfs_url, 
    creador_id,
    blockchain_network_id
}) => {
    const result = await pool.query(`
        INSERT INTO contratos (
            titulo, 
            descripcion, 
            ipfs_hash, 
            ipfs_url, 
            creador_id,
            blockchain_network_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `, [
        titulo, 
        descripcion,
        ipfs_hash, 
        ipfs_url, 
        creador_id,
        blockchain_network_id || 1
    ]);
    return result.rows[0];
};

// Actualizar contrato
export const updateContract = async (id, updates) => {
    const allowedFields = ['titulo', 'descripcion', 'estado_id', 'fecha_vencimiento'];
    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
            setClause.push(`${key} = $${paramCount}`);
            values.push(value);
            paramCount++;
        }
    }

    if (setClause.length === 0) {
        throw new Error('No hay campos válidos para actualizar');
    }

    setClause.push(`fecha_actualizacion = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const query = `
        UPDATE contratos 
        SET ${setClause.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
};

// Eliminar contrato
export const deleteContract = async (id) => {
    const result = await pool.query(`
        DELETE FROM contratos 
        WHERE id = $1
        RETURNING id, titulo
    `, [id]);
    return result.rows[0];
};

// Actualizar estado del contrato
export const updateContractStatus = async (id, estado_id) => {
    const result = await pool.query(`
        UPDATE contratos 
        SET estado_id = $1, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
    `, [estado_id, id]);
    return result.rows[0];
};

// Actualizar hash de blockchain
export const updateBlockchainHash = async (id, blockchain_hash, transaction_hash) => {
    const result = await pool.query(`
        UPDATE contratos 
        SET blockchain_hash = $1, transaction_hash = $2, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
    `, [blockchain_hash, transaction_hash, id]);
    return result.rows[0];
};

// Obtener estadísticas de contratos
export const getContractStats = async (userId = null) => {
    let whereClause = '';
    const values = [];
    
    if (userId) {
        whereClause = 'WHERE c.creador_id = $1';
        values.push(userId);
    }

    const query = `
        SELECT 
            COUNT(*) FILTER (WHERE ec.nombre = 'borrador') as borradores,
            COUNT(*) FILTER (WHERE ec.nombre = 'pendiente_firmas') as pendientes,
            COUNT(*) FILTER (WHERE ec.nombre = 'firmado') as firmados,
            COUNT(*) FILTER (WHERE ec.nombre = 'cancelado') as cancelados,
            COUNT(*) as total
        FROM contratos c
        JOIN estados_contrato ec ON c.estado_id = ec.id
        ${whereClause}
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
};

// Obtener contratos por firmante
export const getContractsBySignerEmail = async (email) => {
    const result = await pool.query(`
        SELECT DISTINCT
            c.id,
            c.uuid,
            c.titulo,
            c.descripcion,
            ec.nombre AS estado,
            c.fecha_creacion,
            ef.nombre as estado_firma
        FROM contratos c
        JOIN estados_contrato ec ON c.estado_id = ec.id
        JOIN firmantes f ON f.contrato_id = c.id
        JOIN estados_firma ef ON f.estado_id = ef.id
        WHERE f.email = $1
        ORDER BY c.fecha_creacion DESC
    `, [email]);
    return result.rows;
};

// Verificar si un usuario puede acceder a un contrato
export const canUserAccessContract = async (contractId, userId) => {
    const result = await pool.query(`
        SELECT EXISTS(
            SELECT 1 FROM contratos WHERE id = $1 AND creador_id = $2
            UNION
            SELECT 1 FROM firmantes f 
            JOIN usuarios u ON u.email = f.email 
            WHERE f.contrato_id = $1 AND u.id = $2
        ) as can_access
    `, [contractId, userId]);
    return result.rows[0].can_access;
};