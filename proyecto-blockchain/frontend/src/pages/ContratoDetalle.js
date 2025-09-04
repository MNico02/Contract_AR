import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';

const ContratoDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [contrato, setContrato] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [signing, setSigning] = useState(false);

    useEffect(() => {
        const cargar = async () => {
            try {
                const res = await api.get(`/contratos/${id}`);
                setContrato(res.data);
            } catch (e) {
                console.error(e);
                alert('No se pudo cargar el contrato');
            } finally {
                setLoading(false);
            }
        };
        cargar();
    }, [id]);

    const getEstadoBadge = (estado) => {
        const map = {
            borrador: 'bg-secondary',
            pendiente_firmas: 'bg-warning',
            firmado: 'bg-success',
            cancelado: 'bg-danger',
        };
        return map[estado] || 'bg-secondary';
    };

    const formatDate = (d) =>
        new Date(d).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    const handleDownload = async () => {
        if (!contrato) return;
        try {
            setDownloading(true);
            const url =
                contrato.ipfs_url ||
                (contrato.ipfs_hash ? `https://ipfs.io/ipfs/${contrato.ipfs_hash}` : null);
            if (!url) {
                alert('Este contrato no tiene URL/CID disponible.');
                return;
            }

            // Intento descargar como blob; si falla por CORS, abro en nueva pestaña
            try {
                const resp = await fetch(url);
                if (!resp.ok) throw new Error('Gateway respondió con error');
                const blob = await resp.blob();
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `${(contrato.titulo || 'contrato').replace(/[^\w\s-]/g, '')}.pdf`;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(a.href);
                a.remove();
            } catch {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        } catch (e) {
            console.error(e);
            alert('No se pudo descargar el contrato.');
        } finally {
            setDownloading(false);
        }
    };

    const handleFirmar = async () => {
        if (!contrato) return;
        if (contrato.estado === 'firmado' || contrato.estado === 'cancelado') return;

        if (!window.confirm('¿Confirmás que querés firmar este contrato?')) return;

        try {
            setSigning(true);

            const res = await api.post(`/firmantes/contratos/${contrato.uuid}/firmar`);
            // Actualizar vista con el contrato retornado (si tu backend lo devuelve)
            if (res?.data?.contrato) {
                setContrato(res.data.contrato);
            } else {
                // Si no devuelve el contrato, recargar
                const rec = await api.get(`/contratos/${id}`);
                setContrato(rec.data);
            }
            alert('Contrato firmado correctamente.');
        } catch (e) {
            console.error(e);
            alert(e?.response?.data?.error || 'No se pudo firmar el contrato.');
        } finally {
            setSigning(false);
        }
    };

    const explorerTxUrl = () => {
        if (!contrato) return null;
        const tx = contrato.transaction_hash;
        if (!tx) return null;
        const net = (contrato.blockchain_network || '').toLowerCase();
        if (net.includes('polygon')) return `https://polygonscan.com/tx/${tx}`;
        if (net.includes('ethereum')) return `https://etherscan.io/tx/${tx}`;
        return null;
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

    if (!contrato) {
        return (
            <div className="container py-4">
                <div className="alert alert-danger">Contrato no encontrado.</div>
                <button className="btn btn-outline-primary" onClick={() => navigate(-1)}>
                    Volver
                </button>
            </div>
        );
    }

    const pdfUrl =
        contrato.ipfs_url ||
        (contrato.ipfs_hash ? `https://ipfs.io/ipfs/${contrato.ipfs_hash}` : null);

    return (
        <div className="container-fluid p-4">
            {/* Encabezado / migas */}
            <div className="row mb-3">
                <div className="col">
                    <h2 className="fw-bold mb-1">{contrato.titulo}</h2>
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb">
                            <li className="breadcrumb-item">
                                <Link to="/dashboard">Inicio</Link>
                            </li>
                            <li className="breadcrumb-item">
                                <Link to="/contratos">Contratos</Link>
                            </li>
                            <li className="breadcrumb-item active">Detalle</li>
                        </ol>
                    </nav>
                </div>
                <div className="col-auto d-flex gap-2">
                    <button
                        className="btn btn-outline-secondary"
                        onClick={handleDownload}
                        disabled={downloading || !pdfUrl}
                        title="Descargar PDF"
                    >
                        {downloading ? (
                            <span className="spinner-border spinner-border-sm" />
                        ) : (
                            <>
                                <i className="bi bi-download me-2" />
                                Descargar
                            </>
                        )}
                    </button>
                    <a
                        className="btn btn-outline-info"
                        href={pdfUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir PDF en otra pestaña"
                    >
                        <i className="bi bi-box-arrow-up-right me-2" />
                        Abrir PDF
                    </a>
                    <button
                        className="btn btn-success"
                        onClick={handleFirmar}
                        disabled={signing || contrato.estado === 'firmado' || contrato.estado === 'cancelado'}
                        title="Firmar contrato"
                    >
                        {signing ? (
                            <span className="spinner-border spinner-border-sm" />
                        ) : (
                            <>
                                <i className="bi bi-pencil-square me-2" />
                                Firmar
                            </>
                        )}
                    </button>
                    <button className="btn btn-outline-dark" onClick={() => navigate(-1)}>
                        <i className="bi bi-arrow-left me-2" />
                        Volver
                    </button>
                </div>
            </div>

            <div className="row g-4">
                {/* Detalles */}
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <h5 className="fw-bold mb-3">Información del contrato</h5>

                            <div className="mb-3">
                                <small className="text-muted d-block">Estado</small>
                                <span className={`badge ${getEstadoBadge(contrato.estado)}`}>
                  {contrato.estado?.replace('_', ' ').toUpperCase()}
                </span>
                            </div>

                            <div className="mb-3">
                                <small className="text-muted d-block">Descripción</small>
                                <div>{contrato.descripcion || <span className="text-muted">—</span>}</div>
                            </div>

                            <div className="mb-3">
                                <small className="text-muted d-block">Red</small>
                                <span className="badge bg-info">
                  {contrato.blockchain_network || 'Polygon'}
                </span>
                            </div>

                            <div className="mb-3">
                                <small className="text-muted d-block">Fecha de creación</small>
                                <div>{formatDate(contrato.fecha_creacion)}</div>
                            </div>

                            {contrato.fecha_firmado && (
                                <div className="mb-3">
                                    <small className="text-muted d-block">Fecha de firmado</small>
                                    <div>{formatDate(contrato.fecha_firmado)}</div>
                                </div>
                            )}

                            <div className="mb-3">
                                <small className="text-muted d-block">Creador</small>
                                <div>{contrato.creador || <span className="text-muted">—</span>}</div>
                                {contrato.creador_email && (
                                    <div className="text-muted small">{contrato.creador_email}</div>
                                )}
                            </div>

                            {contrato.ipfs_hash && (
                                <div className="mb-3">
                                    <small className="text-muted d-block">IPFS CID</small>
                                    <code className="d-block text-break">{contrato.ipfs_hash}</code>
                                </div>
                            )}

                            {contrato.blockchain_hash && (
                                <div className="mb-3">
                                    <small className="text-muted d-block">Blockchain Hash</small>
                                    <code className="d-block text-break">{contrato.blockchain_hash}</code>
                                </div>
                            )}

                            {contrato.transaction_hash && (
                                <div className="mb-2">
                                    <small className="text-muted d-block">Transaction Hash</small>
                                    <code className="d-block text-break">{contrato.transaction_hash}</code>
                                    {explorerTxUrl() && (
                                        <a
                                            className="small d-inline-block mt-1"
                                            href={explorerTxUrl()}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Ver en explorer <i className="bi bi-box-arrow-up-right ms-1" />
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Visor PDF */}
                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white">
                            <h5 className="mb-0 fw-bold">Documento</h5>
                        </div>
                        <div className="card-body" style={{ minHeight: 480 }}>
                            {pdfUrl ? (
                                <div className="ratio ratio-4x3">
                                    {/* El gateway puede bloquear embed; si no carga, usar el botón "Abrir PDF" */}
                                    <iframe
                                        title="Contrato PDF"
                                        src={pdfUrl}
                                        style={{ border: 0 }}
                                    />
                                </div>
                            ) : (
                                <div className="text-center text-muted py-5">
                                    <i className="bi bi-file-earmark-pdf" style={{ fontSize: '3rem' }} />
                                    <p className="mt-3">Este contrato no tiene PDF asociado.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContratoDetalle;
