import multer from 'multer';
import path from 'path';

// Configuración de almacenamiento en memoria (no se guarda en disco)
const storage = multer.memoryStorage();

// Filtro para aceptar solo PDF
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf') {
        return cb(new Error('Solo se permiten archivos PDF'), false);
    }
    cb(null, true);
};

export const upload = multer({ storage, fileFilter });
