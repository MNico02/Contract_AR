import React from "react";
import { useNavigate } from "react-router-dom";

const AdminPage = () => {
    const navigate = useNavigate();

    return (
        <div className="container py-5">
            <h2 className="fw-bold mb-4 text-center">📌 Panel de Administración</h2>

            <div className="row justify-content-center">
                {/* Opción Ventas */}
                <div className="col-md-4 mb-4">
                    <div
                        className="card text-center shadow-lg h-100"
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate("/adminkpisales")}
                    >
                        <div className="card-body d-flex flex-column justify-content-center">
                            <h3 className="fw-bold mb-3">📊 Ventas</h3>
                            <p className="text-muted">Ver indicadores de ventas y contratos</p>
                        </div>
                    </div>
                </div>

                {/* Opción Logística (deshabilitada) */}
                <div className="col-md-4 mb-4">
                    <div
                        className="card text-center shadow-lg h-100"
                        style={{
                            backgroundColor: "#f8f9fa",
                            opacity: 0.6,
                            cursor: "not-allowed",
                        }}
                    >
                        <div className="card-body d-flex flex-column justify-content-center">
                            <h3 className="fw-bold mb-3">🚚 Logística</h3>
                            <p className="text-muted">Indicadores de logística (próximamente)</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
