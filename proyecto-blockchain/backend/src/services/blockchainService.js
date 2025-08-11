import Web3 from 'web3';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

// ABI del contrato (simplificado, en producción vendría del archivo compilado)
const CONTRACT_ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "_uuid", "type": "string"},
            {"internalType": "string", "name": "_ipfsHash", "type": "string"},
            {"internalType": "string", "name": "_hashOriginal", "type": "string"},
            {"internalType": "address", "name": "_consumidor", "type": "address"}
        ],
        "name": "crearContrato",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_uuid", "type": "string"},
            {"internalType": "bytes", "name": "_firma", "type": "bytes"}
        ],
        "name": "firmarComoProveedor",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_uuid", "type": "string"},
            {"internalType": "bytes", "name": "_firma", "type": "bytes"}
        ],
        "name": "firmarComoConsumidor",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
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
    },
    {
        "inputs": [{"internalType": "string", "name": "_uuid", "type": "string"}],
        "name": "estaCompletamenteFirmado",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": false, "internalType": "string", "name": "uuid", "type": "string"},
            {"indexed": false, "internalType": "string", "name": "ipfsHash", "type": "string"},
            {"indexed": false, "internalType": "address", "name": "proveedor", "type": "address"}
        ],
        "name": "ContratoCreado",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": false, "internalType": "string", "name": "uuid", "type": "string"},
            {"indexed": false, "internalType": "address", "name": "proveedor", "type": "address"}
        ],
        "name": "ContratoFirmadoPorProveedor",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": false, "internalType": "string", "name": "uuid", "type": "string"},
            {"indexed": false, "internalType": "address", "name": "consumidor", "type": "address"}
        ],
        "name": "ContratoFirmadoPorConsumidor",
        "type": "event"
    }
];

class BlockchainService {
    constructor() {
        // Configuración de la red (Polygon Mumbai Testnet por defecto)
        this.networkConfig = {
            polygon_testnet: {
                rpcUrl: 'https://rpc-mumbai.maticvigil.com',
                chainId: 80001,
                contractAddress: process.env.CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
                explorerUrl: 'https://mumbai.polygonscan.com'
            },
            polygon_mainnet: {
                rpcUrl: 'https://polygon-rpc.com',
                chainId: 137,
                contractAddress: process.env.CONTRACT_ADDRESS_MAINNET || '0x0000000000000000000000000000000000000000',
                explorerUrl: 'https://polygonscan.com'
            },
            localhost: {
                rpcUrl: 'http://localhost:8545',
                chainId: 1337,
                contractAddress: process.env.CONTRACT_ADDRESS_LOCAL || '0x0000000000000000000000000000000000000000',
                explorerUrl: ''
            }
        };

        this.currentNetwork = process.env.BLOCKCHAIN_NETWORK || 'polygon_testnet';
        this.initializeWeb3();
    }

    initializeWeb3() {
        try {
            const config = this.networkConfig[this.currentNetwork];
            this.web3 = new Web3(new Web3.providers.HttpProvider(config.rpcUrl));
            
            // Inicializar el contrato
            if (config.contractAddress !== '0x0000000000000000000000000000000000000000') {
                this.contract = new this.web3.eth.Contract(CONTRACT_ABI, config.contractAddress);
                logger.info(`Blockchain service inicializado en red: ${this.currentNetwork}`);
            } else {
                logger.warn('Dirección del contrato no configurada. Funcionalidad blockchain limitada.');
            }
        } catch (error) {
            logger.error('Error inicializando Web3:', error);
        }
    }

    // Calcular hash SHA256 de un archivo
    async calculateFileHash(fileBuffer) {
        const crypto = await import('crypto');
        const hash = crypto.createHash('sha256');
        hash.update(fileBuffer);
        return '0x' + hash.digest('hex');
    }

    // Firmar datos con una clave privada
    async signData(data, privateKey) {
        try {
            const signature = await this.web3.eth.accounts.sign(data, privateKey);
            return signature.signature;
        } catch (error) {
            logger.error('Error firmando datos:', error);
            throw error;
        }
    }

    // Verificar una firma
    async verifySignature(data, signature, expectedAddress) {
        try {
            const recoveredAddress = await this.web3.eth.accounts.recover(data, signature);
            return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
        } catch (error) {
            logger.error('Error verificando firma:', error);
            return false;
        }
    }

