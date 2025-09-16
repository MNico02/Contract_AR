
import { useEffect, useState } from "react";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";
import api from "../api/api";

const CheckoutButton = ({ titulo, firmantes, onPagoAprobado }) => {
    const [preferenceId, setPreferenceId] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        initMercadoPago(process.env.REACT_APP_MP_PUBLIC_KEY, { locale: "es-AR" });
    }, []);

    const handleCheckout = async () => {
        try {
            const response = await api.post("/payments/create_preference", {
                titulo,
                firmantes,
            });
            console.log("👉 createPreference response:", response.data);

            setPreferenceId(response.data.id);
            setShowModal(true);
        } catch (err) {
            console.error("❌ Error al crear preferencia:", err);
        }
    };

    return (
        <>
            <button className="btn btn-outline-success" onClick={handleCheckout}>
                Pagar con Mercado Pago
            </button>



            {/* Modal con el Wallet Brick */}
            {showModal && (
                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Finalizar Pago</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                {preferenceId ? (
                                    <Wallet
                                        initialization={{ preferenceId }}
                                        onReady={() => console.log("Wallet listo ✅")}
                                        onSubmit={() => {
                                            console.log("👉 Pago aprobado (callback)");
                                            setShowModal(false);
                                            onPagoAprobado();
                                        }}
                                    />
                                ) : (
                                    <p>Cargando pago...</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CheckoutButton;



/*
import { useState } from "react";
import api from "../api/api";

const CheckoutButton = ({ titulo, firmantes }) => {
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        try {
            setLoading(true);
            const response = await api.post("/payments/create_preference", {
                titulo,
                firmantes,
            });
            console.log("👉 createPreference response:", response.data);

            // Redirigir a la página de MP
            window.location.href = response.data.init_point;
        } catch (err) {
            console.error("❌ Error al crear preferencia:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            className="btn btn-outline-success"
            onClick={handleCheckout}
            disabled={loading}
        >
            {loading ? "Creando..." : "Pagar con Mercado Pago"}
        </button>
    );
};

export default CheckoutButton;
*/