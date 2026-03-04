# ⚖️ Contract_AR - Plataforma de Contratos Inteligentes (Web3 / LegalTech)

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Polygon](https://img.shields.io/badge/Polygon-8247E5?style=for-the-badge&logo=polygon&logoColor=white)
![IPFS](https://img.shields.io/badge/IPFS-65C2CB?style=for-the-badge&logo=ipfs&logoColor=white)

Contract_AR es una plataforma digital innovadora que fusiona el ámbito legal con la tecnología blockchain descentralizada. Permite la generación, firma electrónica y almacenamiento de contratos inteligentes utilizando la red Polygon e IPFS , garantizando la integridad, inmutabilidad y autenticidad de los documentos sin necesidad de intermediarios (como escribanos o notarios).

## ✨ Características Principales

* **Firmas Digitales Descentralizadas:** Integración nativa con wallets Web3 (como MetaMask y TrustWallet) para realizar la firma de contratos mediante validación de claves privada.
* **Almacenamiento Inmutable (IPFS):** Los contratos generados se suben a la red IPFS (InterPlanetary File System), generando un Hash único que asegura que el documento jamás pueda ser alterado tras su firma.
* **Pasarela de Pagos:** Integración con la API de Mercado Pago para gestionar el cobro por la generación de cada contrato (Modelo Pay-per-contract).
* **Validez Legal (Cumplimiento Argentina):** Arquitectura diseñada para cumplir con la Ley 25.506 de Firma Digital, el Código Civil y Comercial para contratos electrónicos, y la Ley 25.326 de Protección de Datos.
* **Gestión Documental Completa:** Trazabilidad de documentos con UUID único , visualización de historial de firmas  y exportación final a formato PDF.

## 💻 Stack Tecnológico y Arquitectura

El proyecto utiliza una arquitectura híbrida (Off-chain / On-chain):

* **Frontend:** React (SPA intuitiva y responsiva).
* **Backend:** Node.js con el framework Express.js.
* **Base de Datos (Off-chain):** PostgreSQL (para la gestión relacional de perfiles de usuario y metadatos).
* **Ecosistema Web3 (On-chain):**
  * **Red Blockchain:** Polygon Network (Elegida por su escalabilidad y bajos costos de transacción).
  * **Almacenamiento:** Protocolo IPFS.
  * **Autenticación:** Wallets compatibles con EVM (MetaMask).

## 🚀 Flujo de Uso (Smart Contract Lifecycle)

1. **Creación:** El Proveedor se autentica, sube/redacta el contrato y abona el arancel vía Mercado Pago.
2. **Despliegue:** El documento se consolida en IPFS, obteniendo su Hash inmutable.
3. **Firma Proveedor:** Se realiza la primera firma digital interactuando con la Wallet.
4. **Firma Consumidor:** La contraparte recibe la notificación, verifica la integridad del contrato mediante el hash y firma digitalmente para cerrar el acuerdo.

## 👨‍💻 Autor

**Nicolás Moresco**
* Portfolio / Contacto: nicolasmoresco02@gmail.com
