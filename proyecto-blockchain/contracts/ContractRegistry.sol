// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ContractRegistryV2 {
    struct ContractData {
        string ipfsHash;
        string fileHash;
        bytes32 cumulativeHash;
        address[] signers;
        uint256 createdAt;
    }

    mapping(string => ContractData) private contracts;

    event ContractCreated(string uuid, string ipfsHash, bytes32 rootHash, address creator);
    event ContractSigned(string uuid, bytes32 newHash, address signer);

    function createContract(
        string memory uuid,
        string memory ipfsHash,
        string memory fileHash
    ) public {
        require(bytes(contracts[uuid].ipfsHash).length == 0, "Ya existe");

        bytes32 rootHash = keccak256(abi.encodePacked(ipfsHash, msg.sender));

        contracts[uuid].ipfsHash = ipfsHash;
        contracts[uuid].fileHash = fileHash;
        contracts[uuid].cumulativeHash = rootHash;
        contracts[uuid].createdAt = block.timestamp;
        contracts[uuid].signers.push(msg.sender);

        emit ContractCreated(uuid, ipfsHash, rootHash, msg.sender);
    }

    function signContract(string memory uuid) public {
        require(bytes(contracts[uuid].ipfsHash).length != 0, "No existe");

        for (uint i = 0; i < contracts[uuid].signers.length; i++) {
            require(contracts[uuid].signers[i] != msg.sender, "Ya firmo");
        }

        // 🔗 Concatenar la firma con el hash acumulado anterior
        bytes32 newHash = keccak256(
            abi.encodePacked(contracts[uuid].cumulativeHash, msg.sender)
        );

        contracts[uuid].cumulativeHash = newHash;
        contracts[uuid].signers.push(msg.sender);

        emit ContractSigned(uuid, newHash, msg.sender);
    }

    function getContract(string memory uuid)
        public
        view
        returns (
            string memory,
            string memory,
            bytes32,
            address[] memory,
            uint256
        )
    {
        ContractData storage c = contracts[uuid];
        return (c.ipfsHash, c.fileHash, c.cumulativeHash, c.signers, c.createdAt);
    }
}
