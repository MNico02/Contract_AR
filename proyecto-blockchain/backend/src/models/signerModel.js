import pool from "../config/db.js";
const stateCache = {
    estados_firma: new Map(),        // 'pendiente' | 'firmado' | 'rechazado'
    estados_contrato: new Map(),     // 'borrador' | 'pendiente_firmas' | 'firmado' | 'cancelado'
};
async function getEstadoId(clientOrPool, tabla, nombre) {
    const cache = stateCache[tabla];
    if (cache.has(nombre)) return cache.get(nombre);

    const { rows } = await clientOrPool.query(
        `SELECT id FROM ${tabla} WHERE nombre = $1 LIMIT 1`,
        [nombre]
    );
    if (!rows[0]) throw new Error(`Estado no encontrado: ${tabla}.${nombre}`);
    cache.set(nombre, rows[0].id);
    return rows[0].id;
}
// Obtener todos los firmantes de un contrato (ID interno)
export const getSignersByContractId = async (contratoId) => {
    const result = await pool.query(
        `
            SELECT f.id, f.email, f.nombre_completo, f.rol_firmante,
                   ef.nombre AS estado, f.fecha_invitacion, f.fecha_firma
            FROM firmantes f
                     JOIN estados_firma ef ON f.estado_id = ef.id
            WHERE f.contrato_id = $1
        `,
        [contratoId]
    );
    return result.rows;
};

// Agregar un firmante
const normalizeEmail = (e) => (e || "").trim();

export const addSigner = async ({ contrato_id, usuario_id, email, nombre_completo, rol_firmante }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const emailNorm = normalizeEmail(email);

        // Si no viene usuario_id, buscálo por email (case-insensitive)
        let userId = usuario_id || null;
        if (!userId && emailNorm) {
            const u = await client.query(
                `SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1) LIMIT 1`,
                [emailNorm]
            );
            if (u.rows[0]) userId = u.rows[0].id;
        }

        const result = await client.query(
            `
      INSERT INTO firmantes (contrato_id, usuario_id, email, nombre_completo, rol_firmante)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, contrato_id, usuario_id, email, nombre_completo, rol_firmante, estado_id
      `,
            [contrato_id, userId, emailNorm, nombre_completo, rol_firmante]
        );

        await client.query("COMMIT");
        return result.rows[0];
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
};

// Actualizar estado de firma (administrativo)
export const updateSignerStatus = async (id, estado_id) => {
    const result = await pool.query(
        `
            UPDATE firmantes
            SET estado_id = $1, fecha_firma = CURRENT_TIMESTAMP
            WHERE id = $2
                RETURNING id, contrato_id, email, nombre_completo, estado_id, fecha_firma
        `,
        [estado_id, id]
    );
    return result.rows[0];
};
// Check rápido de unicidad por contrato/email
export const findSignerByContractAndEmail = async (contrato_id, email) => {
    const result = await pool.query(
        `SELECT 1 FROM firmantes WHERE contrato_id = $1 AND email = $2 LIMIT 1`,
        [contrato_id, email]
    );
    return result.rowCount > 0;
};

// Listar pendientes de firma del usuario actual (por usuario_id o email)
export const getMyPendingSignings = async (userId, email) => {
    const result = await pool.query(
        `
            SELECT
                c.uuid AS contrato_uuid, c.titulo, c.descripcion, c.ipfs_url, c.fecha_creacion,
                ec.nombre AS estado_contrato,
                (u_creador.nombre || ' ' || u_creador.apellido) AS creador,
                f.id AS firmante_id, f.email, f.usuario_id, ef.nombre AS estado_firma
            FROM firmantes f
                     JOIN contratos c             ON c.id = f.contrato_id
                     LEFT JOIN usuarios u_creador ON u_creador.id = c.creador_id
                     JOIN estados_firma ef        ON ef.id = f.estado_id
                     JOIN estados_contrato ec     ON ec.id = c.estado_id
            WHERE (
                ($1::int IS NOT NULL AND f.usuario_id = $1)
                    OR ($2::text IS NOT NULL AND LOWER(TRIM(f.email)) = LOWER(TRIM($2)))
                )
              AND ef.nombre = 'pendiente'
            ORDER BY c.fecha_creacion DESC
        `,
        [userId, email]
    );
    return result.rows;
};

