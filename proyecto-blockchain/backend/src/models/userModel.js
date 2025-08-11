import pool from "../config/db.js";

// Obtener todos los usuarios
export const getAllUsers = async () => {
    const result = await pool.query(`
    SELECT u.id, u.uuid, u.email, u.nombre, u.apellido, u.telefono, r.nombre AS rol, u.estado, u.fecha_creacion
    FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    ORDER BY u.fecha_creacion DESC
  `);
    return result.rows;
};

// Obtener usuario por ID
export const getUserById = async (id) => {
    const result = await pool.query(`
    SELECT u.id, u.uuid, u.email, u.nombre, u.apellido, u.telefono, 
           r.nombre AS rol, u.estado, u.fecha_creacion, u.ultima_conexion
    FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.id = $1
  `, [id]);
    return result.rows[0];
};

// Obtener usuario por email
export const getUserByEmail = async (email) => {
    const result = await pool.query(`
    SELECT u.id, u.uuid, u.email, u.password_hash, u.nombre, u.apellido, 
           r.nombre AS rol, u.estado, u.rol_id
    FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.email = $1
  `, [email]);
    return result.rows[0];
};

// Crear usuario
export const createUser = async ({ email, passwordHash, nombre, apellido, telefono, rol_id }) => {
    const result = await pool.query(`
    INSERT INTO usuarios (email, password_hash, nombre, apellido, telefono, rol_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, uuid, email, nombre, apellido, telefono, rol_id
  `, [email, passwordHash, nombre, apellido, telefono, rol_id || 2]);
    return result.rows[0];
};

// Actualizar usuario
export const updateUser = async (id, updates) => {
    const allowedFields = ['nombre', 'apellido', 'email', 'telefono'];
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

    values.push(id);
    
    const query = `
        UPDATE usuarios 
        SET ${setClause.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, uuid, email, nombre, apellido, telefono
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
};

// Actualizar contraseña
export const updatePassword = async (id, passwordHash) => {
    const result = await pool.query(`
        UPDATE usuarios 
        SET password_hash = $1
        WHERE id = $2
        RETURNING id, email
    `, [passwordHash, id]);
    return result.rows[0];
};

// Actualizar última conexión
export const updateLastConnection = async (id) => {
    const result = await pool.query(`
        UPDATE usuarios 
        SET ultima_conexion = CURRENT_TIMESTAMP
        WHERE id = $1
    `, [id]);
    return result.rows[0];
};

// Eliminar usuario (soft delete)
export const deleteUser = async (id) => {
    const result = await pool.query(`
        UPDATE usuarios 
        SET estado = false
        WHERE id = $1
        RETURNING id, email
    `, [id]);
    return result.rows[0];
};

// Obtener actividad del usuario
export const getUserActivity = async (userId, limit = 50) => {
    // Esta consulta necesitará la tabla activity_logs que crearemos
    const result = await pool.query(`
        SELECT 
            'contrato_creado' as tipo,
            c.titulo as descripcion,
            c.fecha_creacion as fecha
        FROM contratos c
        WHERE c.creador_id = $1
        
        UNION ALL
        
        SELECT 
            'firma_agregada' as tipo,
            c.titulo as descripcion,
            f.fecha_firma as fecha
        FROM firmantes f
        JOIN contratos c ON f.contrato_id = c.id
        WHERE f.usuario_id = $1 AND f.fecha_firma IS NOT NULL
        
        ORDER BY fecha DESC
        LIMIT $2
    `, [userId, limit]);
    return result.rows;
};

// Obtener estadísticas del usuario
export const getUserStats = async (userId) => {
    const result = await pool.query(`
        SELECT 
            (SELECT COUNT(*) FROM contratos WHERE creador_id = $1) as contratos_creados,
            (SELECT COUNT(*) FROM firmantes WHERE usuario_id = $1) as contratos_para_firmar,
            (SELECT COUNT(*) FROM firmantes WHERE usuario_id = $1 AND estado_id = 2) as contratos_firmados,
            (SELECT COUNT(*) FROM transacciones t 
             JOIN contratos c ON t.contrato_id = c.id 
             WHERE c.creador_id = $1) as transacciones_totales
    `, [userId]);
    return result.rows[0];
};