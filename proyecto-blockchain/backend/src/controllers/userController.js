import * as userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { validateUserUpdate, validatePasswordChange, validateUserCreate } from "../validators/userValidator.js";
import logger from "../utils/logger.js";

// Crear usuario de prueba (temporal)
export const createTestUser = async (req, res) => {
    try {
        const email = "admin@example.com";
        const password = "admin123";

        // Evitar duplicado si ya existe
        const existe = await userModel.getUserByEmail(email);
        if (existe) {
            return res.json({
                mensaje: "El usuario de prueba ya existe",
                usuario: { email, password }
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const testUser = await userModel.createUser({
            email,
            passwordHash,
            nombre: "Admin",
            apellido: "Sistema",
            telefono: "123456789",
            rol_id: 1 // admin
        });

        return res.json({
            mensaje: "Usuario de prueba creado exitosamente",
            usuario: {
                email,
                password,
                nombre: testUser.nombre,
                apellido: testUser.apellido,
                rol: "admin"
            }
        });
    } catch (error) {
        console.error("Error al crear usuario de prueba:", error); // ya lo tenés
        return res.status(500).json({
            error: "Error al crear usuario de prueba",
            detalle: error.message   // <-- agregar SOLO en dev
        });
    }
};



export const loginUsuario = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1) Validar input
        if (!email || !password) {
            return res.status(400).json({ error: "Email y password son requeridos" });
        }

        // 2) Buscar usuario (con rol por JOIN en el modelo)
        const usuario = await userModel.getUserByEmail(email);
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // 3) Activo/inactivo
        if (usuario.estado === false) {
            return res.status(403).json({ error: "Usuario inactivo" });
        }

        // 4) Validar que exista el hash y comparar
        if (!usuario.password_hash) {
            console.error("[LOGIN] password_hash vacío en BD para", email);
            return res.status(500).json({ error: "Password hash faltante en BD" });
        }

        let passwordValida = false;
        try {
            passwordValida = await bcrypt.compare(password, usuario.password_hash);
        } catch (e) {
            console.error("[LOGIN] Error bcrypt.compare:", e);
            return res.status(500).json({ error: "Error comparando contraseña" });
        }

        if (!passwordValida) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        // 5) Firmar JWT (usa tu JWT_SECRET del .env)
        if (!process.env.JWT_SECRET) {
            console.error("[LOGIN] JWT_SECRET no definido");
            return res.status(500).json({ error: "Configuración JWT inválida" });
        }

        let token;
        try {
            token = jwt.sign(
                { id: usuario.id, uuid: usuario.uuid, rol: usuario.rol },
                process.env.JWT_SECRET,
                { expiresIn: "2h" }
            );
        } catch (e) {
            console.error("[LOGIN] Error en jwt.sign:", e);
            return res.status(500).json({ error: "Error generando token" });
        }

        // 6) Actualizar última conexión (no bloquea respuesta)
        userModel.updateLastConnection(usuario.id).catch(() => {});

        // 7) Respuesta
        return res.json({
            mensaje: "Login exitoso",
            token,
            usuario: {
                id: usuario.id,
                uuid: usuario.uuid,
                email: usuario.email,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                telefono: usuario.telefono,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error("Error en login:", error);
        return res.status(500).json({ error: "Error interno en login" });
    }
};


// Obtener todos los usuarios
export const getUsers = async (req, res) => {
    try {
        const users = await userModel.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({ error: "Error al obtener usuarios" });
    }
};

// Obtener usuario por ID
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userModel.getUserById(id);
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        res.json(user);
    } catch (error) {
        console.error("Error al obtener usuario:", error);
        res.status(500).json({ error: "Error al obtener usuario" });
    }
};

// Crear usuario
export const createUser = async (req, res) => {
    try {
        // Validar datos de entrada
        const { error } = validateUserCreate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { email, password, nombre, apellido, telefono, rol_id } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await userModel.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: "El email ya está registrado" });
        }

        // Hashear contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = await userModel.createUser({
            email,
            passwordHash,
            nombre,
            apellido,
            telefono,
            rol_id
        });

        logger.info(`Usuario creado: ${email}`);
        res.status(201).json(newUser);
    } catch (error) {
        logger.error("Error al crear usuario:", error);
        if (error.code === '23505') {
            return res.status(409).json({ error: "El email ya está registrado" });
        }
        res.status(500).json({ error: "Error al crear usuario" });
    }
};
export const updateProfile = async (req, res) => {
    try {
        console.log("👉 updateProfile body:", req.body, "usuario:", req.usuario);

        const id = req.usuario.id;
        const updatedUser = await userModel.updateUser(id, req.body);

        if (!updatedUser) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json(updatedUser);
    } catch (error) {
        console.error("❌ Error en updateProfile:", error);
        res.status(500).json({ error: "Error al actualizar perfil" });
    }
};

