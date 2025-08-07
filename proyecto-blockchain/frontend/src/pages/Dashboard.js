import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const [contratos, setContratos] = useState([]);

    useEffect(() => {
        api.get('/contratos')
            .then(res => setContratos(res.data))
            .catch(() => alert('Error al cargar contratos'));
    }, []);

    return (
        <div>
            <h2>Mis Contratos</h2>
            <ul>
                {contratos.map(c => (
                    <li key={c.id}>
                        <Link to={`/contratos/${c.id}`}>{c.titulo}</Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Dashboard;
