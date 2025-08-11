import Joi from 'joi';

export const validateContractCreate = (data) => {
    const schema = Joi.object({
        titulo: Joi.string().min(3).max(255).required(),
        descripcion: Joi.string().min(10).max(1000).required(),
        contenido: Joi.string().allow(''),
        blockchain_network: Joi.string().valid('polygon', 'ethereum', 'binance', 'avalanche'),
        fecha_vencimiento: Joi.date().iso().allow(null),
        tipo_contrato: Joi.string().valid('servicio', 'compraventa', 'alquiler', 'laboral', 'confidencialidad', 'otro'),
        firmantes: Joi.string() // JSON string de firmantes
    });
    
    return schema.validate(data);
};

export const validateContractUpdate = (data) => {
    const schema = Joi.object({
        titulo: Joi.string().min(3).max(255),
        descripcion: Joi.string().min(10).max(1000),
        estado_id: Joi.number().integer().min(1).max(4)
    });
    
    return schema.validate(data);
};

export const validateContractSearch = (query) => {
    const schema = Joi.object({
        search: Joi.string().allow(''),
        estado: Joi.string().valid('borrador', 'pendiente_firmas', 'firmado', 'cancelado', 'todos'),
        network: Joi.string().valid('polygon', 'ethereum', 'binance', 'avalanche'),
        creador_id: Joi.number().integer(),
        fecha_desde: Joi.date().iso(),
        fecha_hasta: Joi.date().iso(),
        page: Joi.number().integer().min(1),
        limit: Joi.number().integer().min(1).max(100)
    });
    
    return schema.validate(query);
};