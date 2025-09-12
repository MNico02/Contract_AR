import express from "express";
import { createPreference, webhook, getUltimoPago } from "../controllers/paymentController.js";
import { verificarToken, verificarRol } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
    "/create_preference",
    verificarToken,                  // ✅ mete req.usuario
    verificarRol(["admin","usuario"]), // opcional
    createPreference
);

router.post("/webhook", webhook);
router.get("/ultimo", verificarToken, getUltimoPago);

export default router;
