import React, { useState } from 'react';
import api from '../api/api';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        password: '',
        confirmPassword: '',
        rol_id: 2
    });
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (name === 'password') {
            calculatePasswordStrength(value);
        }
    };

    const calculatePasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^a-zA-Z0-9]/)) strength++;
        setPasswordStrength(strength);
    };

    const getPasswordStrengthColor = () => {
        switch (passwordStrength) {
            case 0:
            case 1: return 'danger';
            case 2: return 'warning';
            case 3: return 'info';
            case 4: return 'success';
            default: return 'secondary';
        }
    };

    const getPasswordStrengthText = () => {
        switch (passwordStrength) {
            case 0:
            case 1: return 'Muy débil';
            case 2: return 'Débil';
            case 3: return 'Buena';
            case 4: return 'Muy fuerte';
            default: return '';
        }
    };

    const validateForm = () => {
        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return false;
        }
        if (formData.password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return false;
        }
        if (!acceptTerms) {
            setError('Debes aceptar los términos y condiciones');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!validateForm()) return;

        setLoading(true);
        try {
            await api.post('/usuarios/register', {
                nombre: formData.nombre,
                apellido: formData.apellido,
                email: formData.email,
                telefono: formData.telefono,
                password: formData.password,
                rol_id: formData.rol_id
            });
            
            setSuccess('¡Cuenta creada exitosamente! Redirigiendo al login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error) {
            if (error.response?.data?.error?.includes('duplicate')) {
                setError('Este email ya está registrado');
            } else if (error.response?.status === 400) {
                setError('Por favor completa todos los campos obligatorios');
            } else {
                setError('Error al crear la cuenta. Intenta nuevamente');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <div className="container py-4">
                <div className="row justify-content-center">
                    <div className="col-md-6 col-lg-5">
                        <div className="card shadow-lg border-0">
                            <div className="card-body p-5">
                                <div className="text-center mb-4">
                                    <i className="bi bi-person-plus-fill text-primary" style={{ fontSize: '3rem' }}></i>
                                    <h3 className="mt-3 fw-bold">Crear Cuenta</h3>
                                    <p className="text-muted">Únete a Blockchain Contracts</p>
                                </div>

                                {error && (
                                    <div className="alert alert-danger alert-dismissible fade show" role="alert">
                                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                        {error}
                                        <button 
                                            type="button" 
                                            className="btn-close" 
                                            onClick={() => setError('')}
                                        ></button>
                                    </div>
                                )}

                                {success && (
                                    <div className="alert alert-success" role="alert">
                                        <i className="bi bi-check-circle-fill me-2"></i>
                                        {success}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label small text-muted">Nombre *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="nombre"
                                                value={formData.nombre}
                                                onChange={handleChange}
                                                placeholder="Juan"
                                                required
                                                disabled={loading}
                                            />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label small text-muted">Apellido *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="apellido"
                                                value={formData.apellido}
                                                onChange={handleChange}
                                                placeholder="Pérez"
                                                required
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small text-muted">Email *</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light">
                                                <i className="bi bi-envelope"></i>
                                            </span>
                                            <input
                                                type="email"
                                                className="form-control"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="tu@email.com"
                                                required
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small text-muted">Teléfono</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light">
                                                <i className="bi bi-telephone"></i>
                                            </span>
                                            <input
                                                type="tel"
                                                className="form-control"
                                                name="telefono"
                                                value={formData.telefono}
                                                onChange={handleChange}
                                                placeholder="+54 11 1234-5678"
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small text-muted">Tipo de Usuario *</label>
                                        <select
                                            className="form-select"
                                            name="rol_id"
                                            value={formData.rol_id}
                                            onChange={handleChange}
                                            disabled={loading}
                                        >
                                            <option value="2">Usuario</option>
                                            <option value="1">Administrador</option>
                                        </select>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small text-muted">Contraseña *</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light">
                                                <i className="bi bi-lock"></i>
                                            </span>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="form-control"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                placeholder="Mínimo 8 caracteres"
                                                required
                                                disabled={loading}
                                            />
                                            <button
                                                className="btn btn-outline-secondary"
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                                            </button>
                                        </div>
                                        {formData.password && (
                                            <div className="mt-2">
                                                <div className="progress" style={{ height: '5px' }}>
                                                    <div 
                                                        className={`progress-bar bg-${getPasswordStrengthColor()}`}
                                                        style={{ width: `${passwordStrength * 25}%` }}
                                                    ></div>
                                                </div>
                                                <small className={`text-${getPasswordStrengthColor()}`}>
                                                    {getPasswordStrengthText()}
                                                </small>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small text-muted">Confirmar Contraseña *</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light">
                                                <i className="bi bi-lock-fill"></i>
                                            </span>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="form-control"
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                placeholder="Repite la contraseña"
                                                required
                                                disabled={loading}
                                            />
                                        </div>
                                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                            <small className="text-danger">Las contraseñas no coinciden</small>
                                        )}
                                    </div>

                                    <div className="mb-4">
                                        <div className="form-check">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                id="acceptTerms"
                                                checked={acceptTerms}
                                                onChange={(e) => setAcceptTerms(e.target.checked)}
                                                disabled={loading}
                                            />
                                            <label className="form-check-label small" htmlFor="acceptTerms">
                                                Acepto los <Link to="/terms">términos y condiciones</Link> y la{' '}
                                                <Link to="/privacy">política de privacidad</Link>
                                            </label>
                                        </div>
                                    </div>

                                    <button 
                                        className="btn btn-primary w-100 py-2 mb-3" 
                                        type="submit"
                                        disabled={loading || !acceptTerms}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Creando cuenta...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-person-plus me-2"></i>
                                                Crear Cuenta
                                            </>
                                        )}
                                    </button>

                                    <div className="text-center">
                                        <span className="text-muted small">¿Ya tienes cuenta? </span>
                                        <Link to="/login" className="small text-decoration-none fw-bold">
                                            Inicia sesión aquí
                                        </Link>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;