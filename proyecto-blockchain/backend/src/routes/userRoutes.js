import express from "express";
import { getUsers, getUserById, createUser, loginUsuario  } from "../controllers/userController.js";

const router = express.Router();

// Obtener todos los usuarios
router.get("/", getUsers);

// Obtener usuario por ID
router.get("/:id", getUserById);

// Crear usuario
router.post("/", createUser);

router.post("/login", loginUsuario);

export default router;
