import express from "express";
import {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    changePassword,
    getUserActivity,
    getUserStats,
    deleteUser,
    loginUsuario,
    createTestUser,
    updateProfile   // 👈 Importar el nuevo controlador
} from "../controllers/userController.js";
import { verificarToken, verificarRol } from "../middleware/authMiddleware.js";

const router = express.Router();

/* --------- RUTAS PÚBLICAS --------- */
router.post("/login", loginUsuario);
router.post("/register", createUser);

// Usuario de prueba (público): habilito POST y GET
router.post("/create-test", createTestUser);
router.get("/create-test", createTestUser);

/* --------- RUTAS PROTEGIDAS --------- */
router.use(verificarToken);

// Obtener todos los usuarios (solo admin)
router.get("/", verificarRol(["admin"]), getUsers);

// 🔹 Nueva ruta para que el usuario actual actualice su perfil
router.put("/profile", updateProfile);

// Rutas de usuario específico
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", verificarRol(["admin"]), deleteUser);

// Rutas adicionales
router.put("/:id/password", changePassword);
router.get("/:id/activity", getUserActivity);
router.get("/:id/stats", getUserStats);

export default router;
