import express from "express";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import contractRoutes from "./routes/contractRoutes.js";
import signerRoutes from "./routes/signerRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import cors from "cors";



dotenv.config();
const app = express();


// Logger de toda request
app.use((req, _res, next) => {
    console.log(`[REQ] ${req.method} ${req.originalUrl}`);
    next();
});

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173',  // o "*" si estás en desarrollo
    credentials: true
}));


// Healthcheck
app.get("/health", (_req, res) => res.json({ ok: true }));

// Rutas
app.use("/api/usuarios", userRoutes);
app.use("/api/contratos", contractRoutes);
app.use("/api/firmantes", signerRoutes);
app.use("/api/transacciones", transactionRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

// Handler de errores
app.use((err, _req, res, _next) => {
    console.error("Error no controlado:", err);
    res.status(500).json({ error: "Error interno del servidor" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
