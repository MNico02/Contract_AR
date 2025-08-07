import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/api';

const ContratoDetalle = () => {
    const { id } = useParams();
    const [contrato, setContrato] = useState(null);

    useEffect(() => {
        api.get(`/contratos/${id}`)
            .then(res => setContrato(res.data))
            .catch(() => alert('No se pudo cargar el contrato'));
    }, [id]);

    if (!contrato) return <p>Cargando...</p>;

    return (
        <div>
            <h2>{contrato.titulo}</h2>
            <p>{contrato.descripcion}</p>
            <p>Estado: {contrato.estado}</p>
            <p>Fecha: {new Date(contrato.fecha_creacion).toLocaleString()}</p>
            <p>Creado por: {contrato.creador}</p>
        </div>
    );
};

export default ContratoDetalle;
