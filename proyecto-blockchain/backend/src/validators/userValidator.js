import Joi from 'joi';

export const validateUserUpdate = (data) => {
    const schema = Joi.object({
        nombre: Joi.string().min(2).max(100),
        apellido: Joi.string().min(2).max(100),
        email: Joi.string().email(),
        telefono: Joi.string().allow('').max(20)
    });
    
    return schema.validate(data);
};

export const validatePasswordChange = (data) => {
    const schema = Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string().min(8).required()
            .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
            .message('La contraseña debe contener al menos una mayúscula, una minúscula y un número')
    });
    
    return schema.validate(data);
};

export const validateUserCreate = (data) => {
    const schema = Joi.object({
        nombre: Joi.string().min(2).max(100).required(),
        apellido: Joi.string().min(2).max(100).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required()
            .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
            .message('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
        telefono: Joi.string().allow('').max(20),
        ol_id: Joi.number().integer().min(1).max(2) // 1=admin, 2=usuario
    });
    
    return schema.validate(data);
};