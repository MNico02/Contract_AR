import jwt from "jsonwebtoken";

export const verificarToken = (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ mensaje: "Acceso denegado. Token requerido." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ mensaje: "Token inválido o expirado." });
    }
};

export const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ mensaje: "No tienes permisos para esta acción." });
        }
        next();
    };
};
