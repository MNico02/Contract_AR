import pool from "../config/db.js";

// Obtener todos los usuarios
export const getAllUsers = async () => {
    const result = await pool.query(`
    SELECT u.id, u.uuid, u.email, u.nombre, u.apellido, u.telefono, r.nombre AS rol, u.estado, u.fecha_creacion
    FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
  `);
    return result.rows;
};

// Obtener usuario por ID
export const getUserById = async (id) => {
    const result = await pool.query(`
    SELECT u.id, u.uuid, u.email, u.nombre, u.apellido, u.telefono, r.nombre AS rol, u.estado, u.fecha_creacion
    FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.id = $1
  `, [id]);
    return result.rows[0];
};
export const getUserByEmail = async (email) => {
    const result = await pool.query(`
    SELECT u.id, u.uuid, u.email, u.password_hash, u.nombre, u.apellido, 
           r.nombre AS rol, u.estado
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
