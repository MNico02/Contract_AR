import db from "../config/db.js";  // ✅ apunta a src/config/db.js


// 1. Crecimiento mensual de ingresos
export const getCrecimientoIngresos = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                DATE_TRUNC('month', fecha_firma) AS mes,
                SUM(monto) AS ingresos_mes,

                -- LAG convertido: si es NULL (primer mes), reemplazar por 0
                COALESCE(
                        LAG(SUM(monto)) OVER (ORDER BY DATE_TRUNC('month', fecha_firma)),
                        0
                ) AS ingresos_mes_anterior,

                -- Crecimiento: si es NULL (primer mes), devolver 0
                COALESCE(
                        (SUM(monto) - LAG(SUM(monto)) OVER (ORDER BY DATE_TRUNC('month', fecha_firma)))
                            / NULLIF(LAG(SUM(monto)) OVER (ORDER BY DATE_TRUNC('month', fecha_firma)), 0) * 100,
                        0
                ) AS crecimiento_pct

            FROM contratos_kpi
            WHERE estado = 'Firmado'
            GROUP BY DATE_TRUNC('month', fecha_firma)
            ORDER BY mes;
        `);

        res.json(result.rows);
    } catch (err) {
        console.error("Error en getCrecimientoIngresos:", err);
        res.status(500).json({ error: "Error obteniendo crecimiento de ingresos" });
    }
};


// 2. Tasa de conversión de contratos
export const getConversionContratos = async (req, res) => {
    try {
        const result = await db.query(`
      SELECT
        DATE_TRUNC('month', fecha_creacion) AS mes,
        COUNT(*) FILTER (WHERE estado = 'Firmado')::decimal / COUNT(*) * 100 AS conversion_pct
      FROM contratos_kpi
      GROUP BY DATE_TRUNC('month', fecha_creacion)
      ORDER BY mes;
    `);
        res.json(result.rows);
    } catch (err) {
        console.error("Error en getConversionContratos:", err);
        res.status(500).json({ error: "Error obteniendo conversión de contratos" });
    }
};

// 3. Porcentaje total de contratos pendientes
export const getPendientesContratos = async (req, res) => {
    try {
        const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE estado = 'Pendiente')::decimal / COUNT(*) * 100 AS pendientes_pct
      FROM contratos_kpi;
    `);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error en getPendientesContratos:", err);
        res.status(500).json({ error: "Error obteniendo pendientes" });
    }
};

// 4. Valor total de contratos por cliente
export const getValorPorCliente = async (req, res) => {
    try {
        const result = await db.query(`
      SELECT
        c.nombre_cliente,
        SUM(co.monto) AS total_contratos
      FROM contratos_kpi co
      JOIN clientes_kpi c ON co.id_cliente = c.id_cliente
      WHERE co.estado = 'Firmado'
      GROUP BY c.nombre_cliente
      ORDER BY total_contratos DESC;
    `);
        res.json(result.rows);
    } catch (err) {
        console.error("Error en getValorPorCliente:", err);
        res.status(500).json({ error: "Error obteniendo valor por cliente" });
    }
};
// 5. Tasa de conversión de clientes
export const getConversionClientes = async (req, res) => {
    try {
        const result = await db.query(`
            WITH clientes_mes AS (
                SELECT 
                    DATE_TRUNC('month', fecha_creacion) AS mes,
                    id_cliente,
                    BOOL_OR(estado = 'Firmado') AS firmo_alguno
                FROM contratos_kpi
                GROUP BY 1, 2
            )
            SELECT
                mes,
                COUNT(*) AS clientes_totales,
                COUNT(*) FILTER (WHERE firmo_alguno) AS clientes_convertidos,
                COUNT(*) FILTER (WHERE firmo_alguno)::decimal 
                    / NULLIF(COUNT(*), 0) * 100 AS conversion_pct
            FROM clientes_mes
            GROUP BY mes
            ORDER BY mes;
        `);

        res.json(result.rows);
    } catch (err) {
        console.error("Error en getConversionClientes:", err);
        res.status(500).json({ error: "Error obteniendo conversión de clientes" });
    }
};