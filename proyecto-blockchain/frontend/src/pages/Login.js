import React, { useState } from 'react';
import api from '../api/api';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async e => {
        e.preventDefault();
        try {
            const res = await api.post('/usuarios/login', { email, password });
            localStorage.setItem('token', res.data.token);
            navigate('/dashboard');
        } catch (error) {
            alert('Login fallido');
        }
    };

    return (
        <form className="container p-4 shadow rounded bg-light" onSubmit={handleLogin}>
            <h2 className="mb-3 text-center">Iniciar Sesión</h2>
            <input
                type="email"
                className="form-control mb-2"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                required
            />
            <input
                type="password"
                className="form-control mb-3"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
            />
            <button className="btn btn-primary w-25" type="submit">
                Ingresar
            </button>
        </form>

    );
};

export default Login;
