// src/routes/singerRoutes.js
import express from "express";
import * as signerController from "../controllers/signerController.js";
import { verificarToken, verificarRol } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * NUEVOS ENDPOINTS
 * - Lista de contratos pendientes de firma del usuario autenticado
 * - Firmar contrato por UUID (firma simple, sin cripto)
 */
router.get("/mis-pendientes", verificarToken, signerController.getMyPendingSignings);
router.post("/contratos/:uuid/firmar", verificarToken, signerController.signContract);

/**
 * EXISTENTES
 */
// Obtener firmantes de un contrato (ID numérico interno)
router.get("/:contratoId", verificarToken, signerController.getSignersByContract);

// Agregar firmante
router.post("/", verificarToken, verificarRol(["admin", "usuario"]), signerController.addSigner);

// Actualizar estado de firma (administrativo)
router.put("/:id", verificarToken, signerController.updateSignerStatus);

export default router;
