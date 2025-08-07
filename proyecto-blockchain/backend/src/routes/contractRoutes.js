import express from "express";
import * as contractController from "../controllers/contractController.js";
import { verificarToken, verificarRol } from "../middleware/authMiddleware.js";
import { upload } from "../config/multerConfig.js";
import {createContract} from "../controllers/contractController.js";


const router = express.Router();

// Obtener todos los contratos
router.get("/", verificarToken, contractController.getContracts);

// Obtener contrato por ID
router.get("/:id", verificarToken, verificarRol(["admin", "usuario"]), contractController.getContractById);



router.post("/", verificarToken, verificarRol(["admin", "usuario"]), upload.single('archivo'), contractController.createContract);


export default router;
