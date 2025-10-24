import express from "express";
import * as contractController from "../controllers/contractController.js";
import { verificarToken, verificarRol } from "../middleware/authMiddleware.js";
import { upload } from "../config/multerConfig.js";



const router = express.Router();

// Obtener todos los contratos del usuario autenticado
router.get("/", verificarToken, contractController.getContracts);

// Obtener contrato por ID
router.get("/:id", verificarToken, verificarRol(["admin", "usuario"]), contractController.getContractById);



// Crear contrato
router.post(
    "/",
    verificarToken,
    verificarRol(["admin", "usuario"]),
    upload.single("archivo"),
    contractController.createContract
);

// Agregar contrato a mi lista por UUID
router.post(
    "/add-by-uuid",
    verificarToken,
    verificarRol(["admin", "usuario"]),
    contractController.addContractByUUID
);

router.post("/:uuid/blockchain-created", verificarToken, contractController.recordBlockchainCreationTx);
router.post("/:uuid/blockchain-signed", verificarToken, contractController.recordBlockchainSignatureTx);

// Eliminar contrato

router.delete("/:id", verificarToken, verificarRol(["admin", "usuario"]), contractController.deleteContract);

export default router;
