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
    updateProfile,
    forgotPassword,
    resetPassword,
    verifyResetCode
} from "../controllers/userController.js";
import { verificarToken, verificarRol } from "../middleware/authMiddleware.js";

const router = express.Router();

/* --------- RUTAS PÚBLICAS --------- */
router.post("/login", loginUsuario);
router.post("/register", createUser);

// Usuario de prueba (público): habilito POST y GET
router.post("/create-test", createTestUser);
router.get("/create-test", createTestUser);

// Recuperación de contraseña
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password", resetPassword);

/* --------- RUTAS PROTEGIDAS --------- */
router.use(verificarToken);

// Obtener todos los usuarios (solo admin)
router.get("/", verificarRol(["admin"]), getUsers);

// 🔹 Nueva ruta para que el usuario actual actualice su perfil
router.put("/profile", updateProfile);

// ⚡ Primero las rutas específicas
router.put("/:id/password", changePassword);
router.get("/:id/activity", getUserActivity);
router.get("/:id/stats", getUserStats);

// Después las rutas genéricas con solo :id
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", verificarRol(["admin"]), deleteUser);

export default router;