// Actualizar usuario
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Solo el dueño del perfil o un admin pueden actualizar
        if (req.usuario.id !== parseInt(id) && req.usuario.rol !== 'admin') {
            return res.status(403).json({ error: "No autorizado para actualizar este perfil" });
        }

        // Validar datos
        const { error } = validateUserUpdate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const updatedUser = await userModel.updateUser(id, req.body);
        if (!updatedUser) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        logger.info(`Usuario actualizado: ${id}`);
        res.json(updatedUser);
    } catch (error) {
        logger.error("Error al actualizar usuario:", error);
        res.status(500).json({ error: "Error al actualizar usuario" });
    }
};

// Cambiar contraseña
export const changePassword = async (req, res) => {
    try {
        const { id } = req.params;

        // Solo el dueño puede cambiar su contraseña
        if (req.usuario.id !== parseInt(id)) {
            return res.status(403).json({ error: "No autorizado para cambiar esta contraseña" });
        }

        // Validar datos
        const { error } = validatePasswordChange(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { currentPassword, newPassword } = req.body;

        // Obtener usuario
        const user = await userModel.getUserById(id);
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // Traer también el password_hash
        const userWithPassword = await userModel.getUserByEmail(user.email);

        // Verificar contraseña actual
        const isValidPassword = await bcrypt.compare(currentPassword, userWithPassword.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: "Contraseña actual incorrecta" });
        }

        // Hashear y guardar nueva contraseña
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await userModel.updatePassword(id, newPasswordHash);

        logger.info(`Contraseña cambiada para usuario: ${id}`);
        res.json({ mensaje: "Contraseña actualizada exitosamente" });
    } catch (error) {
        logger.error("Error al cambiar contraseña:", error);
        res.status(500).json({ error: "Error al cambiar contraseña" });
    }
};
// Obtener actividad del usuario
export const getUserActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50 } = req.query;

        // Verificar que el usuario solo pueda ver su propia actividad
        if (req.usuario.id !== parseInt(id) && req.usuario.rol !== 'admin') {
            return res.status(403).json({ error: "No autorizado para ver esta actividad" });
        }

        const activity = await userModel.getUserActivity(id, parseInt(limit));
        res.json(activity);
    } catch (error) {
        logger.error("Error al obtener actividad:", error);
        res.status(500).json({ error: "Error al obtener actividad" });
    }
};

// Obtener estadísticas del usuario
export const getUserStats = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el usuario solo pueda ver sus propias estadísticas
        if (req.usuario.id !== parseInt(id) && req.usuario.rol !== 'admin') {
            return res.status(403).json({ error: "No autorizado para ver estas estadísticas" });
        }

        const stats = await userModel.getUserStats(id);
        res.json(stats);
    } catch (error) {
        logger.error("Error al obtener estadísticas:", error);
        res.status(500).json({ error: "Error al obtener estadísticas" });
    }
};

// Eliminar usuario (soft delete)
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Solo admins pueden eliminar usuarios
        if (req.usuario.rol !== 'admin') {
            return res.status(403).json({ error: "No autorizado para eliminar usuarios" });
        }

        const deletedUser = await userModel.deleteUser(id);
        if (!deletedUser) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        logger.info(`Usuario eliminado: ${id}`);
        res.json({ mensaje: "Usuario eliminado exitosamente" });
    } catch (error) {
        logger.error("Error al eliminar usuario:", error);
        res.status(500).json({ error: "Error al eliminar usuario" });
    }
};