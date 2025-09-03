import React, { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
    const [step, setStep] = useState(1); // 1=email, 2=codigo, 3=nueva contraseña
    const [email, setEmail] = useState("");
    const [codigo, setCodigo] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    const handleSendEmail = async () => {
        setError("");
        setLoading(true);
        try {
            await api.post("/usuarios/forgot-password", { email });
            setSuccess("Se envió un código a tu email");
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.error || "Error enviando email");
        } finally {
            setLoading(false);
        }
    };

    const validatePassword = () => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/;
        if (newPassword !== confirmPassword) {
            setError("Las contraseñas no coinciden");
            return false;
        }
        if (newPassword.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres");
            return false;
        }
        if (!regex.test(newPassword)) {
            setError(
                "La contraseña debe contener al menos una mayúscula, una minúscula y un número"
            );
            return false;
        }
        return true;
    };

    const handleResetPassword = async () => {
        if (!validatePassword()) return;

        setError("");
        setLoading(true);
        try {
            await api.post("/usuarios/reset-password", { email, codigo, newPassword });
            setSuccess("Contraseña restablecida correctamente");
            setTimeout(() => navigate("/login"), 2000);
        } catch (err) {
            setError(err.response?.data?.error || "Error al restablecer contraseña");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
            <div className="card shadow p-4" style={{ width: "400px" }}>
                <h4 className="text-center mb-3">Recuperar Contraseña</h4>

                {error && <div className="alert alert-danger">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                {step === 1 && (
                    <>
                        <label>Email registrado</label>
                        <input
                            type="email"
                            className="form-control mb-3"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <button
                            className="btn btn-primary w-100"
                            onClick={handleSendEmail}
                            disabled={loading}
                        >
                            {loading ? "Enviando..." : "Enviar código"}
                        </button>
                    </>
                )}

                {step === 2 && (
                    <>
                        <label>Código recibido</label>
                        <input
                            type="text"
                            className="form-control mb-3"
                            value={codigo}
                            onChange={(e) => setCodigo(e.target.value)}
                        />
                        <button
                            className="btn btn-primary w-100"
                            onClick={() => setStep(3)}
                            disabled={!codigo}
                        >
                            Continuar
                        </button>
                    </>
                )}

                {step === 3 && (
                    <>
                        <label>Nueva contraseña</label>
                        <input
                            type="password"
                            className="form-control mb-2"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <small className="text-muted">
                            Debe tener al menos 8 caracteres, incluir mayúscula, minúscula y número
                        </small>

                        <label className="mt-3">Confirmar contraseña</label>
                        <input
                            type="password"
                            className="form-control mb-3"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />

                        <button
                            className="btn btn-primary w-100"
                            onClick={handleResetPassword}
                            disabled={loading}
                        >
                            {loading ? "Guardando..." : "Restablecer contraseña"}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;