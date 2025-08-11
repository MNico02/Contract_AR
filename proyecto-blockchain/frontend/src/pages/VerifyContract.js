import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import Web3 from 'web3';

const VerifyContract = () => {
    const [verificationMethod, setVerificationMethod] = useState('uuid'); // 'uuid' o 'file'
    const [uuid, setUuid] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [verificationResult, setVerificationResult] = useState(null);
    const [error, setError] = useState('');

    const CONTRACT_ABI_MINIMAL = [
        {
            "inputs": [{"internalType": "string", "name": "_uuid", "type": "string"}],
            "name": "obtenerContrato",
            "outputs": [
                {"internalType": "string", "name": "ipfsHash", "type": "string"},
                {"internalType": "string", "name": "hashOriginal", "type": "string"},
                {"internalType": "address", "name": "proveedor", "type": "address"},
                {"internalType": "address", "name": "consumidor", "type": "address"},
                {"internalType": "uint256", "name": "timestampCreacion", "type": "uint256"},
                {"internalType": "uint256", "name": "timestampFirmaProveedor", "type": "uint256"},
                {"internalType": "uint256", "name": "timestampFirmaConsumidor", "type": "uint256"},
                {"internalType": "uint8", "name": "estado", "type": "uint8"}
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    const handleVerifyByUUID = async () => {
        if (!uuid) {
            setError('Por favor ingresa un UUID');
            return;
        }

        setLoading(true);
        setError('');
        setVerificationResult(null);

        try {
            // Obtener información del backend
            const response = await api.get(`/contratos/verify/${uuid}`);
            const contractData = response.data;

            // Si hay dirección de contrato configurada, verificar en blockchain
            if (contractData.blockchain_verified) {
                // Conectar a blockchain (Polygon Mumbai por defecto)
                const web3 = new Web3('https://rpc-mumbai.maticvigil.com');
                const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
                
                if (contractAddress !== '0x0000000000000000000000000000000000000000') {
                    const contract = new web3.eth.Contract(CONTRACT_ABI_MINIMAL, contractAddress);
                    
                    try {
                        const blockchainData = await contract.methods.obtenerContrato(uuid).call();
                        contractData.blockchain = {
                            ipfsHash: blockchainData.ipfsHash,
                            hashOriginal: blockchainData.hashOriginal,
                            proveedor: blockchainData.proveedor,
                            consumidor: blockchainData.consumidor,
                            estado: parseEstado(blockchainData.estado),
                            timestampCreacion: new Date(blockchainData.timestampCreacion * 1000).toLocaleString(),
                            firmadoPorProveedor: blockchainData.timestampFirmaProveedor > 0,
                            firmadoPorConsumidor: blockchainData.timestampFirmaConsumidor > 0
                        };
                    } catch (blockchainError) {
                        console.error('Error consultando blockchain:', blockchainError);
                        contractData.blockchain = null;
                    }
                }
            }

            setVerificationResult(contractData);
        } catch (err) {
            setError('No se pudo verificar el contrato. Verifica el UUID.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyByFile = async () => {
        if (!file) {
            setError('Por favor selecciona un archivo');
            return;
        }

        setLoading(true);
        setError('');
        setVerificationResult(null);

        try {
            // Calcular hash del archivo
            const fileBuffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Enviar al backend para verificación
            const formData = new FormData();
            formData.append('file', file);
            formData.append('hash', hashHex);

            const response = await api.post('/contratos/verify-file', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setVerificationResult(response.data);
        } catch (err) {
            setError('No se pudo verificar el archivo');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const parseEstado = (estadoNum) => {
        const estados = ['CREADO', 'FIRMADO_PROVEEDOR', 'FIRMADO_AMBOS', 'CANCELADO', 'EN_DISPUTA'];
        return estados[estadoNum] || 'DESCONOCIDO';
    };

    const getEstadoBadge = (estado) => {
        const badges = {
            'CREADO': 'secondary',
            'FIRMADO_PROVEEDOR': 'warning',
            'FIRMADO_AMBOS': 'success',
            'CANCELADO': 'danger',
            'EN_DISPUTA': 'info'
        };
        return badges[estado] || 'secondary';
    };

    return (
        <div className="min-vh-100 bg-light py-5">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-lg-8">
                        <div className="text-center mb-5">
                            <h1 className="display-4 fw-bold text-primary">
                                <i className="bi bi-shield-check me-3"></i>
                                Verificador de Contratos
                            </h1>
                            <p className="lead text-muted">
                                Verifica la autenticidad e integridad de contratos registrados en blockchain
                            </p>
                        </div>

                        {/* Selector de método de verificación */}
                        <div className="card shadow-sm mb-4">
                            <div className="card-body">
                                <div className="btn-group w-100" role="group">
                                    <button
                                        className={`btn ${verificationMethod === 'uuid' ? 'btn-primary' : 'btn-outline-primary'}`}
                                        onClick={() => setVerificationMethod('uuid')}
                                    >
                                        <i className="bi bi-key me-2"></i>
                                        Verificar por UUID
                                    </button>
                                    <button
                                        className={`btn ${verificationMethod === 'file' ? 'btn-primary' : 'btn-outline-primary'}`}
                                        onClick={() => setVerificationMethod('file')}
                                    >
                                        <i className="bi bi-file-earmark-pdf me-2"></i>
                                        Verificar por Archivo
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Formulario de verificación */}
                        <div className="card shadow-sm mb-4">
                            <div className="card-body p-4">
                                {verificationMethod === 'uuid' ? (
                                    <div>
                                        <label className="form-label">UUID del Contrato</label>
                                        <div className="input-group mb-3">
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Ej: 123e4567-e89b-12d3-a456-426614174000"
                                                value={uuid}
                                                onChange={(e) => setUuid(e.target.value)}
                                            />
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleVerifyByUUID}
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <span className="spinner-border spinner-border-sm"></span>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-search me-2"></i>
                                                        Verificar
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="form-label">Archivo del Contrato</label>
                                        <input
                                            type="file"
                                            className="form-control mb-3"
                                            accept=".pdf,.doc,.docx"
                                            onChange={(e) => setFile(e.target.files[0])}
                                        />
                                        <button
                                            className="btn btn-primary w-100"
                                            onClick={handleVerifyByFile}
                                            disabled={loading || !file}
                                        >
                                            {loading ? (
                                                <span className="spinner-border spinner-border-sm"></span>
                                            ) : (
                                                <>
                                                    <i className="bi bi-shield-check me-2"></i>
                                                    Verificar Archivo
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {error && (
                                    <div className="alert alert-danger mt-3">
                                        <i className="bi bi-exclamation-triangle me-2"></i>
                                        {error}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Resultado de verificación */}
                        {verificationResult && (
                            <div className="card shadow-sm">
                                <div className="card-header bg-primary text-white">
                                    <h5 className="mb-0">
                                        <i className="bi bi-check-circle me-2"></i>
                                        Resultado de Verificación
                                    </h5>
                                </div>
                                <div className="card-body">
                                    {/* Información básica */}
                                    <div className="mb-4">
                                        <h6 className="text-muted">Información del Contrato</h6>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <p><strong>Título:</strong> {verificationResult.titulo}</p>
                                                <p><strong>UUID:</strong> <code>{verificationResult.uuid}</code></p>
                                                <p><strong>Fecha Creación:</strong> {new Date(verificationResult.fecha_creacion).toLocaleString()}</p>
                                            </div>
                                            <div className="col-md-6">
                                                <p><strong>Estado:</strong> 
                                                    <span className={`badge bg-${getEstadoBadge(verificationResult.estado)} ms-2`}>
                                                        {verificationResult.estado}
                                                    </span>
                                                </p>
                                                <p><strong>Creador:</strong> {verificationResult.creador}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Información de IPFS */}
                                    {verificationResult.ipfs_hash && (
                                        <div className="mb-4">
                                            <h6 className="text-muted">Almacenamiento IPFS</h6>
                                            <div className="bg-light p-3 rounded">
                                                <p className="mb-1"><strong>IPFS Hash:</strong></p>
                                                <code className="d-block text-break">{verificationResult.ipfs_hash}</code>
                                                {verificationResult.ipfs_url && (
                                                    <a 
                                                        href={verificationResult.ipfs_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="btn btn-sm btn-outline-primary mt-2"
                                                    >
                                                        <i className="bi bi-box-arrow-up-right me-2"></i>
                                                        Ver en IPFS
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Información de Blockchain */}
                                    {verificationResult.blockchain ? (
                                        <div className="mb-4">
                                            <h6 className="text-muted">Verificación Blockchain</h6>
                                            <div className="alert alert-success">
                                                <i className="bi bi-check-circle-fill me-2"></i>
                                                <strong>Contrato verificado en blockchain</strong>
                                            </div>
                                            <div className="bg-light p-3 rounded">
                                                <p><strong>Hash Original:</strong></p>
                                                <code className="d-block text-break mb-3">{verificationResult.blockchain.hashOriginal}</code>
                                                
                                                <div className="row">
                                                    <div className="col-md-6">
                                                        <p><strong>Proveedor:</strong></p>
                                                        <code className="d-block text-break small">{verificationResult.blockchain.proveedor}</code>
                                                        {verificationResult.blockchain.firmadoPorProveedor && (
                                                            <span className="badge bg-success mt-1">
                                                                <i className="bi bi-check me-1"></i>Firmado
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="col-md-6">
                                                        <p><strong>Consumidor:</strong></p>
                                                        <code className="d-block text-break small">{verificationResult.blockchain.consumidor}</code>
                                                        {verificationResult.blockchain.firmadoPorConsumidor && (
                                                            <span className="badge bg-success mt-1">
                                                                <i className="bi bi-check me-1"></i>Firmado
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {verificationResult.transaction_hash && (
                                                    <div className="mt-3">
                                                        <a 
                                                            href={`https://mumbai.polygonscan.com/tx/${verificationResult.transaction_hash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-sm btn-outline-info"
                                                        >
                                                            <i className="bi bi-box-arrow-up-right me-2"></i>
                                                            Ver en Polygon Scan
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mb-4">
                                            <h6 className="text-muted">Verificación Blockchain</h6>
                                            <div className="alert alert-warning">
                                                <i className="bi bi-exclamation-triangle me-2"></i>
                                                Este contrato aún no ha sido registrado en blockchain
                                            </div>
                                        </div>
                                    )}

                                    {/* Validación de integridad */}
                                    {verificationResult.integrity && (
                                        <div className="mb-4">
                                            <h6 className="text-muted">Integridad del Documento</h6>
                                            {verificationResult.integrity.isValid ? (
                                                <div className="alert alert-success">
                                                    <i className="bi bi-shield-check me-2"></i>
                                                    El documento no ha sido modificado desde su registro
                                                </div>
                                            ) : (
                                                <div className="alert alert-danger">
                                                    <i className="bi bi-shield-x me-2"></i>
                                                    ¡ADVERTENCIA! El documento ha sido modificado
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Información adicional */}
                        <div className="text-center mt-5">
                            <p className="text-muted">
                                <i className="bi bi-info-circle me-2"></i>
                                Este verificador utiliza tecnología blockchain para garantizar la autenticidad de los contratos
                            </p>
                            <Link to="/dashboard" className="btn btn-outline-primary">
                                <i className="bi bi-arrow-left me-2"></i>
                                Volver al Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyContract;