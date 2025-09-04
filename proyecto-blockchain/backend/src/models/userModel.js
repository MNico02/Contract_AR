import pool from "../config/db.js";

// Obtener todos los usuarios
export const getAllUsers = async () => {
    const result = await pool.query(`
        SELECT u.id, u.uuid, u.email, u.nombre, u.apellido, u.telefono,
               r.nombre AS rol, u.estado, u.fecha_creacion
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

// Obtener usuario por email (incluye password_hash)
export const getUserByEmail = async (email) => {
    const result = await pool.query(`
        SELECT u.id, u.uuid, u.email, u.password_hash, u.nombre, u.apellido, u.telefono,
               r.nombre AS rol, u.estado, u.rol_id
        FROM usuarios u
                 JOIN roles r ON u.rol_id = r.id
        WHERE u.email = $1
    `, [email]);
    return result.rows[0];
};
//para recuperar contraseña
export const getUserByIdWithPassword = async (id) => {
    const result = await pool.query(`
        SELECT u.id, u.uuid, u.email, u.password_hash, u.nombre, u.apellido, u.telefono,
               r.nombre AS rol, u.estado, u.fecha_creacion, u.ultima_conexion
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        WHERE u.id = $1
    `, [id]);
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

// Actualizar usuario (solo campos válidos)
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
            RETURNING id, email, ultima_conexion
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
                (SELECT COUNT(*) FROM contratos WHERE creador_id = $1) AS contratos_creados,
                (SELECT COUNT(*) FROM firmantes WHERE usuario_id = $1) AS contratos_para_firmar,
                (SELECT COUNT(*) FROM firmantes WHERE usuario_id = $1 AND estado_id = 2) AS contratos_firmados,
                (SELECT COUNT(*)
                 FROM transacciones_blockchain t
                          JOIN contratos c ON t.contrato_id = c.id
                 WHERE c.creador_id = $1) AS transacciones_totales
    `, [userId]);
    return result.rows[0];
};



// Crear un registro de reseteo de contraseña
export const createPasswordReset = async (usuario_id, codigo, expiracion) => {
    const result = await pool.query(`
        INSERT INTO password_resets (usuario_id, codigo, expiracion)
        VALUES ($1, $2, $3)
        RETURNING id, usuario_id, codigo, expiracion
    `, [usuario_id, codigo, expiracion]);
    return result.rows[0];
};

// Buscar un código válido (no usado y no vencido)
export const findValidReset = async (usuario_id, codigo) => {
    const result = await pool.query(`
        SELECT * FROM password_resets
        WHERE usuario_id = $1
          AND codigo = $2
          AND usado = false
          AND expiracion > NOW()
        ORDER BY fecha_creacion DESC
        LIMIT 1
    `, [usuario_id, codigo]);
    return result.rows[0];
};

// Marcar un código como usado
export const markResetUsed = async (id) => {
    const result = await pool.query(`
        UPDATE password_resets
        SET usado = true
        WHERE id = $1
        RETURNING id, usado
    `, [id]);
    return result.rows[0];
};

// Vincular dirección de wallet a usuario
export const vincularWallet = async (userId, direccion_wallet) => {
    const result = await pool.query(`
        UPDATE usuarios
        SET direccion_wallet = $1
        WHERE id = $2
        RETURNING id, uuid, email, direccion_wallet
    `, [direccion_wallet, userId]);

    return result.rows[0];
};


// Generar y asignar un nuevo nonce
export const setNonceForUser = async (userId) => {
    const nonce = crypto.randomInt(100000, 999999).toString(); // ej: "583920"
    const result = await pool.query(`
        UPDATE usuarios
        SET nonce = $1
        WHERE id = $2
        RETURNING id, direccion_wallet, nonce
    `, [nonce, userId]);
    return result.rows[0];
};

// Obtener nonce de un usuario
export const getNonceByUserId = async (userId) => {
    const result = await pool.query(`
        SELECT id, direccion_wallet, nonce
        FROM usuarios
        WHERE id = $1
    `, [userId]);
    return result.rows[0];
};