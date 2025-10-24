// src/blockchain/contract.js
import { ethers } from "ethers";
import CONTRACT_ABI from "./ContractRegistry.abi.json";

// Usa variables de entorno del front:
// - Vite: import.meta.env.VITE_CONTRACT_ADDRESS
// - CRA:  process.env.REACT_APP_CONTRACT_ADDRESS
const CONTRACT_ADDRESS =
    (import.meta && import.meta.env && import.meta.env.VITE_CONTRACT_ADDRESS) ||
    process.env.REACT_APP_CONTRACT_ADDRESS;

function assertMetaMask() {
    if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("MetaMask no detectado en el navegador.");
    }
}

export async function getProvider() {
    assertMetaMask();
    const provider = new ethers.BrowserProvider(window.ethereum);
    return provider;
}

export async function getSigner() {
    const provider = await getProvider();
    await provider.send("eth_requestAccounts", []); // solicita conexión
    return await provider.getSigner();
}

export function getContract(signerOrProvider) {
    if (!CONTRACT_ADDRESS) {
        throw new Error("Falta CONTRACT_ADDRESS en variables de entorno del frontend.");
    }
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
}

// (Opcional) asegurar red por chainId (hex). Ej: Polygon mainnet '0x89', testnet '0x13881' (o la que uses)
export async function ensureNetwork(chainIdHex) {
    assertMetaMask();
    const provider = await getProvider();
    const net = await provider.getNetwork();
    const current = "0x" + net.chainId.toString(16);
    if (current.toLowerCase() === chainIdHex.toLowerCase()) return;

    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainIdHex }],
        });
    } catch (e) {
        // Si la red no está agregada, podrías pedir wallet_addEthereumChain aquí.
        throw e;
    }
}
