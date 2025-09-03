import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const Profile = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [activeTab, setActiveTab] = useState('personal');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    
    const [personalData, setPersonalData] = useState({
        nombre: user.nombre || '',
        apellido: user.apellido || '',
        email: user.email || '',
        telefono: user.telefono || ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [preferences, setPreferences] = useState({
        emailNotifications: true,
        smsNotifications: false,
        language: 'es',
        timezone: 'America/Argentina/Buenos_Aires',
        theme: 'light'
    });

    const handlePersonalSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        
        try {
            // API call to update personal data
            setSuccess('Información personal actualizada exitosamente');
            
            // Update local storage
            const updatedUser = { ...user, ...personalData };
            localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (err) {
            setError('Error al actualizar la información');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }
        
        if (passwordData.newPassword.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');
        
        try {
            // API call real (ejemplo)
            // await api.post('/usuarios/change-password', passwordData);
            const user = JSON.parse(localStorage.getItem('user')); // obtener id del usuario logueado

            await api.put(`/usuarios/${user.id}/password`, {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            setSuccess('Contraseña actualizada exitosamente');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (err) {
            if (err.response?.status === 401) {
                setError('Contraseña actual incorrecta');
            } else {
                setError('Error al cambiar la contraseña');
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePreferencesSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        
        try {
            // API call to update preferences
            setSuccess('Preferencias actualizadas exitosamente');
        } catch (err) {
            setError('Error al actualizar preferencias');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid p-4">
            <div className="row mb-4">
                <div className="col">
                    <h2 className="fw-bold">Mi Perfil</h2>
                    <p className="text-muted">Gestiona tu información personal y configuración</p>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-3 mb-4">
                    {/* Profile Card */}
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-body text-center">
                            <div className="position-relative d-inline-block mb-3">
                                <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center mx-auto" 
                                     style={{ width: '100px', height: '100px' }}>
                                    <i className="bi bi-person-fill text-white" style={{ fontSize: '3rem' }}></i>
                                </div>
                                <button className="btn btn-sm btn-primary rounded-circle position-absolute" 
                                        style={{ bottom: '0', right: '0' }}>
                                    <i className="bi bi-camera"></i>
                                </button>
                            </div>
                            <h5 className="mb-1">{user.nombre} {user.apellido}</h5>
                            <p className="text-muted small">{user.email}</p>
                            <span className="badge bg-primary">{user.rol === 'admin' ? 'Administrador' : 'Usuario'}</span>
                        </div>
                    </div>

                    {/* Navigation Pills */}
                    <div className="list-group">
                        <button 
                            className={`list-group-item list-group-item-action ${activeTab === 'personal' ? 'active' : ''}`}
                            onClick={() => setActiveTab('personal')}
                        >
                            <i className="bi bi-person me-2"></i>
                            Información Personal
                        </button>
                        <button 
                            className={`list-group-item list-group-item-action ${activeTab === 'security' ? 'active' : ''}`}
                            onClick={() => setActiveTab('security')}
                        >
                            <i className="bi bi-shield-lock me-2"></i>
                            Seguridad
                        </button>
                        <button 
                            className={`list-group-item list-group-item-action ${activeTab === 'preferences' ? 'active' : ''}`}
                            onClick={() => setActiveTab('preferences')}
                        >
                            <i className="bi bi-gear me-2"></i>
                            Preferencias
                        </button>
                        <button 
                            className={`list-group-item list-group-item-action ${activeTab === 'activity' ? 'active' : ''}`}
                            onClick={() => setActiveTab('activity')}
                        >
                            <i className="bi bi-clock-history me-2"></i>
                            Actividad
                        </button>
                    </div>
                </div>

                <div className="col-lg-9">
                    {error && (
                        <div className="alert alert-danger alert-dismissible fade show" role="alert">
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            {error}
                            <button type="button" className="btn-close" onClick={() => setError('')}></button>
                        </div>
                    )}
                    
                    {success && (
                        <div className="alert alert-success alert-dismissible fade show" role="alert">
                            <i className="bi bi-check-circle-fill me-2"></i>
                            {success}
                            <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
                        </div>
                    )}

                    {/* Personal Information Tab */}
                    {activeTab === 'personal' && (
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white py-3">
                                <h5 className="mb-0">Información Personal</h5>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handlePersonalSubmit}>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Nombre</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={personalData.nombre}
                                                onChange={(e) => setPersonalData({...personalData, nombre: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Apellido</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={personalData.apellido}
                                                onChange={(e) => setPersonalData({...personalData, apellido: e.target.value})}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Email</label>
                                            <input
                                                type="email"
                                                className="form-control"
                                                value={personalData.email}
                                                onChange={(e) => setPersonalData({...personalData, email: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Teléfono</label>
                                            <input
                                                type="tel"
                                                className="form-control"
                                                value={personalData.telefono}
                                                onChange={(e) => setPersonalData({...personalData, telefono: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Guardando...
                                            </>
                                        ) : 'Guardar Cambios'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white py-3">
                                <h5 className="mb-0">Cambiar Contraseña</h5>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handlePasswordSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label">Contraseña Actual</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={passwordData.currentPassword}
                                            onChange={(e) =>
                                                setPasswordData({ ...passwordData, currentPassword: e.target.value })
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Nueva Contraseña</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={passwordData.newPassword}
                                            onChange={(e) =>
                                                setPasswordData({ ...passwordData, newPassword: e.target.value })
                                            }
                                            required
                                        />
                                        <small className="text-muted d-block mt-1">
                                            La contraseña debe tener:
                                            <ul className="mb-0">
                                                <li>Mínimo 8 caracteres</li>
                                                <li>Al menos una letra mayúscula (A-Z)</li>
                                                <li>Al menos una letra minúscula (a-z)</li>
                                                <li>Al menos un número (0-9)</li>
                                            </ul>
                                        </small>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Confirmar Nueva Contraseña</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) =>
                                                setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                                            }
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Cambiando...
                                            </>
                                        ) : (
                                            "Cambiar Contraseña"
                                        )}
                                    </button>
                                </form>

                                <hr className="my-4" />

                                <h6 className="mb-3">Autenticación de dos factores</h6>
                                <p className="text-muted">Añade una capa extra de seguridad a tu cuenta</p>
                                <button className="btn btn-outline-primary">
                                    <i className="bi bi-shield-check me-2"></i>
                                    Configurar 2FA
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Preferences Tab */}
                    {activeTab === 'preferences' && (
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white py-3">
                                <h5 className="mb-0">Preferencias</h5>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handlePreferencesSubmit}>
                                    <h6 className="mb-3">Notificaciones</h6>
                                    <div className="form-check mb-3">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="emailNotif"
                                            checked={preferences.emailNotifications}
                                            onChange={(e) => setPreferences({...preferences, emailNotifications: e.target.checked})}
                                        />
                                        <label className="form-check-label" htmlFor="emailNotif">
                                            Recibir notificaciones por email
                                        </label>
                                    </div>
                                    <div className="form-check mb-3">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="smsNotif"
                                            checked={preferences.smsNotifications}
                                            onChange={(e) => setPreferences({...preferences, smsNotifications: e.target.checked})}
                                        />
                                        <label className="form-check-label" htmlFor="smsNotif">
                                            Recibir notificaciones por SMS
                                        </label>
                                    </div>

                                    <hr />

                                    <h6 className="mb-3">Configuración Regional</h6>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Idioma</label>
                                            <select 
                                                className="form-select"
                                                value={preferences.language}
                                                onChange={(e) => setPreferences({...preferences, language: e.target.value})}
                                            >
                                                <option value="es">Español</option>
                                                <option value="en">English</option>
                                                <option value="pt">Português</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Zona Horaria</label>
                                            <select 
                                                className="form-select"
                                                value={preferences.timezone}
                                                onChange={(e) => setPreferences({...preferences, timezone: e.target.value})}
                                            >
                                                <option value="America/Argentina/Buenos_Aires">Buenos Aires (GMT-3)</option>
                                                <option value="America/New_York">New York (GMT-5)</option>
                                                <option value="Europe/Madrid">Madrid (GMT+1)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <hr />

                                    <h6 className="mb-3">Apariencia</h6>
                                    <div className="btn-group" role="group">
                                        <input 
                                            type="radio" 
                                            className="btn-check" 
                                            name="theme" 
                                            id="lightTheme"
                                            checked={preferences.theme === 'light'}
                                            onChange={() => setPreferences({...preferences, theme: 'light'})}
                                        />
                                        <label className="btn btn-outline-primary" htmlFor="lightTheme">
                                            <i className="bi bi-sun me-2"></i>Claro
                                        </label>

                                        <input 
                                            type="radio" 
                                            className="btn-check" 
                                            name="theme" 
                                            id="darkTheme"
                                            checked={preferences.theme === 'dark'}
                                            onChange={() => setPreferences({...preferences, theme: 'dark'})}
                                        />
                                        <label className="btn btn-outline-primary" htmlFor="darkTheme">
                                            <i className="bi bi-moon me-2"></i>Oscuro
                                        </label>

                                        <input 
                                            type="radio" 
                                            className="btn-check" 
                                            name="theme" 
                                            id="autoTheme"
                                            checked={preferences.theme === 'auto'}
                                            onChange={() => setPreferences({...preferences, theme: 'auto'})}
                                        />
                                        <label className="btn btn-outline-primary" htmlFor="autoTheme">
                                            <i className="bi bi-circle-half me-2"></i>Automático
                                        </label>
                                    </div>

                                    <div className="mt-4">
                                        <button type="submit" className="btn btn-primary" disabled={loading}>
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                                    Guardando...
                                                </>
                                            ) : 'Guardar Preferencias'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Activity Tab */}
                    {activeTab === 'activity' && (
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white py-3">
                                <h5 className="mb-0">Historial de Actividad</h5>
                            </div>
                            <div className="card-body">
                                <div className="timeline">
                                    {[
                                        { action: 'Inicio de sesión', time: 'Hace 2 horas', icon: 'bi-box-arrow-in-right', color: 'success' },
                                        { action: 'Contrato creado: "Contrato de Servicio"', time: 'Ayer a las 15:30', icon: 'bi-file-plus', color: 'primary' },
                                        { action: 'Contraseña actualizada', time: 'Hace 3 días', icon: 'bi-shield-lock', color: 'warning' },
                                        { action: 'Contrato firmado: "Acuerdo Comercial"', time: 'Hace 1 semana', icon: 'bi-pen', color: 'info' },
                                        { action: 'Perfil actualizado', time: 'Hace 2 semanas', icon: 'bi-person-check', color: 'secondary' }
                                    ].map((item, index) => (
                                        <div key={index} className="d-flex mb-3">
                                            <div className={`bg-${item.color} bg-opacity-10 rounded-circle p-2 me-3`}>
                                                <i className={`bi ${item.icon} text-${item.color}`}></i>
                                            </div>
                                            <div>
                                                <p className="mb-0">{item.action}</p>
                                                <small className="text-muted">{item.time}</small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button className="btn btn-outline-primary w-100 mt-3">
                                    Ver más actividad
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;