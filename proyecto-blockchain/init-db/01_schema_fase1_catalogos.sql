-- ===========================================
-- EXTENSIONES NECESARIAS
-- ===========================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- para gen_random_uuid()

-- ===========================================
-- TABLAS DE CATÁLOGOS (Roles, Estados, Redes)
-- ===========================================
CREATE TABLE roles (
                       id SERIAL PRIMARY KEY,
                       nombre VARCHAR(50) UNIQUE NOT NULL
);
INSERT INTO roles (nombre) VALUES ('admin'), ('usuario');

CREATE TABLE estados_contrato (
                                  id SERIAL PRIMARY KEY,
                                  nombre VARCHAR(50) UNIQUE NOT NULL
);
INSERT INTO estados_contrato (nombre)
VALUES ('borrador'), ('pendiente_firmas'), ('firmado'), ('cancelado');

CREATE TABLE estados_firma (
                               id SERIAL PRIMARY KEY,
                               nombre VARCHAR(50) UNIQUE NOT NULL
);
INSERT INTO estados_firma (nombre)
VALUES ('pendiente'), ('firmado'), ('rechazado');

CREATE TABLE estados_transaccion (
                                     id SERIAL PRIMARY KEY,
                                     nombre VARCHAR(50) UNIQUE NOT NULL
);
INSERT INTO estados_transaccion (nombre)
VALUES ('pendiente'), ('confirmada'), ('fallo');

CREATE TABLE redes_blockchain (
                                  id SERIAL PRIMARY KEY,
                                  nombre VARCHAR(50) UNIQUE NOT NULL
);
INSERT INTO redes_blockchain (nombre) VALUES ('polygon'), ('ethereum');

-- ===========================================
-- TABLA: usuarios
-- ===========================================
CREATE TABLE usuarios (
                          id SERIAL PRIMARY KEY,
                          uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
                          email VARCHAR(255) UNIQUE NOT NULL,
                          password_hash VARCHAR(255) NOT NULL,
                          nombre VARCHAR(100) NOT NULL,
                          apellido VARCHAR(100) NOT NULL,
                          telefono VARCHAR(20),
                          rol_id INT REFERENCES roles(id) DEFAULT 2, -- usuario por defecto
                          estado BOOLEAN DEFAULT TRUE, -- activo/inactivo
                          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          ultima_conexion TIMESTAMP
);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_uuid ON usuarios(uuid);

-- ===========================================
-- TABLA: contratos
-- ===========================================
DROP TABLE IF EXISTS contratos CASCADE;

-- Luego crear con el nuevo schema:
CREATE TABLE contratos (
                           id SERIAL PRIMARY KEY,
                           uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
                           titulo VARCHAR(255) NOT NULL,
                           descripcion TEXT,
                           ipfs_hash VARCHAR(100) NOT NULL,
                           ipfs_url VARCHAR(500) NOT NULL,
                           blockchain_hash VARCHAR(100),
                           blockchain_network_id INT REFERENCES redes_blockchain(id) DEFAULT 1,
                           transaction_hash VARCHAR(100),
                           estado_id INT REFERENCES estados_contrato(id) DEFAULT 1,
                           fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                           fecha_firmado TIMESTAMP,
                           creador_id INT REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_contratos_uuid ON contratos(uuid);
CREATE INDEX idx_contratos_estado ON contratos(estado_id);
CREATE INDEX idx_contratos_creador ON contratos(creador_id);


-- ===========================================
-- TABLA: firmantes
-- ===========================================
CREATE TABLE firmantes (
                           id SERIAL PRIMARY KEY,
                           contrato_id INT REFERENCES contratos(id) ON DELETE CASCADE,
                           usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
                           email VARCHAR(255) NOT NULL,
                           nombre_completo VARCHAR(255) NOT NULL,
                           rol_firmante VARCHAR(100),
                           estado_id INT REFERENCES estados_firma(id) DEFAULT 1,
                           fecha_invitacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                           fecha_firma TIMESTAMP
);
CREATE INDEX idx_firmantes_contrato ON firmantes(contrato_id);
CREATE INDEX idx_firmantes_estado ON firmantes(estado_id);

-- ===========================================
-- TABLA: transacciones_blockchain
-- ===========================================
CREATE TABLE transacciones_blockchain (
                                          id SERIAL PRIMARY KEY,
                                          contrato_id INT REFERENCES contratos(id) ON DELETE CASCADE,
                                          usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
                                          tipo_transaccion VARCHAR(50) NOT NULL,
                                          transaction_hash VARCHAR(100) UNIQUE NOT NULL,
                                          network_id INT REFERENCES redes_blockchain(id) DEFAULT 1,
                                          fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                          estado_id INT REFERENCES estados_transaccion(id) DEFAULT 1
);
CREATE INDEX idx_transacciones_contrato ON transacciones_blockchain(contrato_id);
CREATE INDEX idx_transacciones_estado ON transacciones_blockchain(estado_id);

-- ===========================================
-- TABLA: auditoria_eventos (solo estructura, lógica más adelante)
-- ===========================================
CREATE TABLE auditoria_eventos (
                                   id SERIAL PRIMARY KEY,
                                   entidad VARCHAR(50) NOT NULL,
                                   entidad_id UUID NOT NULL,
                                   usuario_id INT REFERENCES usuarios(id),
                                   accion VARCHAR(50) NOT NULL,
                                   detalle JSONB,
                                   fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_auditoria_entidad ON auditoria_eventos(entidad, entidad_id);
CREATE INDEX idx_auditoria_usuario ON auditoria_eventos(usuario_id);


-- ===========================================
-- TABLA: password_resets
-- ===========================================
CREATE TABLE password_resets (
                                 id SERIAL PRIMARY KEY,
                                 usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
                                 codigo VARCHAR(6) NOT NULL,
                                 expiracion TIMESTAMP NOT NULL,
                                 usado BOOLEAN DEFAULT FALSE,
                                 fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_resets_usuario ON password_resets(usuario_id);
CREATE INDEX idx_password_resets_codigo ON password_resets(codigo);


CREATE TABLE usuarios_contratos (
                                    id SERIAL PRIMARY KEY,
                                    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                                    contrato_id INT NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
                                    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                    UNIQUE(usuario_id, contrato_id)
);

-- Índices para mejorar consultas
CREATE INDEX idx_uc_usuario ON usuarios_contratos(usuario_id);
CREATE INDEX idx_uc_contrato ON usuarios_contratos(contrato_id);


ALTER TABLE usuarios
    ADD COLUMN direccion_wallet VARCHAR(100) UNIQUE,
    ADD COLUMN nonce VARCHAR(100);