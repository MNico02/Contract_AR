import express from "express";
import * as signerController from "../controllers/signerController.js";

import { verificarToken, verificarRol } from "../middleware/authMiddleware.js";

const router = express.Router();

// Obtener firmantes de un contrato
router.get("/:contratoId", verificarToken, signerController.getSignersByContract);

// Agregar firmante
router.post("/", verificarToken, verificarRol(["admin", "usuario"]), signerController.addSigner);

// Actualizar estado de firma
router.put("/:id", verificarToken, signerController.updateSignerStatus);

export default router;
