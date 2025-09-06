import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";

const ContractsToSign = () => {
    const [items, setItems] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("todos"); // por estado_contrato
    const [viewMode, setViewMode] = useState("grid"); // grid | table

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(9);

    const [signingUuid, setSigningUuid] = useState(null);
    const navigate = useNavigate(); // 👈 para redirigir

    useEffect(() => {
        fetchPendientes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        applyFilters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, searchTerm, filterStatus]);

    async function fetchPendientes() {
        setLoading(true);
        try {
            const res = await api.get("/firmantes/mis-pendientes");

            setItems(res.data || []);
            setFiltered(res.data || []);
        } catch (err) {
            console.error("Error cargando pendientes:", err);
            alert(err?.response?.data?.error || "No se pudo cargar la lista de pendientes.");
        } finally {
            setLoading(false);
        }
    }

    function applyFilters() {
        let list = [...items];

        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            list = list.filter(
                (it) =>
                    it.titulo?.toLowerCase().includes(q) ||
                    it.descripcion?.toLowerCase().includes(q) ||
                    it.creador?.toLowerCase().includes(q)
            );
        }

        if (filterStatus !== "todos") {
            list = list.filter((it) => it.estado_contrato === filterStatus);
        }

        setFiltered(list);
        setCurrentPage(1);
    }

    const handleOpenIpfs = (row) => {
        const url = row.ipfs_url;
        if (!url) {
            alert("Este contrato no tiene URL de documento.");
            return;
        }
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleSign = async (contrato_uuid) => {
        const ok = window.confirm("¿Firmar este contrato?");
        if (!ok) return;

        try {
            setSigningUuid(contrato_uuid);

            await api.post(`/firmantes/contratos/${contrato_uuid}/firmar`);
            alert("✅ Firma registrada.");
            // 🔄 Redirigir a "Mis contratos"
            navigate("/contratos");
        } catch (err) {
            console.error("Error firmando:", err);
            if (err?.response?.status === 409 && err?.response?.data?.error === "Ya firmaste este contrato.") {
                alert("Ya habías firmado este contrato."); // 👈 acá va
            } else {
                alert(err?.response?.data?.error || "No se pudo firmar el contrato.");
            }
        } finally {
            setSigningUuid(null);
        }
    };

    const getEstadoBadge = (estadoContrato) => {
        const badges = {
            borrador: { color: "secondary", icon: "bi-pencil" },
            pendiente_firmas: { color: "warning", icon: "bi-clock" },
            firmado: { color: "success", icon: "bi-check-circle" },
            cancelado: { color: "danger", icon: "bi-x-circle" },
        };
        return badges[estadoContrato] || { color: "secondary", icon: "bi-question" };
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("es-ES", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    // Paginación
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentItems = filtered.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginate = (page) => setCurrentPage(page);

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
                    <h2 className="fw-bold">Contratos para firmar</h2>
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb">
                            <li className="breadcrumb-item">
                                <Link to="/dashboard">Inicio</Link>
                            </li>
                            <li className="breadcrumb-item active">Para firmar</li>
                        </ol>
                    </nav>
                </div>
                <div className="col-auto">
                    <button className="btn btn-outline-secondary" onClick={fetchPendientes}>
                        <i className="bi bi-arrow-clockwise me-2" />
                        Refrescar
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-5">
                            <div className="input-group">
                                <span className="input-group-text bg-light">
                                    <i className="bi bi-search"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Buscar por título, descripción o creador..."
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
                                <option value="todos">Todos los estados (contrato)</option>
                                <option value="pendiente_firmas">Pendiente de firmas</option>
                                <option value="firmado">Firmado</option>
                                <option value="cancelado">Cancelado</option>
                                <option value="borrador">Borrador</option>
                            </select>
                        </div>

                        <div className="col-md-2 ms-auto">
                            <div className="btn-group w-100" role="group">
                                <button
                                    className={`btn ${viewMode === "grid" ? "btn-primary" : "btn-outline-primary"}`}
                                    onClick={() => setViewMode("grid")}
                                    title="Vista de tarjetas"
                                >
                                    <i className="bi bi-grid-3x3-gap"></i>
                                </button>
                                <button
                                    className={`btn ${viewMode === "table" ? "btn-primary" : "btn-outline-primary"}`}
                                    onClick={() => setViewMode("table")}
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
                                Mostrando {currentItems.length} de {filtered.length} contratos
                            </small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            {currentItems.length === 0 ? (
                <div className="text-center py-5">
                    <i className="bi bi-pen text-muted" style={{ fontSize: "4rem" }}></i>
                    <p className="text-muted mt-3">No tenés contratos pendientes de firma 🎉</p>
                    {(searchTerm || filterStatus !== "todos") && (
                        <button
                            className="btn btn-outline-primary"
                            onClick={() => {
                                setSearchTerm("");
                                setFilterStatus("todos");
                            }}
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>
            ) : viewMode === "grid" ? (
                <div className="row g-4">
                    {currentItems.map((it) => {
                        const badge = getEstadoBadge(it.estado_contrato);
                        return (
                            <div className="col-md-6 col-lg-4" key={it.contrato_uuid}>
                                <div className="card h-100 border-0 shadow-sm hover-shadow">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <h5 className="card-title mb-0">{it.titulo}</h5>
                                            <span className={`badge bg-${badge.color}`}>
                                                 <i className={`bi ${badge.icon} me-1`} />
                                                {it.estado_contrato?.replace("_", " ")}
                                            </span>
                                        </div>
                                        <p className="card-text text-muted small">
                                            {it.descripcion ? `${it.descripcion.substring(0, 100)}...` : "-"}
                                        </p>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <small className="text-muted">
                                                <i className="bi bi-person me-1" />
                                                {it.creador || "—"}
                                            </small>
                                            <small className="text-muted">
                                                <i className="bi bi-calendar me-1" />
                                                {formatDate(it.fecha_creacion)}
                                            </small>
                                        </div>
                                        <hr />
                                        <div className="d-flex gap-2">
                                            <button
                                                className="btn btn-sm btn-outline-secondary flex-fill"
                                                onClick={() => handleOpenIpfs(it)}
                                                title="Ver documento"
                                            >
                                                <i className="bi bi-box-arrow-up-right me-1" />
                                                Ver documento
                                            </button>
                                            <button
                                                className="btn btn-sm btn-primary"
                                                onClick={() => handleSign(it.contrato_uuid)}
                                                disabled={signingUuid === it.contrato_uuid}
                                                title="Firmar contrato"
                                            >
                                                {signingUuid === it.contrato_uuid ? (
                                                    <span className="spinner-border spinner-border-sm" />
                                                ) : (
                                                    <>
                                                        <i className="bi bi-pencil-square me-1" />
                                                        Firmar
                                                    </>
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
                                    <th className="border-0">Título</th>
                                    <th className="border-0">Creador</th>
                                    <th className="border-0">Estado</th>
                                    <th className="border-0">Fecha</th>
                                    <th className="border-0">Acciones</th>
                                </tr>
                                </thead>
                                <tbody>
                                {currentItems.map((it) => {
                                    const badge = getEstadoBadge(it.estado_contrato);
                                    return (
                                        <tr key={it.contrato_uuid}>
                                            <td>
                                                <strong>{it.titulo}</strong>
                                                <br />
                                                <small className="text-muted">
                                                    {it.descripcion ? `${it.descripcion.substring(0, 70)}...` : "-"}
                                                </small>
                                            </td>
                                            <td className="text-muted">{it.creador || "—"}</td>
                                            <td>
                                                  <span className={`badge bg-${badge.color}`}>
                                                    <i className={`bi ${badge.icon} me-1`} />
                                                      {it.estado_contrato?.replace("_", " ")}
                                                  </span>
                                            </td>
                                            <td className="text-muted">{formatDate(it.fecha_creacion)}</td>
                                            <td>
                                                <div className="btn-group" role="group">
                                                    <button
                                                        className="btn btn-sm btn-outline-secondary"
                                                        onClick={() => handleOpenIpfs(it)}
                                                        title="Ver documento"
                                                    >
                                                        <i className="bi bi-box-arrow-up-right" />
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => handleSign(it.contrato_uuid)}
                                                        disabled={signingUuid === it.contrato_uuid}
                                                        title="Firmar"
                                                    >
                                                        {signingUuid === it.contrato_uuid ? (
                                                            <span className="spinner-border spinner-border-sm" />
                                                        ) : (
                                                            <i className="bi bi-pencil-square" />
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

            {/* Paginación */}
            {totalPages > 1 && (
                <nav aria-label="Page navigation" className="mt-4">
                    <ul className="pagination justify-content-center">
                        <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                            <button
                                className="page-link"
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                Anterior
                            </button>
                        </li>
                        {[...Array(totalPages)].map((_, idx) => (
                            <li key={idx} className={`page-item ${currentPage === idx + 1 ? "active" : ""}`}>
                                <button className="page-link" onClick={() => paginate(idx + 1)}>
                                    {idx + 1}
                                </button>
                            </li>
                        ))}
                        <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
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

            <style jsx="true">{`
            .hover-shadow:hover {
              transform: translateY(-2px);
              box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
              transition: all 0.3s ease;
            }
          `}</style>
        </div>
    );
};

export default ContractsToSign;
