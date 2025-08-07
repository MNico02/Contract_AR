import axios from "axios";
import FormData from "form-data";

export async function uploadFileToIPFS(fileBuffer, fileName) {
    try {
        const formData = new FormData();
        formData.append("file", fileBuffer, { filename: fileName });

        const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
            maxBodyLength: Infinity,
            headers: {
                "Authorization": `Bearer ${process.env.PINATA_JWT}`,
                ...formData.getHeaders()
            }
        });

        const cid = res.data.IpfsHash;
        return {
            cid,
            url: `https://gateway.pinata.cloud/ipfs/${cid}`
        };
    } catch (error) {
        console.error("Error subiendo a IPFS (Pinata):", error.response?.data || error.message);
        throw new Error("Error al subir archivo a IPFS");
    }
}
