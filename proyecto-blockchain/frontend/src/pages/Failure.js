import React from "react";
import { Link } from "react-router-dom";

const Failure = () => {
    return (
        <div className="container text-center py-5">
            <div className="card shadow border-0">
                <div className="card-body p-5">
                    <i className="bi bi-x-circle-fill text-danger display-1 mb-4"></i>
                    <h2 className="fw-bold">Pago Fallido</h2>
                    <p className="lead text-muted mt-3">
                        Hubo un problema al procesar tu pago. <br />
                        Intentá nuevamente o probá con otro método de pago.
                    </p>
                    <Link to="/contratos/nuevo" className="btn btn-danger mt-4">
                        Reintentar Pago
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Failure;
