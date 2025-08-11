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
    createTestUser  
} from "../controllers/userController.js";
import { verificarToken, verificarRol } from "../middleware/authMiddleware.js";

const router = express.Router();

// Rutas públicas
router.post("/login", loginUsuario);
router.post("/register", createUser);

// Ruta temporal para crear usuario de prueba
router.get("/create-test", createTestUser);

// Rutas protegidas
router.use(verificarToken); // Aplicar middleware a todas las rutas siguientes

// Obtener todos los usuarios (solo admin)
router.get("/", verificarRol(["admin"]), getUsers);

// Rutas de usuario específico
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", verificarRol(["admin"]), deleteUser);

// Rutas adicionales
router.put("/:id/password", changePassword);
router.get("/:id/activity", getUserActivity);
router.get("/:id/stats", getUserStats);

export default router;