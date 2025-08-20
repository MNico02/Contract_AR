import React, { useState } from 'react';
import api from '../api/api';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/usuarios/login', { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.usuario));

            if (rememberMe) {
                localStorage.setItem('rememberEmail', email);
            } else {
                localStorage.removeItem('rememberEmail');
            }

            navigate('/dashboard');
        } catch (error) {
            if (error.response?.status === 404) {
                setError('Usuario no encontrado');
            } else if (error.response?.status === 401) {
                setError('Contraseña incorrecta');
            } else if (error.response?.status === 403) {
                setError('Usuario inactivo. Contacte al administrador');
            } else {
                setError('Error al iniciar sesión. Intente nuevamente');
            }
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        const savedEmail = localStorage.getItem('rememberEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    return (
        <div className="min-vh-100 d-flex align-items-center" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-5 col-lg-4">
                        <div className="card shadow-lg border-0">
                            <div className="card-body p-5">
                                <div className="text-center mb-4">
                                    <i className="bi bi-shield-lock-fill text-primary" style={{ fontSize: '3rem' }}></i>
                                    <h3 className="mt-3 fw-bold">Blockchain Contracts</h3>
                                    <p className="text-muted">Ingresa a tu cuenta</p>
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

                                <form onSubmit={handleLogin}>
                                    <div className="mb-3">
                                        <label className="form-label small text-muted">Email</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0">
                                                <i className="bi bi-envelope"></i>
                                            </span>
                                            <input
                                                type="email"
                                                className="form-control border-start-0"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="tu@email.com"
                                                required
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small text-muted">Contraseña</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0">
                                                <i className="bi bi-lock"></i>
                                            </span>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="form-control border-start-0 border-end-0"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                required
                                                disabled={loading}
                                            />
                                            <button
                                                className="btn btn-light border border-start-0"
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <div className="form-check">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                id="rememberMe"
                                                checked={rememberMe}
                                                onChange={e => setRememberMe(e.target.checked)}
                                                disabled={loading}
                                            />
                                            <label className="form-check-label small" htmlFor="rememberMe">
                                                Recordarme
                                            </label>
                                            <Link to="/forgot-password" className="float-end small text-decoration-none">
                                                ¿Olvidaste tu contraseña?
                                            </Link>
                                        </div>
                                    </div>

                                    <button
                                        className="btn btn-primary w-100 py-2 mb-3"
                                        type="submit"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Iniciando sesión...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-box-arrow-in-right me-2"></i>
                                                Iniciar Sesión
                                            </>
                                        )}
                                    </button>

                                    <div className="text-center">
                                        <span className="text-muted small">¿No tienes cuenta? </span>
                                        <Link to="/registro" className="small text-decoration-none fw-bold">
                                            Regístrate aquí
                                        </Link>
                                    </div>
                                </form>

                                <hr className="my-4" />

                                <div className="text-center">
                                    <p className="text-muted small mb-3">O inicia sesión con</p>
                                    <div className="d-flex gap-2">
                                        <button className="btn btn-outline-secondary flex-fill" disabled>
                                            <i className="bi bi-google"></i> Google
                                        </button>
                                        <button className="btn btn-outline-secondary flex-fill" disabled>
                                            <i className="bi bi-github"></i> GitHub
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-center mt-4">
                            <p className="text-white small">
                                © 2024 Blockchain Contracts. Todos los derechos reservados.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;