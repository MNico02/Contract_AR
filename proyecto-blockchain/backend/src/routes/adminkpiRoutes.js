import express from "express";
import {
    getCrecimientoIngresos,
    getConversionContratos,
    getPendientesContratos,
    getValorPorCliente,
    getConversionClientes
} from "../controllers/adminkpiController.js";

const router = express.Router();

// Rutas KPI
router.get("/kpi/ingresos", getCrecimientoIngresos);
router.get("/kpi/conversion", getConversionContratos);
router.get("/kpi/pendientes", getPendientesContratos);
router.get("/kpi/clientes", getValorPorCliente);
router.get("/kpi/conversion-clientes", getConversionClientes);

export default router;
