
# 📄 API - Fase 1 (Usuarios, Contratos, Firmantes, Transacciones Blockchain)

## 🔑 Base URL
```
http://localhost:3000/api
```

---

## 📌 1. Usuarios

### ➤ Obtener todos los usuarios
**GET** `/usuarios`

**Ejemplo de respuesta**
```json
[
  {
    "id": 1,
    "uuid": "xxx-xxx",
    "email": "juan@example.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "telefono": "123456789",
    "rol": "usuario",
    "estado": true,
    "fecha_creacion": "2025-08-04T10:00:00Z"
  }
]
```

---

### ➤ Crear usuario
**POST** `/usuarios`

**Body (JSON)**
```json
{
  "email": "juan@example.com",
  "password": "123456",
  "nombre": "Juan",
  "apellido": "Pérez",
  "telefono": "123456789"
}
```

**Ejemplo de respuesta**
```json
{
  "id": 1,
  "uuid": "xxx-xxx",
  "email": "juan@example.com",
  "nombre": "Juan",
  "apellido": "Pérez",
  "telefono": "123456789",
  "rol_id": 2
}
```

---

## 📌 2. Contratos

### ➤ Obtener todos los contratos
**GET** `/contratos`

**Ejemplo de respuesta**
```json
[
  {
    "id": 1,
    "uuid": "xxx-xxx",
    "titulo": "Contrato de Servicios",
    "descripcion": "Prestación de servicios de desarrollo",
    "estado": "borrador",
    "fecha_creacion": "2025-08-04T10:00:00Z",
    "creador": "Juan Pérez"
  }
]
```

---

### ➤ Crear contrato
**POST** `/contratos`

**Body (JSON)**
```json
{
  "titulo": "Contrato de Servicios",
  "descripcion": "Prestación de servicios",
  "contenido_html": "<p>Contenido del contrato</p>",
  "creador_id": 1
}
```

**Ejemplo de respuesta**
```json
{
  "id": 1,
  "uuid": "xxx-xxx",
  "titulo": "Contrato de Servicios",
  "descripcion": "Prestación de servicios",
  "estado_id": 1,
  "fecha_creacion": "2025-08-04T10:00:00Z"
}
```

---

## 📌 3. Firmantes

### ➤ Obtener firmantes de un contrato
**GET** `/firmantes/:contratoId`

**Ejemplo**
```
GET /firmantes/1
```

**Ejemplo de respuesta**
```json
[
  {
    "id": 1,
    "email": "firmante@example.com",
    "nombre_completo": "Firmante Ejemplo",
    "rol_firmante": "Testigo",
    "estado": "pendiente",
    "fecha_invitacion": "2025-08-04T10:00:00Z"
  }
]
```

---

### ➤ Agregar firmante
**POST** `/firmantes`

**Body (JSON)**
```json
{
  "contrato_id": 1,
  "email": "firmante@example.com",
  "nombre_completo": "Firmante Ejemplo",
  "rol_firmante": "Testigo"
}
```

**Ejemplo de respuesta**
```json
{
  "id": 1,
  "contrato_id": 1,
  "email": "firmante@example.com",
  "nombre_completo": "Firmante Ejemplo",
  "rol_firmante": "Testigo",
  "estado_id": 1
}
```

---

### ➤ Actualizar estado de firma
**PUT** `/firmantes/:id`

**Body (JSON)**
```json
{
  "estado_id": 2
}
```

**Ejemplo de respuesta**
```json
{
  "id": 1,
  "contrato_id": 1,
  "email": "firmante@example.com",
  "nombre_completo": "Firmante Ejemplo",
  "estado_id": 2,
  "fecha_firma": "2025-08-04T10:30:00Z"
}
```

---

## 📌 4. Transacciones Blockchain

### ➤ Obtener transacciones de un contrato
**GET** `/transacciones/:contratoId`

**Ejemplo**
```
GET /transacciones/1
```

**Ejemplo de respuesta**
```json
[
  {
    "id": 1,
    "transaction_hash": "0xabc12345hashblockchain",
    "red": "polygon",
    "estado": "pendiente",
    "fecha_envio": "2025-08-04T10:00:00Z"
  }
]
```

---

### ➤ Agregar transacción
**POST** `/transacciones`

**Body (JSON)**
```json
{
  "contrato_id": 1,
  "usuario_id": 1,
  "tipo_transaccion": "registro_contrato",
  "transaction_hash": "0xabc12345hashblockchain",
  "network_id": 1
}
```

**Ejemplo de respuesta**
```json
{
  "id": 1,
  "contrato_id": 1,
  "transaction_hash": "0xabc12345hashblockchain",
  "network_id": 1,
  "estado_id": 1
}
```

---

### ➤ Actualizar estado de transacción
**PUT** `/transacciones/:id`

**Body (JSON)**
```json
{
  "estado_id": 2
}
```

**Ejemplo de respuesta**
```json
{
  "id": 1,
  "contrato_id": 1,
  "transaction_hash": "0xabc12345hashblockchain",
  "estado_id": 2
}
```

---

## 📌 Resumen de Endpoints

| Recurso         | Método | Endpoint                        | Descripción                          |
|----------------|--------|--------------------------------|--------------------------------------|
| Usuarios       | GET    | `/usuarios`                    | Listar usuarios                     |
| Usuarios       | POST   | `/usuarios`                    | Crear usuario                       |
| Contratos      | GET    | `/contratos`                   | Listar contratos                    |
| Contratos      | POST   | `/contratos`                   | Crear contrato                      |
| Firmantes      | GET    | `/firmantes/:contratoId`       | Listar firmantes de contrato        |
| Firmantes      | POST   | `/firmantes`                   | Agregar firmante                    |
| Firmantes      | PUT    | `/firmantes/:id`               | Actualizar estado de firmante       |
| Transacciones  | GET    | `/transacciones/:contratoId`   | Listar transacciones de contrato    |
| Transacciones  | POST   | `/transacciones`               | Registrar transacción blockchain    |
| Transacciones  | PUT    | `/transacciones/:id`           | Actualizar estado de transacción    |
