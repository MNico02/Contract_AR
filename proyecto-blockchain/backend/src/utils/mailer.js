import nodemailer from "nodemailer";

// Configuración del transporte SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false, // true para puerto 465, false para 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Verificar conexión SMTP al iniciar
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Error verificando conexión SMTP:", error);
    } else {
        console.log("✅ Conexión SMTP exitosa, listo para enviar mails");
    }
});

// Función para enviar correos
export const sendMail = async (to, subject, html) => {
    try {
        console.log("📩 Enviando mail a:", to);
        const info = await transporter.sendMail({
            from: `"Contratos Blockchain" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });
        console.log("✅ Correo enviado: mailer.js", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ Error enviando correo:", error.message);
        console.error("Detalles completos:", error);
        throw error;
    }
};