    // Crear un nuevo contrato en blockchain
    async createContract(uuid, ipfsHash, hashOriginal, proveedorAddress, consumidorAddress, privateKey) {
        try {
            if (!this.contract) {
                throw new Error('Contrato no inicializado');
            }

            const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
            const nonce = await this.web3.eth.getTransactionCount(account.address);
            
            const txData = this.contract.methods.crearContrato(
                uuid,
                ipfsHash,
                hashOriginal,
                consumidorAddress
            ).encodeABI();

            const gasPrice = await this.web3.eth.getGasPrice();
            const gasLimit = 500000;

            const tx = {
                from: account.address,
                to: this.contract.options.address,
                data: txData,
                gas: gasLimit,
                gasPrice: gasPrice,
                nonce: nonce,
                chainId: this.networkConfig[this.currentNetwork].chainId
            };

            const signedTx = await this.web3.eth.accounts.signTransaction(tx, privateKey);
            const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

            logger.info(`Contrato creado en blockchain. TX: ${receipt.transactionHash}`);
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed
            };
        } catch (error) {
            logger.error('Error creando contrato en blockchain:', error);
            throw error;
        }
    }

    // Firmar contrato como proveedor
    async signAsProvider(uuid, signature, privateKey) {
        try {
            if (!this.contract) {
                throw new Error('Contrato no inicializado');
            }

            const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
            const nonce = await this.web3.eth.getTransactionCount(account.address);
            
            const txData = this.contract.methods.firmarComoProveedor(uuid, signature).encodeABI();

            const gasPrice = await this.web3.eth.getGasPrice();
            const gasLimit = 300000;

            const tx = {
                from: account.address,
                to: this.contract.options.address,
                data: txData,
                gas: gasLimit,
                gasPrice: gasPrice,
                nonce: nonce,
                chainId: this.networkConfig[this.currentNetwork].chainId
            };

            const signedTx = await this.web3.eth.accounts.signTransaction(tx, privateKey);
            const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

            logger.info(`Contrato firmado por proveedor. TX: ${receipt.transactionHash}`);
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            logger.error('Error firmando como proveedor:', error);
            throw error;
        }
    }

    // Firmar contrato como consumidor
    async signAsConsumer(uuid, signature, privateKey) {
        try {
            if (!this.contract) {
                throw new Error('Contrato no inicializado');
            }

            const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
            const nonce = await this.web3.eth.getTransactionCount(account.address);
            
            const txData = this.contract.methods.firmarComoConsumidor(uuid, signature).encodeABI();

            const gasPrice = await this.web3.eth.getGasPrice();
            const gasLimit = 300000;

            const tx = {
                from: account.address,
                to: this.contract.options.address,
                data: txData,
                gas: gasLimit,
                gasPrice: gasPrice,
                nonce: nonce,
                chainId: this.networkConfig[this.currentNetwork].chainId
            };

            const signedTx = await this.web3.eth.accounts.signTransaction(tx, privateKey);
            const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

            logger.info(`Contrato firmado por consumidor. TX: ${receipt.transactionHash}`);
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            logger.error('Error firmando como consumidor:', error);
            throw error;
        }
    }

    // Obtener información del contrato desde blockchain
    async getContract(uuid) {
        try {
            if (!this.contract) {
                throw new Error('Contrato no inicializado');
            }

            const result = await this.contract.methods.obtenerContrato(uuid).call();
            
            return {
                ipfsHash: result.ipfsHash,
                hashOriginal: result.hashOriginal,
                proveedor: result.proveedor,
                consumidor: result.consumidor,
                timestampCreacion: new Date(result.timestampCreacion * 1000),
                timestampFirmaProveedor: result.timestampFirmaProveedor > 0 ? new Date(result.timestampFirmaProveedor * 1000) : null,
                timestampFirmaConsumidor: result.timestampFirmaConsumidor > 0 ? new Date(result.timestampFirmaConsumidor * 1000) : null,
                estado: this.parseEstado(result.estado)
            };
        } catch (error) {
            logger.error('Error obteniendo contrato de blockchain:', error);
            throw error;
        }
    }

    // Verificar si un contrato está completamente firmado
    async isFullySigned(uuid) {
        try {
            if (!this.contract) {
                return false;
            }

            return await this.contract.methods.estaCompletamenteFirmado(uuid).call();
        } catch (error) {
            logger.error('Error verificando estado de firma:', error);
            return false;
        }
    }

    // Parsear estado del contrato
    parseEstado(estadoNum) {
        const estados = ['CREADO', 'FIRMADO_PROVEEDOR', 'FIRMADO_AMBOS', 'CANCELADO', 'EN_DISPUTA'];
        return estados[estadoNum] || 'DESCONOCIDO';
    }

    // Generar una wallet nueva
    generateWallet() {
        const account = this.web3.eth.accounts.create();
        return {
            address: account.address,
            privateKey: account.privateKey
        };
    }

    // Obtener el balance de una dirección
    async getBalance(address) {
        try {
            const balance = await this.web3.eth.getBalance(address);
            return this.web3.utils.fromWei(balance, 'ether');
        } catch (error) {
            logger.error('Error obteniendo balance:', error);
            return '0';
        }
    }

    // Obtener URL del explorador para una transacción
    getTransactionUrl(txHash) {
        const config = this.networkConfig[this.currentNetwork];
        if (!config.explorerUrl) return null;
        return `${config.explorerUrl}/tx/${txHash}`;
    }

    // Verificar integridad del contrato
    async verifyContractIntegrity(uuid, fileBuffer) {
        try {
            // Obtener información del blockchain
            const blockchainData = await this.getContract(uuid);
            
            // Calcular hash del archivo actual
            const currentHash = await this.calculateFileHash(fileBuffer);
            
            // Comparar hashes
            const isValid = blockchainData.hashOriginal === currentHash;
            
            return {
                isValid,
                blockchainHash: blockchainData.hashOriginal,
                calculatedHash: currentHash,
                ipfsHash: blockchainData.ipfsHash,
                estado: blockchainData.estado
            };
        } catch (error) {
            logger.error('Error verificando integridad:', error);
            throw error;
        }
    }
}

// Exportar instancia única (Singleton)
const blockchainService = new BlockchainService();
export default blockchainService;