import express from "express";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import contractRoutes from "./routes/contractRoutes.js";
import signerRoutes from "./routes/signerRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import cors from "cors";



dotenv.config();
const app = express();

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173',  // o "*" si estás en desarrollo
    credentials: true
}));

// Rutas
app.use("/api/usuarios", userRoutes);
app.use("/api/contratos", contractRoutes);
app.use("/api/firmantes", signerRoutes);
app.use("/api/transacciones", transactionRoutes);

// Servidor
app.listen(3000, () => {
    console.log("Servidor backend corriendo en http://localhost:3000");
});
