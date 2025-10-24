//Qué hace este helper
//Conecta el backend a la red blockchain (ej: Polygon Amoy).
//Permite leer o enviar transacciones usando el ABI y el address de tu contrato.
//Se usa más adelante cuando:
//Querés verificar si un contrato fue firmado (obtenerContrato).
//O registrar algo automáticamente desde backend.

import { ethers } from "ethers";
import CONTRACT_ABI from "./ContractRegistry.abi.json" assert { type: "json" };

//  Variables de entorno (ajustá con tu red y contrato)
const RPC_URL = process.env.RPC_URL || "https://polygon-amoy.g.alchemy.com/v2/TU_API_KEY";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS; // tu contrato desplegado
const PRIVATE_KEY = process.env.PRIVATE_KEY; // del wallet del backend (si firmás desde backend)

if (!RPC_URL || !CONTRACT_ADDRESS) {
  console.warn("⚠️ Faltan RPC_URL o CONTRACT_ADDRESS en variables de entorno.");
}

// Provider y wallet
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Si querés ejecutar llamadas “read-only”, podés exportar el contract con provider
const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

// Si querés que el backend firme (en caso de automatizar), agregás wallet
let signerContract = null;
if (PRIVATE_KEY) {
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  signerContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
}

export default {
  provider,
  readOnlyContract,
  signerContract,
};
