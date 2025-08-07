import express from "express";
import * as transactionController from "../controllers/transactionController.js";
import { verificarToken, verificarRol } from "../middleware/authMiddleware.js";
const router = express.Router();

// Obtener transacciones de un contrato
router.get("/:contratoId", verificarToken, transactionController.getTransactionsByContract);

// Agregar transacción
router.post("/", verificarToken, verificarRol(["admin", "usuario"]), transactionController.addTransaction);

// Actualizar estado de transacción
router.put("/:id", verificarToken, verificarRol(["admin"]), transactionController.updateTransactionStatus); // opcional: solo admin






export default router;
