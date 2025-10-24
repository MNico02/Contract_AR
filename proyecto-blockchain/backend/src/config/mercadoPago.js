// src/config/mercadoPago.js
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

export { client, Preference, Payment };
