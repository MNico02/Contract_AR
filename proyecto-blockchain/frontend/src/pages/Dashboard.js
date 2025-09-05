import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { Link, useNavigate } from 'react-router-dom';
import VincularMetaMaskButton from '../components/VincularMetaMaskButton';

const Dashboard = () => {
    const [contratos, setContratos] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        pendientes: 0,
        firmados: 0,
        cancelados: 0
    });
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // ---- Estados para buscar por UUID ----
    const [uuidInput, setUuidInput] = useState("");
    const [searchResult, setSearchResult] = useState(null);
    const [loadingUUID, setLoadingUUID] = useState(false);
    const [adding, setAdding] = useState(false);
    const [errorUUID, setErrorUUID] = useState("");
    const [successUUID, setSuccessUUID] = useState("");

    useEffect(() => {
        cargarDatos();
    }, []);

    // Normaliza un identificador de contrato desde diferentes listas
    const contratoKey = (x) => x?.uuid || x?.contrato_uuid || x?.id;

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [resCreados, resPendientes, resFirmados] = await Promise.all([
                api.get('/contratos'),                                // contratos creados por mí
                api.get('/firmantes/mis-pendientes').catch(() => ({ data: [] })),     // pendientes para mí
                api.get('/firmantes/mis?estado=firmado').catch(() => ({ data: [] }))  // firmados por mí (si existe)
            ]);

            const creados = resCreados.data || [];
            const pendientesParaMi = resPendientes.data || [];
            const firmadosPorMi = resFirmados.data || [];

            setContratos(creados);

            // TOTAL = contratos creados ∪ pendientesParaMi ∪ firmadosPorMi (sin duplicados)
            const totalSet = new Set(creados.map(contratoKey));
            pendientesParaMi.forEach((c) => totalSet.add(contratoKey(c)));
            firmadosPorMi.forEach((c) => totalSet.add(contratoKey(c)));

            // PENDIENTES = los que tengo que firmar yo
            const pendientesCount = pendientesParaMi.length;

            // FIRMADOS = (contratos creados por mí en estado 'firmado') ∪ (contratos que YO firmé)
            const firmadosSet = new Set([
                ...creados.filter((c) => c.estado === 'firmado').map(contratoKey),
                ...firmadosPorMi.map(contratoKey)
            ]);

            // CANCELADOS = de momento contamos los creados por mí cancelados
            const canceladosCount = creados.filter((c) => c.estado === 'cancelado').length;

            setStats({
                total: totalSet.size,
                pendientes: pendientesCount,
                firmados: firmadosSet.size,
                cancelados: canceladosCount
            });
        } catch (error) {
            console.error('Error al cargar datos del dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleDelete = async (id) => {
        const confirmar = window.confirm('¿Eliminar el contrato? Esta acción no se puede deshacer.');
        if (!confirmar) return;

        try {
            setDeletingId(id);
            await api.delete(`/contratos/${id}`);
            // refrescamos todo para que stats cuente también invitaciones correctamente
            await cargarDatos();
        } catch (err) {
            console.error('Error eliminando contrato:', err);
            alert(err?.response?.data?.error || 'Error eliminando contrato');
        } finally {
            setDeletingId(null);
        }
    };

    const handleSearchUUID = async () => {
        if (!uuidInput.trim()) {
            setErrorUUID("Debes ingresar un UUID");
            return;
        }
        setErrorUUID("");
        setSuccessUUID("");
        setLoadingUUID(true);
        try {
            const res = await api.get(`/contratos/${uuidInput}`);
            setSearchResult(res.data);
        } catch (err) {
            setSearchResult(null);
            setErrorUUID("No se encontró ningún contrato con ese UUID");
        } finally {
            setLoadingUUID(false);
        }
    };

    const handleAddContract = async () => {
        if (!searchResult) return;
        setAdding(true);
        try {
            await api.post("/contratos/add-by-uuid", { uuid: searchResult.uuid });
            setSuccessUUID("Contrato agregado correctamente a tu lista");
            setSearchResult(null);
            await cargarDatos();
        } catch (err) {
            setErrorUUID("Error al agregar contrato a tu lista");
        } finally {
            setAdding(false);
        }
    };

    const getEstadoBadge = (estado) => {
        const badges = {
            'borrador': 'bg-secondary',
            'pendiente_firmas': 'bg-warning',
            'firmado': 'bg-success',
            'cancelado': 'bg-danger'
        };
        return badges[estado] || 'bg-secondary';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-vh-100 bg-light">
            {/* Navbar */}
            <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
                <div className="container-fluid px-4">
                    <a className="navbar-brand fw-bold" href="/dashboard">
                        <i className="bi bi-shield-lock-fill me-2"></i>
                        Blockchain Contracts
                    </a>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav ms-auto align-items-center">
                            <li className="nav-item me-3">
                                <VincularMetaMaskButton />
                            </li>
                            <li className="nav-item dropdown">
                                <a className="nav-link dropdown-toggle text-white" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown">
                                    <i className="bi bi-person-circle me-2"></i>
                                    {user.nombre} {user.apellido}
                                </a>
                                <ul className="dropdown-menu dropdown-menu-end">
                                    <li><Link to="/perfil" className="dropdown-item"><i className="bi bi-person me-2"></i>Mi Perfil</Link></li>
                                    <li><Link to="/configuracion" className="dropdown-item"><i className="bi bi-gear me-2"></i>Configuración</Link></li>
                                    <li><hr className="dropdown-divider" /></li>
                                    <li>
                                        <button className="dropdown-item text-danger" onClick={handleLogout}>
                                            <i className="bi bi-box-arrow-right me-2"></i>Cerrar Sesión
                                        </button>
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>

            <div className="container-fluid px-4 py-4">
                {/* Welcome Section */}
                <div className="row mb-4">
                    <div className="col-12">
                        <h2 className="fw-bold text-dark">Bienvenido, {user.nombre}</h2>
                        <p className="text-muted">Gestiona tus contratos digitales de forma segura con tecnología blockchain</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="row mb-4">
                    <div className="col-xl-3 col-md-6 mb-3">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 className="text-muted mb-2">Total Contratos</h6>
                                        <h2 className="mb-0 fw-bold">{stats.total}</h2>
                                    </div>
                                    <div className="bg-primary bg-opacity-10 p-3 rounded">
                                        <i className="bi bi-file-text text-primary fs-3"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-3 col-md-6 mb-3">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 className="text-muted mb-2">Pendientes</h6>
                                        <h2 className="mb-0 fw-bold text-warning">{stats.pendientes}</h2>
                                    </div>
                                    <div className="bg-warning bg-opacity-10 p-3 rounded">
                                        <i className="bi bi-clock-history text-warning fs-3"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-3 col-md-6 mb-3">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 className="text-muted mb-2">Firmados</h6>
                                        <h2 className="mb-0 fw-bold text-success">{stats.firmados}</h2>
                                    </div>
                                    <div className="bg-success bg-opacity-10 p-3 rounded">
                                        <i className="bi bi-check-circle text-success fs-3"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-3 col-md-6 mb-3">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 className="text-muted mb-2">Cancelados</h6>
                                        <h2 className="mb-0 fw-bold text-danger">{stats.cancelados}</h2>
                                    </div>
                                    <div className="bg-danger bg-opacity-10 p-3 rounded">
                                        <i className="bi bi-x-circle text-danger fs-3"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Buscar contrato por UUID */}
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white py-3">
                                <h5 className="mb-0 fw-bold">Agregar contrato con UUID</h5>
                            </div>
                            <div className="card-body">
                                <div className="input-group mb-3">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Ingresa el UUID del contrato"
                                        value={uuidInput}
                                        onChange={(e) => setUuidInput(e.target.value)}
                                    />
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSearchUUID}
                                        disabled={loadingUUID}
                                    >
                                        {loadingUUID ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Buscando...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-search me-2"></i>
                                                Buscar
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Resultado */}
                                {searchResult && (
                                    <div className="alert alert-info">
                                        <h6 className="fw-bold mb-1">{searchResult.titulo}</h6>
                                        <p className="mb-1 text-muted">{searchResult.descripcion}</p>
                                        <small className="d-block mb-2">
                                            <b>UUID:</b> {searchResult.uuid}
                                        </small>
                                        <button
                                            className="btn btn-success btn-sm"
                                            onClick={handleAddContract}
                                            disabled={adding}
                                        >
                                            {adding ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                                    Agregando...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-plus-circle me-2"></i>
                                                    Agregar a mis contratos
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {errorUUID && (
                                    <div className="alert alert-danger">
                                        <i className="bi bi-exclamation-triangle me-2"></i>
                                        {errorUUID}
                                    </div>
                                )}

                                {successUUID && (
                                    <div className="alert alert-success">
                                        <i className="bi bi-check-circle me-2"></i>
                                        {successUUID}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contracts Section */}
                <div className="row">
                    <div className="col-12">
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white py-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0 fw-bold">Mis Contratos</h5>

                                    <Link to="/contratos/nuevo" className="btn btn-primary">
                                        <i className="bi bi-plus-circle me-2"></i>
                                        Nuevo Contrato
                                    </Link>
                                </div>
                            </div>
                            <div className="card-body p-0">
                                {contratos.length === 0 ? (
                                    <div className="text-center py-5">
                                        <i className="bi bi-folder-x text-muted" style={{ fontSize: '4rem' }}></i>
                                        <p className="text-muted mt-3">No tienes contratos aún</p>
                                        <Link to="/contratos/nuevo" className="btn btn-primary">
                                            <i className="bi bi-plus-circle me-2"></i>
                                            Crear tu primer contrato
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover mb-0">
                                            <thead className="bg-light">
                                            <tr>
                                                <th className="border-0 px-4">Título</th>
                                                <th className="border-0">Estado</th>
                                                <th className="border-0">Red</th>
                                                <th className="border-0">Fecha</th>
                                                <th className="border-0">Acciones</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {contratos.map((contrato) => (
                                                <tr key={contrato.id}>
                                                    <td className="px-4">
                                                        <div>
                                                            <h6 className="mb-0">{contrato.titulo}</h6>
                                                            <small className="text-muted">{contrato.descripcion?.substring(0, 50)}...</small>
                                                        </div>
                                                    </td>
                                                    <td>
                              <span className={`badge ${getEstadoBadge(contrato.estado)}`}>
                                {contrato.estado?.replace('_', ' ').toUpperCase()}
                              </span>
                                                    </td>
                                                    <td>
                              <span className="badge bg-info">
                                {contrato.blockchain_network || 'Polygon'}
                              </span>
                                                    </td>
                                                    <td className="text-muted">
                                                        {formatDate(contrato.fecha_creacion)}
                                                    </td>
                                                    <td>
                                                        <div className="btn-group" role="group">
                                                            <Link
                                                                to={`/contratos/${contrato.id}`}
                                                                className="btn btn-sm btn-outline-primary"
                                                                title="Ver detalles"
                                                            >
                                                                <i className="bi bi-eye"></i>
                                                            </Link>

                                                            <Link
                                                                to={`/contratos/${contrato.id}/editar`}
                                                                className="btn btn-sm btn-outline-secondary"
                                                                title="Editar"
                                                            >
                                                                <i className="bi bi-pencil"></i>
                                                            </Link>

                                                            <button
                                                                className="btn btn-sm btn-outline-danger"
                                                                title="Eliminar"
                                                                onClick={() => handleDelete(contrato.id)}
                                                                disabled={deletingId === contrato.id}
                                                            >
                                                                {deletingId === contrato.id ? (
                                                                    <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                                                                ) : (
                                                                    <i className="bi bi-trash"></i>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
};

export default Dashboard;