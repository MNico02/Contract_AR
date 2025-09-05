// src/routes/singerRoutes.js
import express from "express";
import * as signerController from "../controllers/signerController.js";
import { verificarToken, verificarRol } from "../middleware/authMiddleware.js";

const router = express.Router();

/** ESPECÍFICAS PRIMERO */
router.get("/mis-pendientes", verificarToken, signerController.getMyPendingSignings);
router.get("/mis", verificarToken, signerController.getMySignings);
router.post("/contratos/:uuid/firmar", verificarToken, signerController.signContract);

/** EXISTENTES */
router.post("/", verificarToken, verificarRol(["admin", "usuario"]), signerController.addSigner);
router.put("/:id", verificarToken, signerController.updateSignerStatus);

/** AL FINAL: por contrato (SIN regex) */
router.get("/:contratoId", verificarToken, signerController.getSignersByContract);

export default router;
