import jwt from "jsonwebtoken";

/** Extrae token de Authorization o cookie (opcional) */
function getTokenFromRequest(req) {
    const auth = req.headers["authorization"];
    if (auth) {
        const [scheme, token] = auth.split(" ");
        if (scheme?.toLowerCase() === "bearer" && token) return token;
    }
    // Opcional: permitir token por cookie
    if (req.cookies?.token) return req.cookies.token;
    return null;
}

export const verificarToken = (req, res, next) => {
    const token = getTokenFromRequest(req);
    if (!token) {
        return res.status(401).json({ mensaje: "Acceso denegado. Token requerido." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            clockTolerance: 5 // segundos de tolerancia por desfase horario
        });
        // decoded = { id, uuid, rol, iat, exp }
        req.usuario = decoded;
        return next();
    } catch (error) {
        // Diferenciar expirado para UX
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ mensaje: "Token expirado. Vuelve a iniciar sesión." });
        }
        return res.status(401).json({ mensaje: "Token inválido." });
    }
};

export const verificarRol = (rolesPermitidos = []) => {
    return (req, res, next) => {
        // Si no pasó por verificarToken, req.usuario no existe
        if (!req.usuario?.rol) {
            return res.status(401).json({ mensaje: "Acceso denegado." });
        }
        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ mensaje: "No tienes permisos para esta acción." });
        }
        return next();
    };
};