// Firmar contrato por UUID para el usuario autenticado (transacción)
export const signContractByUuidForUser = async (userId, email, uuid) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const firmaPendienteId   = await getEstadoId(client, "estados_firma", "pendiente");
        const firmaFirmadoId     = await getEstadoId(client, "estados_firma", "firmado");
        const contratoPendId     = await getEstadoId(client, "estados_contrato", "pendiente_firmas");
        const contratoFirmadoId  = await getEstadoId(client, "estados_contrato", "firmado");
        const contratoCancelId   = await getEstadoId(client, "estados_contrato", "cancelado");

        // 1) Traer el firmante vinculado al contrato (por uuid) y bloquear fila
        const qFirmante = `
      SELECT f.id, f.estado_id, f.usuario_id, f.email, f.contrato_id,
             c.id AS contrato_id, c.uuid AS contrato_uuid, c.estado_id AS contrato_estado
      FROM firmantes f
      JOIN contratos c ON c.id = f.contrato_id
      WHERE c.uuid = $1 AND (f.usuario_id = $2 OR f.email = $3)
      FOR UPDATE
    `;
        const firmante = (await client.query(qFirmante, [uuid, userId, email])).rows[0];

        if (!firmante) {
            await client.query("ROLLBACK");
            return { status: "not_assigned" };
        }

        if (firmante.contrato_estado === contratoCancelId) {
            await client.query("ROLLBACK");
            return { status: "canceled" };
        }

        // Si coincide por email y falta el usuario_id, lo asociamos
        if (!firmante.usuario_id && userId) {
            await client.query(
                `UPDATE firmantes SET usuario_id = $1 WHERE id = $2`,
                [userId, firmante.id]
            );
        }

        // Idempotencia: ya firmado
        if (firmante.estado_id === firmaFirmadoId) {
            await client.query("COMMIT");
            return { status: "already_signed", pendientes: undefined };
        }

        if (firmante.estado_id !== firmaPendienteId) {
            await client.query("ROLLBACK");
            return { status: "invalid_state" };
        }

        // 2) Marcar firma
        await client.query(
            `UPDATE firmantes SET estado_id = $1, fecha_firma = NOW() WHERE id = $2`,
            [firmaFirmadoId, firmante.id]
        );

        // 3) ¿Quedan pendientes?
        const agg = await client.query(
            `
      SELECT
        COUNT(*) FILTER (WHERE estado_id = $1) AS pendientes,
        COUNT(*) AS total
      FROM firmantes
      WHERE contrato_id = $2
      `,
            [firmaPendienteId, firmante.contrato_id]
        );
        const pendientes = parseInt(agg.rows[0].pendientes, 10);

        // 4) Actualizar estado del contrato
        if (pendientes === 0) {
            await client.query(
                `UPDATE contratos SET estado_id = $1, fecha_firmado = NOW() WHERE id = $2`,
                [contratoFirmadoId, firmante.contrato_id]
            );
        } else if (firmante.contrato_estado !== contratoPendId) {
            await client.query(
                `UPDATE contratos SET estado_id = $1 WHERE id = $2`,
                [contratoPendId, firmante.contrato_id]
            );
        }

        // 5) Auditoría
        await client.query(
            `
      INSERT INTO auditoria_eventos (entidad, entidad_id, usuario_id, accion, detalle)
      VALUES ($1, $2, $3, $4, $5)
      `,
            [
                "contratos",
                uuid, // entidad_id es UUID en tu esquema
                userId || null,
                "firmar",
                JSON.stringify({
                    contrato_uuid: uuid,
                    firmante_id: firmante.id,
                    resultado: pendientes === 0 ? "contrato_completado" : "firma_registrada",
                }),
            ]
        );

        await client.query("COMMIT");
        return { status: "ok", pendientes };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};
