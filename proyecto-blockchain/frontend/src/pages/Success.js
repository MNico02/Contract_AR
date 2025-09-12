import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Success = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Redirige automáticamente después de 3 segundos
        const timer = setTimeout(() => {
            navigate("/contratos/nuevo");
        }, 4000);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="container text-center py-5">
            <div className="card shadow-lg border-0">
                <div className="card-body p-5">
                    <i className="bi bi-check-circle-fill text-success display-1 mb-4"></i>
                    <h2 className="fw-bold">¡Pago Exitoso!</h2>
                    <p className="lead text-muted mt-3">
                        Tu pago fue procesado correctamente. <br />
                        En breve serás redirigido para continuar con la creación de tu contrato.
                    </p>
                    <button
                        onClick={() => navigate("/contratos/nuevo")}
                        className="btn btn-success mt-4"
                    >
                        Ir al Contrato Ahora
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Success;
