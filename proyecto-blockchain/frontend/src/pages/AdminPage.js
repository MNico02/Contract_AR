import React from "react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
    LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer
} from "recharts";

const AdminPage = () => {
    // Datos de ejemplo, vos los vas a traer de tu API
    const costsRevenue = [
        { year: "4 Year", cost: 20, revenue: 40 },
        { year: "5 Year", cost: 30, revenue: 30 },
        { year: "6 Year", cost: 40, revenue: 10 },
    ];

    const revenueData = [
        { month: "May-17", target: 2000, actual: 1800 },
        { month: "Jun-17", target: 2000, actual: 1700 },
        { month: "Jul-17", target: 2000, actual: 1900 },
        { month: "Aug-17", target: 2000, actual: 2100 },
        { month: "Sep-17", target: 2000, actual: 2200 },
    ];

    const expensesData = [
        { month: "Jan-17", target: 250000, actual: 200000 },
        { month: "Apr-17", target: 270000, actual: 250000 },
        { month: "Jul-17", target: 280000, actual: 270000 },
        { month: "Oct-17", target: 300000, actual: 280000 },
        { month: "Jan-18", target: 320000, actual: 290000 },
    ];

    const profitData = [
        { month: "Feb-17", target: 10, actual: 5 },
        { month: "Apr-17", target: 12, actual: 8 },
        { month: "Jun-17", target: 15, actual: 12 },
        { month: "Sep-17", target: 18, actual: 10 },
        { month: "Dec-17", target: 20, actual: 15 },
    ];

    const contractsStatus = [
        { name: "Firmado", value: 15 },
        { name: "Pendiente", value: 10 },
        { name: "Borrador", value: 5 },
        { name: "Cancelado", value: 5 },
    ];

    const contractsCategory = [
        { name: "Servicio", value: 12 },
        { name: "Compraventa", value: 8 },
        { name: "Alquiler", value: 7 },
        { name: "Laboral", value: 5 },
        { name: "Otro", value: 3 },
    ];

    const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#DD4477"];

    return (
        <div className="container-fluid py-4">
            <h3 className="fw-bold mb-4">📊 Panel de Administración</h3>

            <div className="row">
                {/* Costs and Revenue */}
                <div className="col-md-6 mb-4">
                    <div className="card shadow-sm">
                        <div className="card-header">Sum of Costs and Revenue</div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={costsRevenue} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="year" />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="cost" fill="#8884d8" />
                                    <Bar dataKey="revenue" fill="#82ca9d" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Revenue */}
                <div className="col-md-6 mb-4">
                    <div className="card shadow-sm">
                        <div className="card-header">Revenue</div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={revenueData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="target" fill="#ffc107" />
                                    <Line type="monotone" dataKey="actual" stroke="#007bff" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Contracts per Status */}
                <div className="col-md-6 mb-4">
                    <div className="card shadow-sm">
                        <div className="card-header">Contracts per Status</div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={contractsStatus} dataKey="value" outerRadius={100} label>
                                        {contractsStatus.map((_, index) => (
                                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Contracts per Category */}
                <div className="col-md-6 mb-4">
                    <div className="card shadow-sm">
                        <div className="card-header">Contracts per Category</div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={contractsCategory} dataKey="value" innerRadius={50} outerRadius={100} label>
                                        {contractsCategory.map((_, index) => (
                                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Expenses */}
                <div className="col-md-6 mb-4">
                    <div className="card shadow-sm">
                        <div className="card-header">Expenses</div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={expensesData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="target" stroke="#dc3545" />
                                    <Line type="monotone" dataKey="actual" stroke="#28a745" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Net Profit */}
                <div className="col-md-6 mb-4">
                    <div className="card shadow-sm">
                        <div className="card-header">Net Profit</div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={profitData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="target" stroke="#dc3545" />
                                    <Line type="monotone" dataKey="actual" stroke="#28a745" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
