import express from "express";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import contractRoutes from "./routes/contractRoutes.js";
import signerRoutes from "./routes/signerRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import cors from "cors";

dotenv.config();
const app = express();

// ======================
// 🔧 Configuración CORS primero
// ======================
const corsOptions = {
    origin: "http://localhost:3001", // frontend React (Vite)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
};
app.use(cors(corsOptions));

// ======================
// Middleware generales
// ======================
app.use(express.json());

// Logger de toda request (después de CORS y JSON)
app.use((req, _res, next) => {
    console.log(`[REQ] ${req.method} ${req.originalUrl}`);
    next();
});

// ======================
// Rutas
// ======================
app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/usuarios", userRoutes);
app.use("/api/contratos", contractRoutes);
app.use("/api/firmantes", signerRoutes);
app.use("/api/transacciones", transactionRoutes);

// ======================
// 404
// ======================
app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

// ======================
// Handler de errores
// ======================
app.use((err, _req, res, _next) => {
    console.error("Error no controlado:", err);
    res.status(500).json({ error: "Error interno del servidor" });
});

// ======================
// Iniciar servidor
// ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
