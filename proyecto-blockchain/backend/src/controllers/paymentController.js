import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import db from "../config/db.js";

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });


// Crear preferencia y guardar en DB como "pendiente"
export const createPreference = async (req, res) => {
    try {
        const { titulo, firmantes } = req.body;
        const usuarioId = req.usuario.id;

        console.log("createPreference: Body recibido:", req.body);
        console.log("createPreference: Usuario autenticado:", usuarioId);

        // 🔹 Determinar cantidad de firmantes
        let cantidadFirmantes = 0;
        if (Array.isArray(firmantes)) {
            cantidadFirmantes = firmantes.length;
        } else if (typeof firmantes === "string") {
            try {
                cantidadFirmantes = JSON.parse(firmantes).length;
            } catch {
                cantidadFirmantes = 0;
            }
        }

        // 🔹 Calcular monto desde la tabla gestiondecobros
        const monto = await calcularMontoContrato(cantidadFirmantes);
        console.log(`Monto calculado: ${monto} (Contrato + ${cantidadFirmantes} firmantes)`);
        const monto1=1;
        const preference = new Preference(client);

        const response = await preference.create({
            body: {
                items: [
                    {
                        title: titulo,
                        quantity: 1,
                        unit_price: Number(monto1),
                        currency_id: "ARS",
                    },
                ],
                back_urls: {
                    success: "http://localhost:3001/pagos/success",
                    failure: "http://localhost:3001/pagos/failure",
                    pending: "http://localhost:3001/pagos/pending",
                },
                //auto_return: "approved",
                metadata: {
                    usuarioId,
                },
            },
        });

        console.log("Preference creada en MP:", response);
        //
        const initPoint = response.init_point || response.body?.init_point;
        const sandboxInitPoint = response.sandbox_init_point || response.body?.sandbox_init_point || null;
        //
        const prefId = response.id || response.body?.id;
        if (!prefId || (!initPoint && !sandboxInitPoint)) {
            console.error("❌ No se obtuvo preferenceId o init_point:", response);
            return res.status(500).json({ error: "No se pudo obtener preferenceId o init_point" });
        }

        // Guardar en DB como pendiente
        await db.query(
            `INSERT INTO contratos_pagos
                 (usuario_id, mp_preference_id, monto, estado_id, moneda)
             VALUES ($1, $2, $3, 1, 'ARS')`,
            [usuarioId, prefId, monto]
        );

        // ´cuando no sea prueba dejar solo el init
        res.json({ id: prefId, init_point: initPoint, sandbox_init_point: sandboxInitPoint });
    } catch (error) {
        console.error("Error creando preferencia:", error);
        res.status(500).json({ error: "Error creando preferencia", detalle: error.message });
    }
};

// Webhook para actualizar pagos
export const webhook = async (req, res) => {
    try {
        console.log("Webhook recibido:");
        console.log("Headers:", req.headers);
        console.log("Body:", req.body);
        console.log("Query:", req.query);

        const { type, data } = req.query.type ? req.query : req.body;

        if (type === "payment") {
            const paymentClient = new Payment(client);
            const payment = await paymentClient.get({ id: data.id });

            console.log("Pago recibido desde MP:", JSON.stringify(payment, null, 2));

            const usuarioId = payment.metadata?.usuarioId || null;
            const prefId = payment.additional_info?.preference_id || null;

            const estado =
                payment.status === "approved" ? 2 :
                    payment.status === "rejected" ? 3 : 1;

            if (!usuarioId || !prefId) {
                console.error("No se encontró usuarioId o prefId en el pago:", {
                    usuarioId,
                    prefId
                });
                return res.sendStatus(400);
            }

            await db.query(
                `UPDATE contratos_pagos
                 SET mp_payment_id=$1, estado_id=$2, fecha_actualizacion=NOW()
                 WHERE usuario_id=$3 AND mp_preference_id=$4`,
                [
                    payment.id,
                    estado,
                    usuarioId,
                    prefId
                ]
            );

            console.log("contratos_pagos actualizado:", {
                usuarioId,
                prefId,
                estado
            });
        }

        res.sendStatus(200);
    } catch (err) {
        console.error("Error en webhook:", err);
        res.sendStatus(500);
    }
};


// Obtener el último pago del usuario (pendiente o aprobado sin contrato)
export const getUltimoPago = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const result = await db.query(
            `SELECT id, estado_id, mp_preference_id, monto, moneda, fecha_actualizacion
             FROM contratos_pagos
             WHERE usuario_id = $1
               AND contrato_id IS NULL   -- pago aún no vinculado a un contrato
               AND estado_id IN (1,2)    -- pendiente o aprobado
             ORDER BY fecha_creacion DESC
                 LIMIT 1`,
            [usuarioId]
        );

        if (result.rows.length === 0) {
            return res.json({ estado_id: 0 }); // 0 = sin pagos todavía
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("❌ Error consultando último pago:", err);
        res.status(500).json({ error: "Error consultando último pago" });
    }
};

// 🔹 Función auxiliar: calcular monto dinámico desde gestiondecobros
const calcularMontoContrato = async (cantidadFirmantes) => {
    const result = await db.query(
        `SELECT monto_contrato, monto_firmante
         FROM gestiondecobros
         ORDER BY fecha_actualizacion DESC
         LIMIT 1`
    );

    if (result.rows.length === 0) {
        throw new Error("No hay configuración de cobros en la base de datos.");
    }

    const { monto_contrato, monto_firmante } = result.rows[0];
    return Number(monto_contrato) + (cantidadFirmantes * Number(monto_firmante));
};
