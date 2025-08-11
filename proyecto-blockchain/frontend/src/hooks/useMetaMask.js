import { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';

const useMetaMask = () => {
    const [account, setAccount] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [web3, setWeb3] = useState(null);
    const [balance, setBalance] = useState('0');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // Configuración de redes soportadas
    const SUPPORTED_NETWORKS = {
        '0x13881': {
            name: 'Polygon Mumbai Testnet',
            rpcUrl: 'https://rpc-mumbai.maticvigil.com',
            chainId: '0x13881',
            symbol: 'MATIC',
            explorer: 'https://mumbai.polygonscan.com'
        },
        '0x89': {
            name: 'Polygon Mainnet',
            rpcUrl: 'https://polygon-rpc.com',
            chainId: '0x89',
            symbol: 'MATIC',
            explorer: 'https://polygonscan.com'
        },
        '0x1': {
            name: 'Ethereum Mainnet',
            rpcUrl: 'https://mainnet.infura.io/v3/',
            chainId: '0x1',
            symbol: 'ETH',
            explorer: 'https://etherscan.io'
        }
    };

    // Verificar si MetaMask está instalado
    useEffect(() => {
        const checkMetaMask = () => {
            const installed = typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
            setIsInstalled(installed);
            
            if (installed) {
                const web3Instance = new Web3(window.ethereum);
                setWeb3(web3Instance);
            }
        };

        checkMetaMask();
    }, []);

    // Escuchar cambios de cuenta y red
    useEffect(() => {
        if (!window.ethereum) return;

        const handleAccountsChanged = (accounts) => {
            if (accounts.length === 0) {
                // Usuario desconectó la wallet
                disconnectWallet();
            } else {
                setAccount(accounts[0]);
                updateBalance(accounts[0]);
            }
        };

        const handleChainChanged = (chainId) => {
            setChainId(chainId);
            // Recargar la página para evitar inconsistencias
            window.location.reload();
        };

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        return () => {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', handleChainChanged);
        };
    }, []);

    // Actualizar balance
    const updateBalance = async (address) => {
        if (!web3 || !address) return;
        
        try {
            const balance = await web3.eth.getBalance(address);
            const balanceInEther = web3.utils.fromWei(balance, 'ether');
            setBalance(parseFloat(balanceInEther).toFixed(4));
        } catch (error) {
            console.error('Error obteniendo balance:', error);
            setBalance('0');
        }
    };

    // Conectar wallet
    const connectWallet = async () => {
        if (!isInstalled) {
            window.open('https://metamask.io/download/', '_blank');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Solicitar acceso a la cuenta
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length > 0) {
                setAccount(accounts[0]);
                setIsConnected(true);

                // Obtener chainId actual
                const chainId = await window.ethereum.request({
                    method: 'eth_chainId'
                });
                setChainId(chainId);

                // Actualizar balance
                await updateBalance(accounts[0]);

                // Guardar en localStorage
                localStorage.setItem('walletConnected', 'true');
                localStorage.setItem('walletAddress', accounts[0]);

                return accounts[0];
            }
        } catch (error) {
            console.error('Error conectando wallet:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Desconectar wallet
    const disconnectWallet = () => {
        setAccount(null);
        setIsConnected(false);
        setBalance('0');
        setChainId(null);
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAddress');
    };

    // Cambiar a red específica
    const switchNetwork = async (networkKey) => {
        if (!isInstalled) return;

        const network = SUPPORTED_NETWORKS[networkKey];
        if (!network) {
            setError('Red no soportada');
            return;
        }

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: network.chainId }]
            });
        } catch (switchError) {
            // Si la red no está agregada, intentar agregarla
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: network.chainId,
                            chainName: network.name,
                            nativeCurrency: {
                                name: network.symbol,
                                symbol: network.symbol,
                                decimals: 18
                            },
                            rpcUrls: [network.rpcUrl],
                            blockExplorerUrls: [network.explorer]
                        }]
                    });
                } catch (addError) {
                    setError('Error agregando red');
                }
            } else {
                setError('Error cambiando de red');
            }
        }
    };

    // Firmar mensaje
    const signMessage = async (message) => {
        if (!account || !web3) {
            throw new Error('Wallet no conectada');
        }

        try {
            const signature = await web3.eth.personal.sign(
                message,
                account,
                '' // MetaMask ignorará la contraseña
            );
            return signature;
        } catch (error) {
            console.error('Error firmando mensaje:', error);
            throw error;
        }
    };

    // Firmar datos tipados (EIP-712)
    const signTypedData = async (typedData) => {
        if (!account) {
            throw new Error('Wallet no conectada');
        }

        try {
            const signature = await window.ethereum.request({
                method: 'eth_signTypedData_v4',
                params: [account, JSON.stringify(typedData)]
            });
            return signature;
        } catch (error) {
            console.error('Error firmando datos tipados:', error);
            throw error;
        }
    };

    // Verificar firma
    const verifySignature = async (message, signature) => {
        if (!web3) return false;

        try {
            const recoveredAddress = await web3.eth.personal.ecRecover(message, signature);
            return recoveredAddress.toLowerCase() === account.toLowerCase();
        } catch (error) {
            console.error('Error verificando firma:', error);
            return false;
        }
    };

    // Auto-conectar si estaba conectado previamente
    useEffect(() => {
        const autoConnect = async () => {
            const wasConnected = localStorage.getItem('walletConnected');
            if (wasConnected === 'true' && isInstalled) {
                try {
                    const accounts = await window.ethereum.request({
                        method: 'eth_accounts'
                    });
                    
                    if (accounts.length > 0) {
                        setAccount(accounts[0]);
                        setIsConnected(true);
                        
                        const chainId = await window.ethereum.request({
                            method: 'eth_chainId'
                        });
                        setChainId(chainId);
                        
                        await updateBalance(accounts[0]);
                    }
                } catch (error) {
                    console.error('Error en auto-conexión:', error);
                }
            }
        };

        autoConnect();
    }, [isInstalled]);

    // Obtener dirección corta para mostrar
    const getShortAddress = useCallback(() => {
        if (!account) return '';
        return `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
    }, [account]);

    // Verificar si está en la red correcta
    const isCorrectNetwork = useCallback(() => {
        return chainId && SUPPORTED_NETWORKS[chainId];
    }, [chainId]);

    return {
        // Estado
        account,
        chainId,
        isConnected,
        isInstalled,
        balance,
        error,
        loading,
        web3,
        
        // Métodos
        connectWallet,
        disconnectWallet,
        switchNetwork,
        signMessage,
        signTypedData,
        verifySignature,
        
        // Utilidades
        getShortAddress,
        isCorrectNetwork,
        currentNetwork: chainId ? SUPPORTED_NETWORKS[chainId] : null
    };
};

export default useMetaMask;