// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ContractRegistry {
    
    enum EstadoContrato {
        CREADO,
        FIRMADO_PROVEEDOR,
        FIRMADO_AMBOS,
        CANCELADO,
        EN_DISPUTA
    }
    
    struct Contrato {
        string uuid;
        string ipfsHash;
        string hashOriginal;
        address proveedor;
        address consumidor;
        bytes firmaProveedor;
        bytes firmaConsumidor;
        uint256 timestampCreacion;
        uint256 timestampFirmaProveedor;
        uint256 timestampFirmaConsumidor;
        EstadoContrato estado;
    }
    
    // Mapping de UUID a Contrato
    mapping(string => Contrato) public contratos;
    
    // Mapping de dirección a lista de UUIDs de contratos
    mapping(address => string[]) public contratosPorUsuario;
    
    // Eventos
    event ContratoCreado(string uuid, string ipfsHash, address proveedor);
    event ContratoFirmadoPorProveedor(string uuid, address proveedor);
    event ContratoFirmadoPorConsumidor(string uuid, address consumidor);
    event EstadoContratoActualizado(string uuid, EstadoContrato nuevoEstado);
    
    // Modificadores
    modifier soloProveedor(string memory _uuid) {
        require(contratos[_uuid].proveedor == msg.sender, "Solo el proveedor puede ejecutar esta funcion");
        _;
    }
    
    modifier soloConsumidor(string memory _uuid) {
        require(contratos[_uuid].consumidor == msg.sender, "Solo el consumidor puede ejecutar esta funcion");
        _;
    }
    
    modifier contratoExiste(string memory _uuid) {
        require(bytes(contratos[_uuid].uuid).length > 0, "El contrato no existe");
        _;
    }
    
    // Crear un nuevo contrato
    function crearContrato(
        string memory _uuid,
        string memory _ipfsHash,
        string memory _hashOriginal,
        address _consumidor
    ) public {
        require(bytes(contratos[_uuid].uuid).length == 0, "El contrato ya existe");
        require(bytes(_uuid).length > 0, "UUID invalido");
        require(bytes(_ipfsHash).length > 0, "IPFS hash invalido");
        require(_consumidor != address(0), "Direccion del consumidor invalida");
        require(_consumidor != msg.sender, "El proveedor y consumidor no pueden ser la misma persona");
        
        Contrato memory nuevoContrato = Contrato({
            uuid: _uuid,
            ipfsHash: _ipfsHash,
            hashOriginal: _hashOriginal,
            proveedor: msg.sender,
            consumidor: _consumidor,
            firmaProveedor: "",
            firmaConsumidor: "",
            timestampCreacion: block.timestamp,
            timestampFirmaProveedor: 0,
            timestampFirmaConsumidor: 0,
            estado: EstadoContrato.CREADO
        });
        
        contratos[_uuid] = nuevoContrato;
        contratosPorUsuario[msg.sender].push(_uuid);
        contratosPorUsuario[_consumidor].push(_uuid);
        
        emit ContratoCreado(_uuid, _ipfsHash, msg.sender);
    }
    
    // Proveedor firma el contrato
    function firmarComoProveedor(
        string memory _uuid,
        bytes memory _firma
    ) public contratoExiste(_uuid) soloProveedor(_uuid) {
        require(contratos[_uuid].estado == EstadoContrato.CREADO, "El contrato no esta en estado correcto para firmar");
        require(_firma.length > 0, "Firma invalida");
        
        contratos[_uuid].firmaProveedor = _firma;
        contratos[_uuid].timestampFirmaProveedor = block.timestamp;
        contratos[_uuid].estado = EstadoContrato.FIRMADO_PROVEEDOR;
        
        emit ContratoFirmadoPorProveedor(_uuid, msg.sender);
        emit EstadoContratoActualizado(_uuid, EstadoContrato.FIRMADO_PROVEEDOR);
    }
    
    // Consumidor firma el contrato
    function firmarComoConsumidor(
        string memory _uuid,
        bytes memory _firma
    ) public contratoExiste(_uuid) soloConsumidor(_uuid) {
        require(contratos[_uuid].estado == EstadoContrato.FIRMADO_PROVEEDOR, "El proveedor debe firmar primero");
        require(_firma.length > 0, "Firma invalida");
        
        contratos[_uuid].firmaConsumidor = _firma;
        contratos[_uuid].timestampFirmaConsumidor = block.timestamp;
        contratos[_uuid].estado = EstadoContrato.FIRMADO_AMBOS;
        
        emit ContratoFirmadoPorConsumidor(_uuid, msg.sender);
        emit EstadoContratoActualizado(_uuid, EstadoContrato.FIRMADO_AMBOS);
    }
    
    // Obtener información del contrato
    function obtenerContrato(string memory _uuid) public view returns (
        string memory ipfsHash,
        string memory hashOriginal,
        address proveedor,
        address consumidor,
        uint256 timestampCreacion,
        uint256 timestampFirmaProveedor,
        uint256 timestampFirmaConsumidor,
        EstadoContrato estado
    ) {
        Contrato memory contrato = contratos[_uuid];
        require(bytes(contrato.uuid).length > 0, "El contrato no existe");
        
        return (
            contrato.ipfsHash,
            contrato.hashOriginal,
            contrato.proveedor,
            contrato.consumidor,
            contrato.timestampCreacion,
            contrato.timestampFirmaProveedor,
            contrato.timestampFirmaConsumidor,
            contrato.estado
        );
    }
    
    // Verificar si un contrato está completamente firmado
    function estaCompletamenteFirmado(string memory _uuid) public view returns (bool) {
        return contratos[_uuid].estado == EstadoContrato.FIRMADO_AMBOS;
    }
    
    // Obtener todos los contratos de un usuario
    function obtenerContratosDeUsuario(address _usuario) public view returns (string[] memory) {
        return contratosPorUsuario[_usuario];
    }
    
    // Cancelar un contrato (solo si no está completamente firmado)
    function cancelarContrato(string memory _uuid) public contratoExiste(_uuid) {
        require(
            contratos[_uuid].proveedor == msg.sender || contratos[_uuid].consumidor == msg.sender,
            "Solo las partes involucradas pueden cancelar"
        );
        require(
            contratos[_uuid].estado != EstadoContrato.FIRMADO_AMBOS,
            "No se puede cancelar un contrato completamente firmado"
        );
        
        contratos[_uuid].estado = EstadoContrato.CANCELADO;
        emit EstadoContratoActualizado(_uuid, EstadoContrato.CANCELADO);
    }
    
    // Marcar contrato en disputa
    function marcarEnDisputa(string memory _uuid) public contratoExiste(_uuid) {
        require(
            contratos[_uuid].proveedor == msg.sender || contratos[_uuid].consumidor == msg.sender,
            "Solo las partes involucradas pueden marcar en disputa"
        );
        
        contratos[_uuid].estado = EstadoContrato.EN_DISPUTA;
        emit EstadoContratoActualizado(_uuid, EstadoContrato.EN_DISPUTA);
    }
}