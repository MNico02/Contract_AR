import { useState } from "react";
import api from "../api/api"; // 👈 usamos tu cliente Axios

function VincularMetaMaskButton() {
    const [account, setAccount] = useState(null);

    const conectarWallet = async () => {
        const { ethereum } = window;

        if (!ethereum || !ethereum.isMetaMask) {
            alert("⚠️ MetaMask no está disponible en este navegador");
            return;
        }

        try {
            // 1. Pedir conexión a MetaMask
            const accounts = await ethereum.request({ method: "eth_requestAccounts" });
            const direccion = accounts[0];
            setAccount(direccion);

            console.log("✅ Wallet conectada:", direccion);

            // 2. Mandar al backend (Axios ya mete token y headers desde api.js)
            const response = await api.post("/usuarios/vincular-wallet", {
                direccion_wallet: direccion,
            });

            console.log("📡 Respuesta backend:", response.data);
            alert("✅ Wallet vinculada en la base de datos");
        } catch (err) {
            console.error("❌ Error al conectar/vincular:", err);
            alert(`Error: ${err.response?.data?.error || err.message}`);
        }
    };

    return (
        <button className="btn btn-warning fw-bold" onClick={conectarWallet}>
            {account ? `Vinculado: ${account.slice(0, 6)}...` : "Vincular MetaMask"}
        </button>
    );
}

export default VincularMetaMaskButton;
