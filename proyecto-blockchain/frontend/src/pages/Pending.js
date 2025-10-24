import React from "react";
import { Link } from "react-router-dom";

const Pending = () => {
  return (
    <div className="container text-center py-5">
      <div className="card shadow border-0">
        <div className="card-body p-5">
          <i className="bi bi-hourglass-split text-warning display-1 mb-4"></i>
          <h2 className="fw-bold">Pago Pendiente</h2>
          <p className="lead text-muted mt-3">
            Tu pago todavía está siendo procesado.
            Recibirás una notificación cuando se confirme.
          </p>
          <Link to="/contratos" className="btn btn-warning mt-4">
            Volver a mis Contratos
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Pending;
