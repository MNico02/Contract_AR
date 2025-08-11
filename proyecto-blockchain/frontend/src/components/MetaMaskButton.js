import React from 'react';
import useMetaMask from '../hooks/useMetaMask';

const MetaMaskButton = () => {
    const {
        account,
        isConnected,
        isInstalled,
        balance,
        loading,
        error,
        connectWallet,
        disconnectWallet,
        getShortAddress,
        currentNetwork,
        switchNetwork
    } = useMetaMask();

    // Si MetaMask no está instalado
    if (!isInstalled) {
        return (
            <button 
                className="btn btn-warning"
                onClick={() => window.open('https://metamask.io/download/', '_blank')}
            >
                <i className="bi bi-download me-2"></i>
                Instalar MetaMask
            </button>
        );
    }

    // Si está conectado
    if (isConnected && account) {
        return (
            <div className="dropdown">
                <button 
                    className="btn btn-outline-primary dropdown-toggle d-flex align-items-center gap-2"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                >
                    <div 
                        className="bg-success rounded-circle" 
                        style={{ width: '10px', height: '10px' }}
                    ></div>
                    <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" 
                        alt="MetaMask" 
                        style={{ width: '20px', height: '20px' }}
                    />
                    <span>{getShortAddress()}</span>
                    {balance && <span className="badge bg-secondary">{balance} MATIC</span>}
                </button>
                <ul className="dropdown-menu dropdown-menu-end">
                    <li className="px-3 py-2">
                        <small className="text-muted">Conectado a:</small>
                        <div className="fw-bold">{currentNetwork?.name || 'Red Desconocida'}</div>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li className="px-3 py-2">
                        <small className="text-muted">Dirección completa:</small>
                        <div className="font-monospace small text-break">{account}</div>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li className="px-3">
                        <div className="d-grid gap-2">
                            <button 
                                className="btn btn-sm btn-outline-info"
                                onClick={() => switchNetwork('0x13881')}
                            >
                                <i className="bi bi-arrow-repeat me-2"></i>
                                Cambiar a Testnet
                            </button>
                            <button 
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => navigator.clipboard.writeText(account)}
                            >
                                <i className="bi bi-clipboard me-2"></i>
                                Copiar dirección
                            </button>
                        </div>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                        <button 
                            className="dropdown-item text-danger"
                            onClick={disconnectWallet}
                        >
                            <i className="bi bi-box-arrow-right me-2"></i>
                            Desconectar
                        </button>
                    </li>
                </ul>
            </div>
        );
    }

    // Si no está conectado
    return (
        <>
            <button 
                className="btn btn-primary d-flex align-items-center gap-2"
                onClick={connectWallet}
                disabled={loading}
            >
                {loading ? (
                    <>
                        <span className="spinner-border spinner-border-sm"></span>
                        Conectando...
                    </>
                ) : (
                    <>
                        <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" 
                            alt="MetaMask" 
                            style={{ width: '20px', height: '20px' }}
                        />
                        Conectar Wallet
                    </>
                )}
            </button>
            {error && (
                <div className="alert alert-danger mt-2 small">
                    {error}
                </div>
            )}
        </>
    );
};

export default MetaMaskButton;