import express from "express";
import * as contractController from "../controllers/contractController.js";
import { verificarToken, verificarRol } from "../middleware/authMiddleware.js";
import { upload } from "../config/multerConfig.js";
import {createContract} from "../controllers/contractController.js";
import { getBlockchainContract } from "../controllers/contractController.js";

const router = express.Router();

// Obtener todos los contratos
router.get("/", verificarToken, contractController.getContracts);

// Obtener contrato por ID
router.get("/:id", verificarToken, verificarRol(["admin", "usuario"]), contractController.getContractById);

// Endpoint para consultar los datos del contrato directamente en la blockchain
router.get("/:uuid/blockchain", getBlockchainContract);

router.post("/", verificarToken, verificarRol(["admin", "usuario"]), upload.single('archivo'), contractController.createContract);

router.delete("/:id", verificarToken, verificarRol(["admin", "usuario"]), contractController.deleteContract);

export default router;
