import * as userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";



export const loginUsuario = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Buscar usuario
        const usuario = await userModel.getUserByEmail(email);
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // Verificar si está activo
        if (!usuario.estado) {
            return res.status(403).json({ error: "Usuario inactivo" });
        }

        // Verificar contraseña
        const passwordValida = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        // Generar token
        const token = jwt.sign(
            { id: usuario.id, uuid: usuario.uuid, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        // Respuesta
        res.json({
            mensaje: "Login exitoso",
            token,
            usuario: {
                id: usuario.id,
                uuid: usuario.uuid,
                email: usuario.email,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ error: "Error interno en login" });
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
        const { email, password, nombre, apellido, telefono, rol_id } = req.body;

        // Validar datos básicos
        if (!email || !password || !nombre || !apellido) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
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

        res.status(201).json(newUser);
    } catch (error) {
        console.error("Error al crear usuario:", error);
        res.status(500).json({ error: "Error al crear usuario" });
    }
};
