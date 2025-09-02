import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const menuItems = [
        {
            title: 'Inicio',
            icon: 'bi-house',
            path: '/dashboard',
            badge: null
        },
        {
            title: 'Contratos',
            icon: 'bi-file-text',
            path: '/contratos',
            badge: { text: 'Nuevo', color: 'success' }
        },
        {
            title: 'Firmantes',
            icon: 'bi-people',
            path: '/firmantes',
            badge: null
        },
        {
            title: 'Transacciones',
            icon: 'bi-arrow-left-right',
            path: '/transacciones',
            badge: null
        },
        {
            title: 'Perfil',
            icon: 'bi-person',
            path: '/perfil',
            badge: null
        },
// 👇 Solo admins ven este menú
        ...(user.rol === 'admin'
                ? [{
                    title: 'Panel Admin',
                    icon: 'bi-speedometer2',
                    path: '/admin',
                    badge: null
                }]
                : []
        ),
        {
            title: 'Configuración',
            icon: 'bi-gear',
            path: '/configuracion',
            badge: null
        }
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    return (
        <>
            <div className={`sidebar bg-dark text-white ${isCollapsed ? 'collapsed' : ''}`} style={{
                width: isCollapsed ? '80px' : '250px',
                minHeight: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                transition: 'width 0.3s ease',
                zIndex: 1000,
                overflowX: 'hidden'
            }}>
                {/* Header */}
                <div className="p-3 border-bottom border-secondary d-flex align-items-center justify-content-between">
                    {!isCollapsed && (
                        <div className="d-flex align-items-center">
                            <i className="bi bi-shield-lock-fill text-primary fs-4 me-2"></i>
                            <span className="fw-bold">BC System</span>
                        </div>
                    )}
                    <button 
                        className="btn btn-sm btn-dark"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        <i className={`bi bi-${isCollapsed ? 'chevron-right' : 'chevron-left'}`}></i>
                    </button>
                </div>

                {/* User Info */}
                <div className="p-3 border-bottom border-secondary">
                    <div className="d-flex align-items-center">
                        <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center" 
                             style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                            <i className="bi bi-person-fill text-white"></i>
                        </div>
                        {!isCollapsed && (
                            <div className="ms-3">
                                <div className="fw-bold small">{user.nombre} {user.apellido}</div>
                                <div className="text-muted small">{user.rol === 'admin' ? 'Administrador' : 'Usuario'}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="p-2">
                    {menuItems.map((item, index) => (
                        <Link
                            key={index}
                            to={item.path}
                            className={`d-flex align-items-center text-decoration-none text-white p-2 mb-1 rounded position-relative ${
                                isActive(item.path) ? 'bg-primary' : 'hover-bg-secondary'
                            }`}
                            style={{ 
                                transition: 'background-color 0.2s',
                                overflow: 'hidden'
                            }}
                            title={isCollapsed ? item.title : ''}
                        >
                            <i className={`bi ${item.icon} fs-5`} style={{ minWidth: '30px' }}></i>
                            {!isCollapsed && (
                                <>
                                    <span className="ms-2">{item.title}</span>
                                    {item.badge && (
                                        <span className={`badge bg-${item.badge.color} ms-auto`}>
                                            {item.badge.text}
                                        </span>
                                    )}
                                </>
                            )}
                        </Link>
                    ))}
                </nav>

                {/* Bottom Actions */}
                <div className="mt-auto p-3 border-top border-secondary">
                    <button 
                        className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center"
                        onClick={handleLogout}
                        title={isCollapsed ? 'Cerrar Sesión' : ''}
                    >
                        <i className="bi bi-box-arrow-right"></i>
                        {!isCollapsed && <span className="ms-2">Cerrar Sesión</span>}
                    </button>
                </div>
            </div>

            {/* Overlay for mobile */}
            <div 
                className="sidebar-overlay d-lg-none"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 999,
                    display: isCollapsed ? 'none' : 'block'
                }}
                onClick={() => setIsCollapsed(true)}
            ></div>

            <style jsx>{`
                .hover-bg-secondary:hover {
                    background-color: rgba(255, 255, 255, 0.1) !important;
                }
            `}</style>
        </>
    );
};

export default Sidebar;