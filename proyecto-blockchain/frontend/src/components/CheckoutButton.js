import { useState } from "react";
import api from "../api/api";

const CheckoutButton = ({ titulo, firmantes }) => {
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        try {
            setLoading(true);
            const { data } = await api.post("/payments/create_preference", { titulo, firmantes });

            // Si estamos en pruebas, usá sandbox_init_point; si no, init_point
            const url = data.sandbox_init_point || data.init_point;
            if (!url) {
                console.error("❌ No vino init_point / sandbox_init_point:", data);
                return;
            }
            window.location.href = url;
        } catch (err) {
            console.error("❌ Error al crear preferencia:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button className="btn btn-outline-success" onClick={handleCheckout} disabled={loading}>
            {loading ? "Creando..." : "Pagar con Mercado Pago"}
        </button>
    );
};

export default CheckoutButton;
