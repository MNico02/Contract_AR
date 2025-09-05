import * as signerModel from "../models/signerModel.js";

/**
 * Obtener firmantes por contrato (ID interno numérico)
 * GET /api/firmantes/contratos/:contratoId/firmantes
 */
export const getSignersByContract = async (req, res) => {
    try {
        const { contratoId } = req.params;
        const idNum = Number(contratoId);
        if (!Number.isInteger(idNum)) {
            return res.status(400).json({ error: "contratoId inválido" });
        }
        const signers = await signerModel.getSignersByContractId(idNum);
        res.json(signers);
    } catch (error) {
        console.error("Error al obtener firmantes:", error);
        res.status(500).json({ error: "Error al obtener firmantes" });
    }
};


/**
 * Agregar firmante
 * POST /api/firmantes
 * body: { contrato_id, usuario_id?, email, nombre_completo, rol_firmante? }
 */
export const addSigner = async (req, res) => {
    try {
        const { contrato_id, usuario_id, email, nombre_completo, rol_firmante } = req.body;

        if (!contrato_id || !email || !nombre_completo) {
            return res.status(400).json({ error: "Datos incompletos para firmante" });
        }

        // Evitar duplicar firmantes por contrato/email (además de la constraint única en DB)
        const exists = await signerModel.findSignerByContractAndEmail(contrato_id, email);
        if (exists) {
            return res.status(409).json({ error: "El firmante ya existe para este contrato" });
        }

        const newSigner = await signerModel.addSigner({
            contrato_id,
            usuario_id: usuario_id || null,
            email,
            nombre_completo,
            rol_firmante: rol_firmante || null,
        });
        res.status(201).json(newSigner);
    } catch (error) {
        console.error("Error al agregar firmante:", error);
        res.status(500).json({ error: "Error al agregar firmante" });
    }
};


/**
 * Actualizar estado de firma (uso administrativo)
 * PATCH /api/firmantes/:id/estado
 * body: { estado_id }
 */
export const updateSignerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado_id } = req.body;

        if (!estado_id) {
            return res.status(400).json({ error: "Debe especificar estado_id" });
        }

        const updatedSigner = await signerModel.updateSignerStatus(id, estado_id);
        res.json(updatedSigner);
    } catch (error) {
        console.error("Error al actualizar estado del firmante:", error);
        res.status(500).json({ error: "Error al actualizar estado del firmante" });
    }
};
/**
 * Listar contratos pendientes de firma del usuario autenticado
 * GET /api/firmantes/mis-pendientes
 */
export const getMyPendingSignings = async (req, res) => {
    try {
        const user = req.usuario; // provisto por tu middleware verificarToken
        if (!user) return res.status(401).json({ error: "No autenticado" });

        const { id: userId, email } = user;
        console.log('>>> req.usuario', req.usuario);
        const rows = await signerModel.getMyPendingSignings(userId || null, email || null);
        return res.json(rows);
    } catch (err) {
        console.error("Error listando pendientes:", err);
        return res.status(500).json({ error: "Error listando pendientes" });
    }
};
export const getMySignings = async (req, res) => {
    try {
        const userId = req.usuario.id;
        const email = req.usuario.email;
        const { estado } = req.query; // opcional
        const rows = await signerModel.getMySignings({ userId, email, estado });
        res.json(rows);
    } catch (e) {
        console.error("Error getMySignings:", e);
        res.status(500).json({ error: "Error al obtener mis contratos" });
    }
}
export const signContract = async (req, res) => {
    try {
        const user = req.usuario; // provisto por tu middleware verificarToken
        if (!user) return res.status(401).json({ error: "No autenticado" });

        const { id: userId, email } = user;
        const { uuid } = req.params;
        if (!uuid) return res.status(400).json({ error: "Falta UUID de contrato" });

        const result = await signerModel.signContractByUuidForUser(userId || null, email || null, uuid);

        // Respuestas consistentes
        if (result.status === "no_wallet") {
            return res.status(403).json({
                error: "Este usuario no tiene una wallet vinculada. Vinculá tu wallet para poder firmar."
            });
        }
        if (result.status === "already_signed") {
            return res.status(409).json({ error: "Ya firmaste este contrato." });
        }
        if (result.status === "not_assigned") {
            return res.status(404).json({ error: "No estás asignado como firmante de este contrato" });
        }
        if (result.status === "canceled") {
            return res.status(409).json({ error: "El contrato está cancelado" });
        }
        if (result.status === "invalid_state") {
            return res.status(409).json({ error: "La firma no está en estado pendiente" });
        }

        return res.json({
            ok: true,
            pendientes: result.pendientes,
            message:
                result.status === "already_signed"
                    ? "Ya habías firmado este contrato."
                    : result.pendientes === 0
                        ? "¡Contrato completado! Todas las firmas registradas."
                        : "Firma registrada. Aún hay firmas pendientes.",
        });
    } catch (err) {
        console.error("Error al firmar contrato:", err);
        return res.status(500).json({ error: "Error al firmar contrato" });
    }
};