import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';

const Contracts = () => {
    const [contratos, setContratos] = useState([]);
    const [filteredContratos, setFilteredContratos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('todos');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(9);

    const [deletingId, setDeletingId] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);

    useEffect(() => {
        cargarContratos();
    }, []);

    useEffect(() => {
        filtrarContratos();
    }, [contratos, searchTerm, filterStatus]);

    const cargarContratos = async () => {
        try {
            const res = await api.get('/contratos');
            setContratos(res.data);
            setFilteredContratos(res.data);
        } catch (error) {
            console.error('Error al cargar contratos:', error);
        } finally {
            setLoading(false);
        }
    };

    const filtrarContratos = () => {
        let filtered = [...contratos];

        // Filtrar por búsqueda
        if (searchTerm) {
            filtered = filtered.filter(
                (c) =>
                    c.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtrar por estado
        if (filterStatus !== 'todos') {
            filtered = filtered.filter((c) => c.estado === filterStatus);
        }

        setFilteredContratos(filtered);
        setCurrentPage(1);
    };

    const handleDelete = async (id) => {
        const ok = window.confirm('¿Eliminar el contrato? Esta acción no se puede deshacer.');
        if (!ok) return;

        try {
            setDeletingId(id);
            await api.delete(`/contratos/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            const nuevaLista = contratos.filter((c) => c.id !== id);
            setContratos(nuevaLista); // el useEffect vuelve a filtrar
        } catch (err) {
            console.error('Error eliminando contrato:', err);
            alert(err?.response?.data?.error || 'Error eliminando contrato');
        } finally {
            setDeletingId(null);
        }
    };

    const handleDownload = async (contrato) => {
        try {
            setDownloadingId(contrato.id);

            const url =
                contrato.ipfs_url ||
                (contrato.ipfs_hash ? `https://ipfs.io/ipfs/${contrato.ipfs_hash}` : null);

            if (!url) {
                alert('Este contrato no tiene URL de descarga.');
                return;
            }

            // Intento descargar como archivo (blob). Si por CORS falla, abro en nueva pestaña.
            try {
                const resp = await fetch(url);
                if (!resp.ok) throw new Error('Respuesta no OK del gateway');
                const blob = await resp.blob();
                const a = document.createElement('a');
                const nombre = `${(contrato.titulo || 'contrato').replace(/[^\w\s-]/g, '')}.pdf`;
                a.href = URL.createObjectURL(blob);
                a.download = nombre;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(a.href);
                a.remove();
            } catch {
                // Fallback: abrir en nueva pestaña
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        } catch (e) {
            console.error('Error descargando contrato:', e);
            alert('No se pudo descargar el contrato.');
        } finally {
            setDownloadingId(null);
        }
    };

    const getEstadoBadge = (estado) => {
        const badges = {
            borrador: { color: 'secondary', icon: 'bi-pencil' },
            pendiente_firmas: { color: 'warning', icon: 'bi-clock' },
            firmado: { color: 'success', icon: 'bi-check-circle' },
            cancelado: { color: 'danger', icon: 'bi-x-circle' }
        };
        return badges[estado] || { color: 'secondary', icon: 'bi-question' };
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Paginación
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredContratos.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredContratos.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

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
        <div className="container-fluid p-4">
            {/* Header */}
            <div className="row mb-4">
                <div className="col">
                    <h2 className="fw-bold">Contratos</h2>
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb">
                            <li className="breadcrumb-item">
                                <Link to="/dashboard">Inicio</Link>
                            </li>
                            <li className="breadcrumb-item active">Contratos</li>
                        </ol>
                    </nav>
                </div>
                <div className="col-auto">
                    <Link to="/contratos/nuevo" className="btn btn-primary">
                        <i className="bi bi-plus-circle me-2"></i>
                        Nuevo Contrato
                    </Link>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-4">
                            <div className="input-group">
                <span className="input-group-text bg-light">
                  <i className="bi bi-search"></i>
                </span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Buscar contratos..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-md-3">
                            <select
                                className="form-select"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="todos">Todos los estados</option>
                                <option value="borrador">Borrador</option>
                                <option value="pendiente_firmas">Pendiente de firmas</option>
                                <option value="firmado">Firmado</option>
                                <option value="cancelado">Cancelado</option>
                            </select>
                        </div>
                        <div className="col-md-2 ms-auto">
                            <div className="btn-group w-100" role="group">
                                <button
                                    className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setViewMode('grid')}
                                    title="Vista de tarjetas"
                                >
                                    <i className="bi bi-grid-3x3-gap"></i>
                                </button>
                                <button
                                    className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setViewMode('table')}
                                    title="Vista de tabla"
                                >
                                    <i className="bi bi-list-ul"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="row mt-3">
                        <div className="col">
                            <small className="text-muted">
                                Mostrando {currentItems.length} de {filteredContratos.length} contratos
                            </small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contracts Display */}
            {currentItems.length === 0 ? (
                <div className="text-center py-5">
                    <i className="bi bi-folder-x text-muted" style={{ fontSize: '4rem' }}></i>
                    <p className="text-muted mt-3">No se encontraron contratos</p>
                    {searchTerm || filterStatus !== 'todos' ? (
                        <button
                            className="btn btn-outline-primary"
                            onClick={() => {
                                setSearchTerm('');
                                setFilterStatus('todos');
                            }}
                        >
                            Limpiar filtros
                        </button>
                    ) : (
                        <Link to="/contratos/nuevo" className="btn btn-primary">
                            <i className="bi bi-plus-circle me-2"></i>
                            Crear primer contrato
                        </Link>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="row g-4">
                    {currentItems.map((contrato) => {
                        const badge = getEstadoBadge(contrato.estado);
                        return (
                            <div key={contrato.id} className="col-md-6 col-lg-4">
                                <div className="card h-100 border-0 shadow-sm hover-shadow">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <h5 className="card-title mb-0">{contrato.titulo}</h5>
                                            <span className={`badge bg-${badge.color}`}>
                        <i className={`bi ${badge.icon} me-1`}></i>
                                                {contrato.estado?.replace('_', ' ')}
                      </span>
                                        </div>
                                        <p className="card-text text-muted small">
                                            {contrato.descripcion?.substring(0, 100)}...
                                        </p>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <small className="text-muted">
                                                <i className="bi bi-calendar me-1"></i>
                                                {formatDate(contrato.fecha_creacion)}
                                            </small>
                                            <small className="text-info">
                                                <i className="bi bi-link-45deg me-1"></i>
                                                {contrato.blockchain_network || 'Polygon'}
                                            </small>
                                        </div>
                                        <hr />
                                        <div className="d-flex gap-2">
                                            <Link
                                                to={`/contratos/${contrato.id}`}
                                                className="btn btn-sm btn-outline-primary flex-fill"
                                            >
                                                <i className="bi bi-eye me-1"></i>
                                                Ver detalles
                                            </Link>

                                            <button
                                                className="btn btn-sm btn-outline-secondary"
                                                title="Descargar"
                                                onClick={() => handleDownload(contrato)}
                                                disabled={downloadingId === contrato.id}
                                            >
                                                {downloadingId === contrato.id ? (
                                                    <span className="spinner-border spinner-border-sm" />
                                                ) : (
                                                    <i className="bi bi-download" />
                                                )}
                                            </button>

                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                title="Eliminar"
                                                onClick={() => handleDelete(contrato.id)}
                                                disabled={deletingId === contrato.id}
                                            >
                                                {deletingId === contrato.id ? (
                                                    <span className="spinner-border spinner-border-sm" />
                                                ) : (
                                                    <i className="bi bi-trash" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="card border-0 shadow-sm">
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="bg-light">
                                <tr>
                                    <th className="border-0">ID</th>
                                    <th className="border-0">Título</th>
                                    <th className="border-0">Estado</th>
                                    <th className="border-0">Red</th>
                                    <th className="border-0">Fecha</th>
                                    <th className="border-0">Acciones</th>
                                </tr>
                                </thead>
                                <tbody>
                                {currentItems.map((contrato) => {
                                    const badge = getEstadoBadge(contrato.estado);
                                    return (
                                        <tr key={contrato.id}>
                                            <td>#{contrato.id}</td>
                                            <td>
                                                <div>
                                                    <strong>{contrato.titulo}</strong>
                                                    <br />
                                                    <small className="text-muted">
                                                        {contrato.descripcion?.substring(0, 50)}...
                                                    </small>
                                                </div>
                                            </td>
                                            <td>
                          <span className={`badge bg-${badge.color}`}>
                            <i className={`bi ${badge.icon} me-1`}></i>
                              {contrato.estado?.replace('_', ' ')}
                          </span>
                                            </td>
                                            <td>
                          <span className="badge bg-info">
                            {contrato.blockchain_network || 'Polygon'}
                          </span>
                                            </td>
                                            <td className="text-muted">{formatDate(contrato.fecha_creacion)}</td>
                                            <td>
                                                <div className="btn-group" role="group">
                                                    <Link
                                                        to={`/contratos/${contrato.id}`}
                                                        className="btn btn-sm btn-outline-primary"
                                                        title="Ver detalles"
                                                    >
                                                        <i className="bi bi-eye"></i>
                                                    </Link>

                                                    <button
                                                        className="btn btn-sm btn-outline-secondary"
                                                        title="Descargar"
                                                        onClick={() => handleDownload(contrato)}
                                                        disabled={downloadingId === contrato.id}
                                                    >
                                                        {downloadingId === contrato.id ? (
                                                            <span className="spinner-border spinner-border-sm" />
                                                        ) : (
                                                            <i className="bi bi-download" />
                                                        )}
                                                    </button>

                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        title="Eliminar"
                                                        onClick={() => handleDelete(contrato.id)}
                                                        disabled={deletingId === contrato.id}
                                                    >
                                                        {deletingId === contrato.id ? (
                                                            <span className="spinner-border spinner-border-sm" />
                                                        ) : (
                                                            <i className="bi bi-trash" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <nav aria-label="Page navigation" className="mt-4">
                    <ul className="pagination justify-content-center">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button
                                className="page-link"
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                Anterior
                            </button>
                        </li>
                        {[...Array(totalPages)].map((_, index) => (
                            <li
                                key={index}
                                className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}
                            >
                                <button className="page-link" onClick={() => paginate(index + 1)}>
                                    {index + 1}
                                </button>
                            </li>
                        ))}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                            <button
                                className="page-link"
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                Siguiente
                            </button>
                        </li>
                    </ul>
                </nav>
            )}

            <style jsx>{`
        .hover-shadow:hover {
          transform: translateY(-2px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
          transition: all 0.3s ease;
        }
      `}</style>
        </div>
    );
};

export default Contracts;
