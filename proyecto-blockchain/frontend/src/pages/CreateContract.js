import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';

const MAX_FILE_MB = 20;

const CreateContract = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [successMsg, setSuccessMsg] = useState('');
    const [showModal, setShowModal] = useState(false);

    const [contractData, setContractData] = useState({
        titulo: '',
        descripcion: '',
        blockchain_network: 'polygon',
        fecha_vencimiento: '',
        tipo_contrato: 'servicio'
    });

    const [firmantes, setFirmantes] = useState([
        { nombre: '', email: '', rol: 'firmante' }
    ]);

    const [archivo, setArchivo] = useState(null);

    const steps = [
        { number: 1, title: 'Información Básica', icon: 'bi-info-circle' },
        { number: 2, title: 'Contenido', icon: 'bi-file-text' },
        { number: 3, title: 'Firmantes', icon: 'bi-people' },
        { number: 4, title: 'Configuración', icon: 'bi-gear' },
        { number: 5, title: 'Revisión', icon: 'bi-check-circle' }
    ];

    const handleNext = () => {
        if (validateStep()) {
            if (currentStep === 5) {
                handleSubmit();
            } else {
                setCurrentStep(currentStep + 1);
            }
        }
    };

    const handlePrevious = () => {
        setCurrentStep(currentStep - 1);
    };

    const validateStep = () => {
        switch (currentStep) {
            case 1: {
                if (!contractData.titulo?.trim() || !contractData.descripcion?.trim()) {
                    setError('Por favor completa todos los campos obligatorios');
                    return false;
                }
                break;
            }
            case 2: {
                if (!archivo) {
                    setError('Debes subir un archivo PDF del contrato');
                    return false;
                }
                break;
            }
            case 3: {
                const sane = sanitizeFirmantes(firmantes);

                // 👇 NUEVA VALIDACIÓN
                if (sane.length < 2) {
                    setError('Debe haber al menos 2 firmantes para continuar');
                    return false;
                }

                break;
            }
            default:
                break;
        }
        setError('');
        return true;
    };


    function sanitizeFirmantes(list) {
        // normaliza, remueve vacíos y duplicados por email (case-insensitive)
        const cleaned = (list || [])
            .map((f) => ({
                nombre: (f.nombre || '').trim(),
                email: (f.email || '').trim(),
                rol: f.rol || 'firmante'
            }))
            .filter((f) => f.email && f.nombre);

        const seen = new Set();
        const dedup = [];
        for (const f of cleaned) {
            const key = f.email.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                dedup.push(f);
            }
        }
        return dedup;
    }

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (!archivo) {
                setError('Debes subir un archivo PDF del contrato');
                setLoading(false);
                return;
            }

            const validTypes = ['application/pdf'];
            if (!validTypes.includes(archivo.type)) {
                setError('El archivo debe ser un PDF (.pdf)');
                setLoading(false);
                return;
            }

            const maxBytes = MAX_FILE_MB * 1024 * 1024;
            if (archivo.size > maxBytes) {
                setError(`El archivo supera ${MAX_FILE_MB}MB`);
                setLoading(false);
                return;
            }

            const firmantesSane = sanitizeFirmantes(firmantes);

            const formData = new FormData();
            formData.append('titulo', contractData.titulo.trim());
            formData.append('descripcion', contractData.descripcion.trim());
            // Si en el futuro usás este campo en el back, lo sumás.
            // formData.append('fecha_vencimiento', contractData.fecha_vencimiento || '');
            formData.append('blockchain_network', contractData.blockchain_network);
            formData.append('archivo', archivo);

            // 👇 clave: enviar firmantes como STRING JSON
            formData.append('firmantes', JSON.stringify(firmantesSane));

            // Dejá que axios setee el boundary automáticamente (no forces Content-Type)
            await api.post('/contratos', formData);

            setError('');
            setSuccessMsg('Contrato creado e invitaciones enviadas.');
            setShowModal(true);
        } catch (err) {
            console.error(err);
            setError(err?.response?.data?.error || 'Error al crear el contrato. Por favor intentá nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const addFirmante = () => {
        setFirmantes([...firmantes, { nombre: '', email: '', rol: 'firmante' }]);
    };

    const removeFirmante = (index) => {
        setFirmantes(firmantes.filter((_, i) => i !== index));
    };

    const updateFirmante = (index, field, value) => {
        const updated = [...firmantes];
        updated[index][field] = value;
        setFirmantes(updated);
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) {
            setArchivo(null);
            return;
        }
        // Validación temprana
        if (file.type !== 'application/pdf') {
            setError('El archivo debe ser un PDF (.pdf)');
            e.target.value = '';
            setArchivo(null);
            return;
        }
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
            setError(`El archivo supera ${MAX_FILE_MB}MB`);
            e.target.value = '';
            setArchivo(null);
            return;
        }
        setError('');
        setArchivo(file);
    };

    return (
        <div className="container-fluid p-4">
            {/* Header */}
            <div className="row mb-4">
                <div className="col">
                    <h2 className="fw-bold">Crear Nuevo Contrato</h2>
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb">
                            <li className="breadcrumb-item"><Link to="/dashboard">Inicio</Link></li>
                            <li className="breadcrumb-item"><Link to="/contratos">Contratos</Link></li>
                            <li className="breadcrumb-item active">Nuevo</li>
                        </ol>
                    </nav>
                </div>
            </div>

            {/* Modal de éxito */}
            {showModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Éxito</h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p><i className="bi bi-check-circle-fill text-success me-2"></i>{successMsg}</p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cerrar
                                </button>
                                <button className="btn btn-primary" onClick={() => navigate("/contratos")}>
                                    Ver contratos
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
            )}

            {/* Progress Steps */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                        {steps.map((step, index) => (
                            <React.Fragment key={step.number}>
                                <div className={`text-center ${currentStep >= step.number ? 'text-primary' : 'text-muted'}`}>
                                    <div
                                        className={`rounded-circle mx-auto d-flex align-items-center justify-content-center mb-2 
                    ${currentStep >= step.number ? 'bg-primary text-white' : 'bg-light'}`}
                                        style={{ width: '50px', height: '50px' }}
                                    >
                                        <i className={`bi ${step.icon} fs-5`}></i>
                                    </div>
                                    <small className="d-none d-md-block">{step.title}</small>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className="flex-grow-1 mx-3">
                                        <div className="progress" style={{ height: '2px' }}>
                                            <div className="progress-bar" style={{ width: currentStep > step.number ? '100%' : '0%' }}></div>
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            {/* Form Content */}
            <div className="card border-0 shadow-sm">
                <div className="card-body p-4">
                    {/* Step 1: Basic Information */}
                    {currentStep === 1 && (
                        <div>
                            <h4 className="mb-4">Información Básica del Contrato</h4>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Título del Contrato *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={contractData.titulo}
                                        onChange={(e) => setContractData({ ...contractData, titulo: e.target.value })}
                                        placeholder="Ej: Contrato de Prestación de Servicios"
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Tipo de Contrato</label>
                                    <select
                                        className="form-select"
                                        value={contractData.tipo_contrato}
                                        onChange={(e) => setContractData({ ...contractData, tipo_contrato: e.target.value })}
                                    >
                                        <option value="servicio">Servicio</option>
                                        <option value="compraventa">Compraventa</option>
                                        <option value="alquiler">Alquiler</option>
                                        <option value="laboral">Laboral</option>
                                        <option value="confidencialidad">Confidencialidad</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Descripción *</label>
                                <textarea
                                    className="form-control"
                                    rows="4"
                                    value={contractData.descripcion}
                                    onChange={(e) => setContractData({ ...contractData, descripcion: e.target.value })}
                                    placeholder="Breve descripción del contrato..."
                                ></textarea>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Fecha de Vencimiento</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={contractData.fecha_vencimiento}
                                        onChange={(e) => setContractData({ ...contractData, fecha_vencimiento: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Content (solo archivo PDF) */}
                    {currentStep === 2 && (
                        <div>
                            <h4 className="mb-4">Contenido del Contrato</h4>
                            <div className="border border-2 border-dashed rounded p-5 text-center bg-light">
                                <i className="bi bi-folder2-open display-4 text-primary"></i>
                                <p className="mt-3">Seleccioná el archivo del contrato (solo PDF)</p>
                                <input
                                    type="file"
                                    accept="application/pdf" // 👈 PDF únicamente
                                    onChange={handleFileChange}
                                    className="form-control mt-3"
                                />
                                {archivo && (
                                    <div className="mt-3 alert alert-success">
                                        Archivo seleccionado: <b>{archivo.name}</b> ({(archivo.size / 1024 / 1024).toFixed(1)} MB)
                                    </div>
                                )}
                            </div>

                            <div className="alert alert-info mt-3">
                                <i className="bi bi-info-circle me-2"></i>
                               El archivo debe ser PDF para crear el contrato.
                            </div>
                        </div>
                    )}

                    {/* Step 3: Signers */}
                    {currentStep === 3 && (
                        <div>
                            <h4 className="mb-4">Firmantes del Contrato</h4>
                            {firmantes.map((firmante, index) => (
                                <div key={index} className="card mb-3">
                                    <div className="card-body">
                                        <div className="row align-items-end">
                                            <div className="col-md-4 mb-2">
                                                <label className="form-label">Nombre Completo *</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={firmante.nombre}
                                                    onChange={(e) => updateFirmante(index, 'nombre', e.target.value)}
                                                    placeholder="Juan Pérez"
                                                />
                                            </div>
                                            <div className="col-md-5 mb-2">
                                                <label className="form-label">Email *</label>
                                                <input
                                                    type="email"
                                                    className="form-control"
                                                    value={firmante.email}
                                                    onChange={(e) => updateFirmante(index, 'email', e.target.value)}
                                                    placeholder="juan@example.com"
                                                />
                                            </div>
                                            <div className="col-md-2 mb-2">
                                                <label className="form-label">Rol</label>
                                                <select
                                                    className="form-select"
                                                    value={firmante.rol}
                                                    onChange={(e) => updateFirmante(index, 'rol', e.target.value)}
                                                >
                                                    <option value="firmante">Firmante</option>
                                                    <option value="testigo">Testigo</option>
                                                    <option value="aprobador">Aprobador</option>
                                                </select>
                                            </div>
                                            <div className="col-md-1 mb-2">
                                                {firmantes.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger"
                                                        onClick={() => removeFirmante(index)}
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="alert alert-info mt-3">
                                <i className="bi bi-info-circle me-2"></i>
                                Agregá todas las partes involucradas para que sean notificadas e invitadas a firmar.
                            </div>
                            <button className="btn btn-outline-primary" onClick={addFirmante}>
                                <i className="bi bi-plus-circle me-2"></i>
                                Agregar Firmante
                            </button>
                        </div>
                    )}

                    {/* Step 4: Configuration */}
                    {currentStep === 4 && (
                        <div>
                            <h4 className="mb-4">Configuración Blockchain</h4>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Red Blockchain</label>
                                    <select
                                        className="form-select"
                                        value={contractData.blockchain_network}
                                        onChange={(e) => setContractData({ ...contractData, blockchain_network: e.target.value })}
                                    >
                                        <option value="polygon">Polygon</option>
                                        {/* otras redes a futuro */}
                                    </select>
                                    <small className="text-muted">
                                        La red donde se registrará el hash del contrato
                                    </small>
                                </div>
                            </div>
                            <div className="alert alert-warning">
                                <i className="bi bi-exclamation-triangle me-2"></i>
                                <strong>Importante:</strong> Una vez creado el contrato en la blockchain, no podrá ser modificado.
                            </div>
                            <h5 className="mt-4 mb-3">Opciones Adicionales</h5>
                            <div className="form-check mb-2">
                                <input className="form-check-input" type="checkbox" id="notifySigners" defaultChecked />
                                <label className="form-check-label" htmlFor="notifySigners">
                                    Notificar a los firmantes por email
                                </label>
                            </div>
                            <div className="form-check mb-2">
                                <input className="form-check-input" type="checkbox" id="requireOrder" />
                                <label className="form-check-label" htmlFor="requireOrder">
                                    Requerir firmas en orden específico
                                </label>
                            </div>
                            <div className="form-check mb-2">
                                <input className="form-check-input" type="checkbox" id="allowComments" defaultChecked />
                                <label className="form-check-label" htmlFor="allowComments">
                                    Permitir comentarios de los firmantes
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Review */}
                    {currentStep === 5 && (
                        <div>
                            <h4 className="mb-4">Revisión Final</h4>
                            <div className="alert alert-info mb-4">
                                <i className="bi bi-info-circle me-2"></i>
                                Revisá toda la información antes de crear el contrato.
                            </div>

                            <div className="card mb-3">
                                <div className="card-header bg-light">
                                    <h6 className="mb-0">Información Básica</h6>
                                </div>
                                <div className="card-body">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <p><strong>Título:</strong> {contractData.titulo}</p>
                                            <p><strong>Tipo:</strong> {contractData.tipo_contrato}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <p><strong>Red Blockchain:</strong> {contractData.blockchain_network}</p>
                                            <p><strong>Vencimiento:</strong> {contractData.fecha_vencimiento || 'Sin fecha'}</p>
                                        </div>
                                    </div>
                                    <p><strong>Descripción:</strong> {contractData.descripcion}</p>
                                </div>
                            </div>

                            <div className="card mb-3">
                                <div className="card-header bg-light">
                                    <h6 className="mb-0">Firmantes ({firmantes.length})</h6>
                                </div>
                                <div className="card-body">
                                    <ul className="list-unstyled mb-0">
                                        {sanitizeFirmantes(firmantes).map((f, i) => (
                                            <li key={i} className="mb-2">
                                                <i className="bi bi-person me-2"></i>
                                                {f.nombre} ({f.email}) - <span className="badge bg-secondary">{f.rol}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-header bg-light">
                                    <h6 className="mb-0">Archivo</h6>
                                </div>
                                <div className="card-body">
                                    {archivo ? (
                                        <p className="mb-0">
                                            <strong>{archivo.name}</strong> — {(archivo.size / 1024 / 1024).toFixed(1)} MB
                                        </p>
                                    ) : (
                                        <p className="text-muted mb-0">No hay archivo seleccionado</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="d-flex justify-content-between mt-4">
                        <button
                            className="btn btn-outline-secondary"
                            onClick={handlePrevious}
                            disabled={currentStep === 1 || loading}
                        >
                            <i className="bi bi-arrow-left me-2"></i>
                            Anterior
                        </button>

                        <div>
                            <Link to="/contratos" className="btn btn-outline-danger me-2">
                                Cancelar
                            </Link>
                            <button
                                className="btn btn-primary"
                                onClick={handleNext}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Creando...
                                    </>
                                ) : currentStep === 5 ? (
                                    <>
                                        <i className="bi bi-check-circle me-2"></i>
                                        Crear Contrato
                                    </>
                                ) : (
                                    <>
                                        Siguiente
                                        <i className="bi bi-arrow-right ms-2"></i>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateContract;