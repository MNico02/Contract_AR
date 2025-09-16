import React, { useEffect, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
    LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer
} from "recharts";

const Adminkpisales = () => {
    const [ingresos, setIngresos] = useState([]);
    const [conversion, setConversion] = useState([]);
    const [pendientes, setPendientes] = useState({});
    const [clientes, setClientes] = useState([]);

    useEffect(() => {
        fetch("http://localhost:3000/api/kpi/ingresos")
            .then(res => res.json())
            .then(setIngresos);

        fetch("http://localhost:3000/api/kpi/conversion")
            .then(res => res.json())
            .then(setConversion);

        fetch("http://localhost:3000/api/kpi/pendientes")
            .then(res => res.json())
            .then(setPendientes);

        fetch("http://localhost:3000/api/kpi/clientes")
            .then(res => res.json())
            .then(setClientes);
    }, []);

    return (
        <div className="container-fluid py-4">
            <h3 className="fw-bold mb-4">📊 KPI de Ventas - Contratos</h3>

            <div className="row">
                {/* 1. Ingresos mensuales */}
                <div className="col-md-6 mb-4">
                    <div className="card shadow-sm">
                        <div className="card-header">Ingresos mensuales</div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={ingresos}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="mes"
                                        tickFormatter={(val) =>
                                            new Date(val).toLocaleDateString("es-AR", { year: "numeric", month: "short" })
                                        }
                                    />
                                    <YAxis
                                        tickFormatter={(val) => `$${val.toLocaleString("es-AR")}`}
                                        label={{

                                            angle: -90,
                                            position: "insideLeft",
                                            style: { textAnchor: "middle", fontSize: 12, fill: "#333" }
                                        }}
                                    />
                                    <Tooltip formatter={(val) => `$${Number(val).toLocaleString("es-AR")}`} />
                                    <Legend />
                                    <Bar dataKey="ingresos_mes" fill="#007bff" name="Ingresos" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 2. Crecimiento mensual (%) */}
                <div className="col-md-6 mb-4">
                    <div className="card shadow-sm">
                        <div className="card-header">Crecimiento mensual (%) con respecto al mes anterior</div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={ingresos}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="mes"
                                        tickFormatter={(val) =>
                                            new Date(val).toLocaleDateString("es-AR", { year: "numeric", month: "short" })
                                        }
                                    />
                                    <YAxis
                                        domain={[-100, 100]}
                                        label={{

                                            angle: -90,
                                            position: "insideLeft",
                                            style: { textAnchor: "middle", fontSize: 12, fill: "#333" }
                                        }}
                                    />
                                    <Tooltip formatter={(val) => `${Number(val).toFixed(1)}%`} />
                                    <Legend />
                                    <Line type="monotone" dataKey="crecimiento_pct" stroke="#28a745" name="Crecimiento %" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 3. Tasa de conversión */}
                <div className="col-md-6 mb-4">
                    <div className="card shadow-sm">
                        <div className="card-header">Tasa de conversión de contratos (firmados sobre total)</div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={conversion}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="mes"
                                        tickFormatter={(val) =>
                                            new Date(val).toLocaleDateString("es-AR", { year: "numeric", month: "short" })
                                        }
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        label={{

                                            angle: -90,
                                            position: "insideLeft",
                                            style: { textAnchor: "middle", fontSize: 12, fill: "#333" }
                                        }}
                                    />
                                    <Tooltip formatter={(val) => `${Number(val).toFixed(1)}%`} />
                                    <Legend />
                                    <Bar dataKey="conversion_pct" fill="#ffc107" name="Conversión %" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 4. Contratos pendientes */}
                <div className="col-md-6 mb-4">
                    <div className="card shadow-sm">
                        <div className="card-header">Contratos pendientes</div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            {
                                                name: "Pendientes",
                                                value: Number(pendientes?.pendientes_pct || 0)
                                            },
                                            {
                                                name: "Firmados",
                                                value: 100 - Number(pendientes?.pendientes_pct || 0)
                                            }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label={({ name, value }) => `${name}: ${Number(value).toFixed(1)}%`}
                                        dataKey="value"
                                    >
                                        <Cell fill="#FF8042" />
                                        <Cell fill="#00C49F" />
                                    </Pie>
                                    <Tooltip formatter={(val) => `${Number(val).toFixed(1)}%`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 5. Valor total de contratos por cliente */}
                <div className="col-md-6 mb-4">
                    <div className="card shadow-sm">
                        <div className="card-header">Valor total de contratos por cliente</div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={clientes} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        type="number"
                                        tickFormatter={(val) => `$${Number(val).toLocaleString("es-AR")}`}
                                        label={{

                                            position: "insideBottom",
                                            offset: -5,
                                            style: { textAnchor: "middle", fontSize: 12, fill: "#333" }
                                        }}
                                    />
                                    <YAxis type="category" dataKey="nombre_cliente" />
                                    <Tooltip formatter={(val) => `$${Number(val).toLocaleString("es-AR")}`} />
                                    <Legend />
                                    <Bar dataKey="total_contratos" fill="#8884d8" name="Monto total" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Adminkpisales;
