import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Contracts from "./pages/Contracts";
import ContratoDetalle from "./pages/ContratoDetalle";
import CreateContract from "./pages/CreateContract";
import Profile from "./pages/Profile";
import VerifyContract from "./pages/VerifyContract";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Register />} />
                <Route path="/verify" element={<VerifyContract />} />
                
                {/* Protected Routes with Layout */}
                <Route element={
                    <ProtectedRoute>
                        <MainLayout />
                    </ProtectedRoute>
                }>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/contratos" element={<Contracts />} />
                    <Route path="/contratos/nuevo" element={<CreateContract />} />
                    <Route path="/contratos/:id" element={<ContratoDetalle />} />
                    <Route path="/perfil" element={<Profile />} />
                    
                    {/* Placeholder routes for additional pages */}
                    <Route path="/firmantes" element={
                        <div className="container-fluid p-4">
                            <h2>Gestión de Firmantes</h2>
                            <p className="text-muted">Página en construcción...</p>
                        </div>
                    } />
                    <Route path="/transacciones" element={
                        <div className="container-fluid p-4">
                            <h2>Transacciones</h2>
                            <p className="text-muted">Página en construcción...</p>
                        </div>
                    } />
                    <Route path="/configuracion" element={
                        <div className="container-fluid p-4">
                            <h2>Configuración</h2>
                            <p className="text-muted">Página en construcción...</p>
                        </div>
                    } />
                </Route>

                {/* 404 Route */}
                <Route path="*" element={
                    <div className="min-vh-100 d-flex align-items-center justify-content-center">
                        <div className="text-center">
                            <h1 className="display-1 fw-bold text-primary">404</h1>
                            <p className="fs-3"><span className="text-danger">Oops!</span> Página no encontrada.</p>
                            <p className="lead">La página que buscas no existe.</p>
                            <a href="/dashboard" className="btn btn-primary">Ir al Inicio</a>
                        </div>
                    </div>
                } />
            </Routes>
        </BrowserRouter>
    );
};

export default App;