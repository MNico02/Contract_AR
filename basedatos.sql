-- ===========================================
-- SISTEMA DE BORRADO DE TABLAS (orden correcto)
-- ===========================================

DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS usuarios_contratos CASCADE;
DROP TABLE IF EXISTS contratos_pagos CASCADE;
DROP TABLE IF EXISTS transacciones_blockchain CASCADE;
DROP TABLE IF EXISTS firmantes CASCADE;
DROP TABLE IF EXISTS contratos CASCADE;
DROP TABLE IF EXISTS auditoria_eventos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS gestiondecobros CASCADE;

-- Tablas de catálogos (últimas en borrarse)
DROP TABLE IF EXISTS redes_blockchain CASCADE;
DROP TABLE IF EXISTS estados_transaccion CASCADE;
DROP TABLE IF EXISTS estados_firma CASCADE;
DROP TABLE IF EXISTS estados_contrato CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

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
--DROP TABLE IF EXISTS contratos CASCADE;

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
ADD COLUMN nonce VARCHAR(100); -- para login con firma en el futuro



-- ===========================================
-- TABLA: contratos_pagos
-- ===========================================
CREATE TABLE contratos_pagos (
                                 id SERIAL PRIMARY KEY,
                                 contrato_id INT NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
                                 usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
                                 mp_payment_id BIGINT UNIQUE,             -- ID del pago en Mercado Pago
                                 mp_preference_id VARCHAR(100),           -- ID de la preferencia
                                 estado_id INT REFERENCES estados_transaccion(id) DEFAULT 1, -- pendiente/confirmada/fallo
                                 monto NUMERIC(12,2) NOT NULL,
                                 moneda VARCHAR(10) DEFAULT 'ARS',
                                 fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_cp_contrato ON contratos_pagos(contrato_id);
CREATE INDEX idx_cp_usuario ON contratos_pagos(usuario_id);
CREATE INDEX idx_cp_estado ON contratos_pagos(estado_id);

ALTER TABLE contratos_pagos ALTER COLUMN contrato_id DROP NOT NULL;



CREATE TABLE gestiondecobros (
                                 id SERIAL PRIMARY KEY,
                                 monto_contrato NUMERIC(12,2) NOT NULL DEFAULT 0,  -- monto base por contrato
                                 monto_firmante NUMERIC(12,2) NOT NULL DEFAULT 0, -- monto adicional por cada firmante
                                 fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertamos valores iniciales (ejemplo: contrato = 500, firmante = 250)
INSERT INTO gestiondecobros (monto_contrato, monto_firmante)
VALUES (500, 250);



-- kpyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
DROP TABLE IF EXISTS contratos_kpi;
DROP TABLE IF EXISTS clientes_kpi;

CREATE TABLE clientes_kpi (
                              id_cliente SERIAL PRIMARY KEY,
                              nombre_cliente VARCHAR(100) NOT NULL,
                              email VARCHAR(100),
                              telefono VARCHAR(20)
);

CREATE TABLE contratos_kpi (
                               id_contrato SERIAL PRIMARY KEY,
                               id_cliente INT NOT NULL,
                               fecha_creacion DATE NOT NULL,
                               fecha_firma DATE,
                               monto NUMERIC(15,2) NOT NULL,
                               estado VARCHAR(20) NOT NULL CHECK (estado IN ('Pendiente', 'Firmado', 'Cancelado')),
                               FOREIGN KEY (id_cliente) REFERENCES clientes_kpi(id_cliente)
);

INSERT INTO clientes_kpi (nombre_cliente, email, telefono) VALUES
                                                               ('Juan Pérez','cliente1@example.com','351000001'),
                                                               ('María Gómez','cliente2@example.com','351000002'),
                                                               ('Lucas Romero','cliente3@example.com','351000003'),
                                                               ('Ana Torres','cliente4@example.com','351000004'),
                                                               ('Diego López','cliente5@example.com','351000005'),
                                                               ('Carolina Duarte','cliente6@example.com','351000006'),
                                                               ('Marcelo Silva','cliente7@example.com','351000007'),
                                                               ('Paula Sosa','cliente8@example.com','351000008'),
                                                               ('Gustavo Molina','cliente9@example.com','351000009'),
                                                               ('Sabrina Varela','cliente10@example.com','351000010'),

                                                               ('José Herrera','cliente11@example.com','351000011'),
                                                               ('Cecilia Paz','cliente12@example.com','351000012'),
                                                               ('Tomás Ferreyra','cliente13@example.com','351000013'),
                                                               ('Laura Bustos','cliente14@example.com','351000014'),
                                                               ('Ramiro Quiroga','cliente15@example.com','351000015'),
                                                               ('Valeria Cáceres','cliente16@example.com','351000016'),
                                                               ('Ezequiel Vera','cliente17@example.com','351000017'),
                                                               ('Rocío Aguilar','cliente18@example.com','351000018'),
                                                               ('Matías Córdoba','cliente19@example.com','351000019'),
                                                               ('Micaela Ortiz','cliente20@example.com','351000020'),

                                                               ('Federico Acosta','cliente21@example.com','351000021'),
                                                               ('Sofía Rivas','cliente22@example.com','351000022'),
                                                               ('Emiliano Rey','cliente23@example.com','351000023'),
                                                               ('Camila Maldonado','cliente24@example.com','351000024'),
                                                               ('Nicolás Peralta','cliente25@example.com','351000025'),
                                                               ('Florencia Neri','cliente26@example.com','351000026'),
                                                               ('Hernán Cabrera','cliente27@example.com','351000027'),
                                                               ('Daniela Duarte','cliente28@example.com','351000028'),
                                                               ('Agustín Campos','cliente29@example.com','351000029'),
                                                               ('Verónica Blanco','cliente30@example.com','351000030'),

                                                               ('Fernando Luna','cliente31@example.com','351000031'),
                                                               ('Romina Ibarra','cliente32@example.com','351000032'),
                                                               ('Sebastián Arroyo','cliente33@example.com','351000033'),
                                                               ('Brenda Roldán','cliente34@example.com','351000034'),
                                                               ('Pablo Núñez','cliente35@example.com','351000035'),
                                                               ('Eliana Vázquez','cliente36@example.com','351000036'),
                                                               ('Gabriel Torres','cliente37@example.com','351000037'),
                                                               ('Julieta Medina','cliente38@example.com','351000038'),
                                                               ('Alejandro Castro','cliente39@example.com','351000039'),
                                                               ('Melina Cabrera','cliente40@example.com','351000040'),

                                                               ('Rodrigo Díaz','cliente41@example.com','351000041'),
                                                               ('Carla Britos','cliente42@example.com','351000042'),
                                                               ('Martín Arce','cliente43@example.com','351000043'),
                                                               ('Vanesa Figueroa','cliente44@example.com','351000044'),
                                                               ('Ignacio Benítez','cliente45@example.com','351000045'),
                                                               ('Claudia Salas','cliente46@example.com','351000046'),
                                                               ('Franco Montenegro','cliente47@example.com','351000047'),
                                                               ('Cintia Rojas','cliente48@example.com','351000048'),
                                                               ('Oscar Toledo','cliente49@example.com','351000049'),
                                                               ('Tatiana Cabrera','cliente50@example.com','351000050'),

                                                               ('Cristian Silva','cliente51@example.com','351000051'),
                                                               ('Aldana Ríos','cliente52@example.com','351000052'),
                                                               ('Facundo Maidana','cliente53@example.com','351000053'),
                                                               ('Lourdes Romero','cliente54@example.com','351000054'),
                                                               ('Julián Bustos','cliente55@example.com','351000055'),
                                                               ('Antonella Ruiz','cliente56@example.com','351000056'),
                                                               ('Gonzalo Nieto','cliente57@example.com','351000057'),
                                                               ('Carina Flores','cliente58@example.com','351000058'),
                                                               ('Lucas Benítez','cliente59@example.com','351000059'),
                                                               ('Romina Carranza','cliente60@example.com','351000060'),

                                                               ('Joel Moreira','cliente61@example.com','351000061'),
                                                               ('Pamela Espinoza','cliente62@example.com','351000062'),
                                                               ('Jonathan Ayala','cliente63@example.com','351000063'),
                                                               ('Luna Funes','cliente64@example.com','351000064'),
                                                               ('Mauricio Valdés','cliente65@example.com','351000065'),
                                                               ('Patricia Ledesma','cliente66@example.com','351000066'),
                                                               ('Emanuel Godoy','cliente67@example.com','351000067'),
                                                               ('Milagros Herrera','cliente68@example.com','351000068'),
                                                               ('Leandro Vivas','cliente69@example.com','351000069'),
                                                               ('Daniela Soria','cliente70@example.com','351000070'),

                                                               ('Hugo Pereyra','cliente71@example.com','351000071'),
                                                               ('Bianca Mercado','cliente72@example.com','351000072'),
                                                               ('Adrián Cosme','cliente73@example.com','351000073'),
                                                               ('Mariela Ferreira','cliente74@example.com','351000074'),
                                                               ('Nadir Morales','cliente75@example.com','351000075'),
                                                               ('Ariana Salvatierra','cliente76@example.com','351000076'),
                                                               ('David Toledo','cliente77@example.com','351000077'),
                                                               ('Daiana Chávez','cliente78@example.com','351000078'),
                                                               ('Jorge Sequeira','cliente79@example.com','351000079'),
                                                               ('Bárbara Patiño','cliente80@example.com','351000080'),

                                                               ('Esteban Díaz','cliente81@example.com','351000081'),
                                                               ('Rocío Bustamante','cliente82@example.com','351000082'),
                                                               ('Nicolás Flores','cliente83@example.com','351000083'),
                                                               ('Solana Míguez','cliente84@example.com','351000084'),
                                                               ('Marcos Maldonado','cliente85@example.com','351000085'),
                                                               ('Valentina Cabrera','cliente86@example.com','351000086'),
                                                               ('Tomás Arias','cliente87@example.com','351000087'),
                                                               ('Giuliana Ibarra','cliente88@example.com','351000088'),
                                                               ('Nahuel Duarte','cliente89@example.com','351000089'),
                                                               ('Lucía Godoy','cliente90@example.com','351000090'),

                                                               ('Franco Aguirre','cliente91@example.com','351000091'),
                                                               ('Ayelén López','cliente92@example.com','351000092'),
                                                               ('Guillermo Carballo','cliente93@example.com','351000093'),
                                                               ('Pilar Medina','cliente94@example.com','351000094'),
                                                               ('Matías Reinoso','cliente95@example.com','351000095'),
                                                               ('Marina Quiroga','cliente96@example.com','351000096'),
                                                               ('Joaquín Brito','cliente97@example.com','351000097'),
                                                               ('Mara del Río','cliente98@example.com','351000098'),
                                                               ('Ulises Paredes','cliente99@example.com','351000099'),
                                                               ('Abril Pereyra','cliente100@example.com','351000100');


-- INSERT CONTRATOS 2025
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (30,'2025-01-15',NULL,1326,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (47,'2025-01-20','2025-01-29',1488,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (30,'2025-01-01',NULL,1136,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (25,'2025-01-20','2025-01-30',1046,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (35,'2025-01-27','2025-01-27',906,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (63,'2025-01-20','2025-01-26',1498,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (30,'2025-01-04',NULL,1154,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (12,'2025-01-13','2025-01-16',1235,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (46,'2025-01-10',NULL,1148,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (79,'2025-01-01','2025-01-11',1239,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (81,'2025-01-24','2025-01-27',1267,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (72,'2025-01-14','2025-01-15',979,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (25,'2025-01-20','2025-01-29',949,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (73,'2025-01-18','2025-01-27',1286,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (48,'2025-01-28','2025-01-28',974,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (28,'2025-01-04',NULL,1233,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (41,'2025-01-21','2025-01-22',1062,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (85,'2025-01-05','2025-01-10',1193,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (86,'2025-01-20',NULL,1327,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (50,'2025-01-27','2025-01-27',1277,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (27,'2025-01-08',NULL,1075,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (10,'2025-01-23','2025-01-30',1179,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (18,'2025-01-11','2025-01-17',1048,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (47,'2025-01-20',NULL,1430,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (63,'2025-01-11',NULL,1289,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (53,'2025-01-02',NULL,1050,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (16,'2025-01-28','2025-01-28',1476,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (81,'2025-01-24',NULL,1329,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (2,'2025-01-24',NULL,947,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (9,'2025-01-28',NULL,1397,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (92,'2025-01-14',NULL,917,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (16,'2025-01-16','2025-01-21',989,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (57,'2025-01-12','2025-01-18',1382,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (56,'2025-01-15','2025-01-25',904,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (58,'2025-01-26',NULL,1190,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (89,'2025-01-01','2025-01-07',1193,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (45,'2025-01-22',NULL,1030,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (87,'2025-01-05','2025-01-06',1401,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (31,'2025-01-05',NULL,1024,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (33,'2025-01-05','2025-01-08',1434,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (12,'2025-01-20',NULL,1099,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (98,'2025-01-07',NULL,1264,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (12,'2025-01-09',NULL,1457,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (18,'2025-01-22','2025-01-25',1369,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (30,'2025-01-13',NULL,1340,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (63,'2025-01-14',NULL,1275,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (12,'2025-01-21','2025-01-24',925,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (42,'2025-01-22','2025-01-22',1347,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (1,'2025-01-18','2025-01-28',1277,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (31,'2025-01-02','2025-01-03',1124,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (92,'2025-01-06','2025-01-10',1104,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (87,'2025-01-17','2025-01-21',1406,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (49,'2025-01-17',NULL,1425,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (65,'2025-01-28','2025-01-30',1350,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (79,'2025-01-13',NULL,1237,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (82,'2025-01-17',NULL,1395,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (3,'2025-01-23',NULL,1500,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (7,'2025-01-09',NULL,1353,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (34,'2025-01-16','2025-01-18',1436,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (84,'2025-01-03','2025-01-09',1375,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (81,'2025-01-18','2025-01-19',976,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (43,'2025-01-12','2025-01-18',1091,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (100,'2025-01-28','2025-01-30',954,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (70,'2025-01-23',NULL,1196,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (52,'2025-01-16','2025-01-18',1056,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (62,'2025-01-22',NULL,1379,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (10,'2025-01-07','2025-01-15',1406,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (69,'2025-01-25','2025-01-25',1374,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (41,'2025-01-25','2025-01-25',1469,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (83,'2025-01-21','2025-01-22',1317,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (93,'2025-01-23',NULL,1477,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (56,'2025-01-17','2025-01-21',1455,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (12,'2025-01-02',NULL,1311,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (16,'2025-01-12','2025-01-21',1270,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (61,'2025-01-17','2025-01-26',1204,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (41,'2025-01-20','2025-01-23',1408,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (83,'2025-01-07','2025-01-15',1293,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (55,'2025-01-25','2025-01-25',1448,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (3,'2025-01-06','2025-01-16',1370,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (77,'2025-01-20',NULL,1065,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (52,'2025-01-26','2025-01-26',1282,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (18,'2025-01-13',NULL,1300,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (84,'2025-01-04','2025-01-13',1308,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (35,'2025-01-14','2025-01-17',1082,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (87,'2025-01-11','2025-01-17',1443,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (33,'2025-02-20','2025-02-23',918,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (44,'2025-02-15','2025-02-24',1055,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (44,'2025-02-07','2025-02-12',1063,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (73,'2025-02-22','2025-02-28',1343,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (83,'2025-02-15',NULL,1143,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (30,'2025-02-01','2025-02-11',1432,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (59,'2025-02-21','2025-02-21',1194,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (72,'2025-02-18','2025-02-20',1188,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (68,'2025-02-28','2025-02-28',1102,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (94,'2025-02-13','2025-02-16',941,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (56,'2025-02-12','2025-02-18',1198,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (17,'2025-02-15','2025-02-16',1120,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (67,'2025-02-09','2025-02-16',1220,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (51,'2025-02-11','2025-02-16',1174,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (97,'2025-02-20','2025-02-27',1276,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (67,'2025-02-28',NULL,1140,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (41,'2025-02-15','2025-02-23',1083,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (28,'2025-02-07','2025-02-15',996,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (32,'2025-02-27','2025-02-28',1235,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (33,'2025-02-19','2025-02-19',1472,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (57,'2025-02-07',NULL,1115,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (15,'2025-02-17',NULL,1113,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (35,'2025-02-25',NULL,1237,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (76,'2025-02-17','2025-02-22',957,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (51,'2025-02-28','2025-02-28',1474,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (35,'2025-02-05','2025-02-12',1015,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (62,'2025-02-28',NULL,1142,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (31,'2025-02-22','2025-02-22',1114,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (91,'2025-02-28','2025-02-28',1384,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (29,'2025-02-08',NULL,1025,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (74,'2025-02-13','2025-02-15',1375,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (94,'2025-02-06','2025-02-15',1442,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (79,'2025-02-25',NULL,1459,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (68,'2025-02-14','2025-02-16',1021,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (19,'2025-02-19','2025-02-24',1082,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (50,'2025-02-06','2025-02-09',1304,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (31,'2025-02-26','2025-02-26',1041,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (26,'2025-02-13','2025-02-19',1068,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (94,'2025-02-13',NULL,1247,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (82,'2025-02-23','2025-02-26',935,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (52,'2025-02-25','2025-02-25',1500,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (17,'2025-02-10','2025-02-17',1144,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (6,'2025-02-09','2025-02-10',1080,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (38,'2025-02-18','2025-02-24',1024,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (92,'2025-02-05',NULL,900,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (90,'2025-02-06','2025-02-14',1135,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (48,'2025-02-02',NULL,1300,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (38,'2025-02-15','2025-02-22',1355,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (90,'2025-02-17','2025-02-24',1298,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (73,'2025-02-10',NULL,1432,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (39,'2025-02-14','2025-02-24',1333,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (19,'2025-03-17',NULL,1175,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (12,'2025-03-25',NULL,946,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (45,'2025-03-13','2025-03-23',1239,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (63,'2025-03-26','2025-03-26',1343,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (91,'2025-03-15',NULL,1061,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (82,'2025-03-18',NULL,1296,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (60,'2025-03-17',NULL,1336,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (8,'2025-03-16',NULL,1097,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (32,'2025-03-22','2025-03-27',1212,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (49,'2025-03-17',NULL,1004,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (81,'2025-03-10','2025-03-20',1043,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (69,'2025-03-11','2025-03-13',1439,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (3,'2025-03-24','2025-03-29',1117,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (1,'2025-03-14','2025-03-24',1340,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (24,'2025-03-16','2025-03-18',1337,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (3,'2025-03-28','2025-03-28',1053,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (66,'2025-03-20','2025-03-25',1367,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (68,'2025-03-18','2025-03-27',1248,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (55,'2025-03-22','2025-03-29',1238,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (32,'2025-03-14',NULL,1089,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (12,'2025-03-13','2025-03-15',987,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (14,'2025-03-07','2025-03-15',1066,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (53,'2025-03-25','2025-03-29',1472,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (72,'2025-03-01','2025-03-04',1080,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (37,'2025-03-20','2025-03-24',1299,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (86,'2025-03-22',NULL,1037,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (6,'2025-03-08','2025-03-15',1128,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (100,'2025-03-03','2025-03-12',1456,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (73,'2025-03-25','2025-03-28',965,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (93,'2025-03-23','2025-03-24',1124,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (85,'2025-03-05','2025-03-12',1404,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (22,'2025-03-20','2025-03-21',1378,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (30,'2025-03-02','2025-03-07',905,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (48,'2025-03-20','2025-03-24',1398,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (47,'2025-03-27','2025-03-28',953,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (10,'2025-03-25','2025-03-26',1454,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (85,'2025-03-12','2025-03-20',1190,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (91,'2025-03-08','2025-03-13',1315,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (99,'2025-03-18',NULL,1285,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (30,'2025-03-11',NULL,1305,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (98,'2025-03-28','2025-03-28',1154,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (78,'2025-03-02',NULL,1237,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (40,'2025-03-20',NULL,1472,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (50,'2025-03-07',NULL,1499,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (42,'2025-03-23',NULL,931,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (90,'2025-03-13','2025-03-18',1500,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (63,'2025-03-06',NULL,1329,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (77,'2025-03-09','2025-03-18',1482,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (86,'2025-03-09',NULL,1272,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (76,'2025-03-04',NULL,1425,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (90,'2025-03-21','2025-03-23',1255,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (48,'2025-03-21',NULL,1150,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (47,'2025-03-01','2025-03-08',1283,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (5,'2025-03-19',NULL,1050,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (36,'2025-03-03','2025-03-07',1343,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (53,'2025-03-27',NULL,1124,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (67,'2025-03-28',NULL,965,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (88,'2025-03-12',NULL,1175,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (93,'2025-03-17',NULL,1249,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (17,'2025-03-26','2025-03-26',1043,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (56,'2025-04-03',NULL,1135,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (21,'2025-04-11',NULL,1301,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (69,'2025-04-08',NULL,1118,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (25,'2025-04-14','2025-04-21',1247,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (97,'2025-04-18','2025-04-27',1473,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (19,'2025-04-27','2025-04-27',1225,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (80,'2025-04-25',NULL,1276,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (83,'2025-04-07','2025-04-09',935,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (53,'2025-04-18',NULL,942,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (18,'2025-04-15','2025-04-24',1048,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (35,'2025-04-04',NULL,1429,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (48,'2025-04-08',NULL,1024,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (41,'2025-04-17','2025-04-18',1347,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (49,'2025-04-24','2025-04-30',1151,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (34,'2025-04-13','2025-04-23',1303,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (18,'2025-04-28',NULL,1401,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (51,'2025-04-27','2025-04-27',1316,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (29,'2025-04-28',NULL,1495,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (37,'2025-04-17','2025-04-23',1324,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (78,'2025-04-18','2025-04-28',1060,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (68,'2025-04-22','2025-04-25',1110,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (64,'2025-04-16',NULL,1451,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (81,'2025-04-13',NULL,983,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (33,'2025-04-09',NULL,1317,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (90,'2025-04-08','2025-04-10',904,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (89,'2025-04-17',NULL,1495,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (23,'2025-04-14','2025-04-24',1388,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (76,'2025-04-11','2025-04-15',1441,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (51,'2025-04-15','2025-04-22',1219,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (64,'2025-04-26','2025-04-26',1264,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (58,'2025-04-19','2025-04-21',1401,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (75,'2025-04-08','2025-04-11',1237,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (40,'2025-04-05','2025-04-15',1069,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (3,'2025-04-14',NULL,922,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (67,'2025-04-26','2025-04-26',1113,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (75,'2025-04-16',NULL,1133,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (67,'2025-04-01','2025-04-06',905,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (37,'2025-04-05','2025-04-15',1388,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (53,'2025-04-12','2025-04-19',1181,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (49,'2025-04-04','2025-04-09',1499,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (60,'2025-04-16','2025-04-24',1391,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (48,'2025-04-26','2025-04-29',1381,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (60,'2025-04-10','2025-04-18',1366,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (5,'2025-04-06','2025-04-16',1106,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (80,'2025-04-09',NULL,1230,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (21,'2025-04-28','2025-04-28',1487,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (100,'2025-04-25',NULL,1058,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (18,'2025-04-11','2025-04-19',1325,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (35,'2025-04-24','2025-04-24',1340,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (59,'2025-04-25','2025-04-27',1171,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (21,'2025-04-02','2025-04-10',1032,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (60,'2025-04-01',NULL,1094,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (20,'2025-04-01','2025-04-03',1420,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (22,'2025-04-16',NULL,1309,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (97,'2025-04-07','2025-04-12',1484,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (10,'2025-04-22','2025-04-22',1417,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (48,'2025-04-28',NULL,1386,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (75,'2025-04-15','2025-04-17',1282,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (10,'2025-04-04','2025-04-10',1127,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (92,'2025-04-20','2025-04-21',1371,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (61,'2025-04-18','2025-04-24',1185,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (31,'2025-04-08',NULL,1483,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (85,'2025-04-20',NULL,1203,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (93,'2025-04-27','2025-04-27',1088,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (14,'2025-04-14','2025-04-21',1458,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (65,'2025-04-05','2025-04-09',1012,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (37,'2025-04-20',NULL,918,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (17,'2025-04-18',NULL,1071,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (5,'2025-04-16','2025-04-25',1218,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (36,'2025-04-06',NULL,913,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (4,'2025-04-04',NULL,1307,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (14,'2025-04-27','2025-04-28',1037,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (67,'2025-04-27','2025-04-29',1355,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (39,'2025-04-27','2025-04-29',1172,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (4,'2025-04-01','2025-04-09',1233,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (66,'2025-04-15','2025-04-21',1435,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (49,'2025-04-13',NULL,1299,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (30,'2025-04-14','2025-04-19',1245,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (65,'2025-04-11',NULL,1185,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (65,'2025-04-14','2025-04-20',929,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (80,'2025-04-26','2025-04-27',1013,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (91,'2025-04-28','2025-04-29',1495,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (2,'2025-04-11','2025-04-21',967,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (7,'2025-04-07','2025-04-15',1072,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (7,'2025-04-22','2025-04-24',1092,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (29,'2025-04-28','2025-04-29',1243,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (74,'2025-04-06','2025-04-15',1337,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (91,'2025-04-13','2025-04-21',1289,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (73,'2025-04-05','2025-04-11',1090,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (60,'2025-04-23',NULL,939,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (85,'2025-04-07','2025-04-15',1069,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (36,'2025-05-16','2025-05-20',973,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (32,'2025-05-28','2025-05-28',1128,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (57,'2025-05-22','2025-05-25',1391,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (16,'2025-05-02','2025-05-06',1476,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (41,'2025-05-25','2025-05-26',1060,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (35,'2025-05-01',NULL,1109,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (75,'2025-05-16','2025-05-22',940,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (80,'2025-05-23','2025-05-30',996,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (90,'2025-05-17',NULL,1128,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (39,'2025-05-13','2025-05-19',1344,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (8,'2025-05-17',NULL,1273,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (46,'2025-05-22','2025-05-22',1110,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (41,'2025-05-06','2025-05-16',1194,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (62,'2025-05-06','2025-05-13',1403,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (59,'2025-05-11',NULL,1291,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (54,'2025-05-16','2025-05-17',1400,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (31,'2025-05-01','2025-05-09',1180,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (39,'2025-05-01','2025-05-08',1042,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (12,'2025-05-05','2025-05-09',1387,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (27,'2025-05-28',NULL,1107,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (11,'2025-05-04','2025-05-11',1221,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (26,'2025-05-21','2025-05-28',1167,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (50,'2025-05-09',NULL,1141,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (99,'2025-05-10',NULL,924,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (23,'2025-05-19','2025-05-23',1195,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (5,'2025-05-18','2025-05-27',969,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (90,'2025-05-03',NULL,1179,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (10,'2025-05-21','2025-05-31',1335,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (69,'2025-05-25','2025-05-25',914,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (99,'2025-05-04',NULL,1403,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (53,'2025-05-26','2025-05-26',1036,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (81,'2025-05-19','2025-05-27',1268,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (20,'2025-05-08','2025-05-09',1356,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (86,'2025-05-19',NULL,1312,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (2,'2025-05-08','2025-05-17',1414,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (6,'2025-05-21','2025-05-24',1238,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (91,'2025-05-26','2025-05-30',1078,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (35,'2025-05-22',NULL,1132,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (31,'2025-05-28','2025-05-28',1326,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (42,'2025-05-27','2025-05-27',1345,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (80,'2025-05-17',NULL,904,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (1,'2025-05-02',NULL,1022,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (25,'2025-05-16',NULL,1354,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (3,'2025-05-07','2025-05-12',1492,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (42,'2025-05-05','2025-05-08',1276,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (58,'2025-05-14','2025-05-16',1400,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (14,'2025-05-20','2025-05-23',1124,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (83,'2025-05-13','2025-05-23',939,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (24,'2025-05-08','2025-05-14',1390,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (84,'2025-05-14',NULL,1099,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (95,'2025-05-26','2025-05-26',972,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (54,'2025-05-04',NULL,1444,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (27,'2025-06-06','2025-06-14',1243,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (33,'2025-06-23','2025-06-23',1433,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (66,'2025-06-27','2025-06-27',1334,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (87,'2025-06-01',NULL,1142,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (74,'2025-06-09',NULL,1213,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (4,'2025-06-09','2025-06-19',979,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (58,'2025-06-04','2025-06-12',1150,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (88,'2025-06-03','2025-06-09',1252,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (5,'2025-06-23','2025-06-30',1082,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (25,'2025-06-11','2025-06-20',919,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (67,'2025-06-03','2025-06-04',1061,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (71,'2025-06-24','2025-06-24',962,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (88,'2025-06-06','2025-06-08',1089,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (2,'2025-06-21',NULL,1208,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (24,'2025-06-18','2025-06-23',1111,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (55,'2025-06-13','2025-06-16',1062,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (9,'2025-06-10','2025-06-11',1083,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (72,'2025-06-18',NULL,1034,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (17,'2025-06-04','2025-06-05',1313,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (21,'2025-06-15','2025-06-21',1433,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (57,'2025-06-16',NULL,962,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (86,'2025-06-11',NULL,1492,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (22,'2025-06-18','2025-06-20',976,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (85,'2025-06-14',NULL,932,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (19,'2025-06-13','2025-06-14',1498,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (39,'2025-06-12',NULL,1249,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (26,'2025-06-10','2025-06-14',1303,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (81,'2025-06-28','2025-06-28',1100,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (57,'2025-06-10','2025-06-20',1198,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (1,'2025-06-25','2025-06-25',1127,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (34,'2025-06-07','2025-06-11',1020,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (75,'2025-06-24','2025-06-24',1179,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (80,'2025-06-16',NULL,1101,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (61,'2025-06-12','2025-06-20',1500,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (73,'2025-06-07','2025-06-10',1402,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (49,'2025-06-21',NULL,1331,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (52,'2025-06-06','2025-06-13',1449,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (76,'2025-06-27','2025-06-27',978,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (71,'2025-06-12','2025-06-18',1059,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (34,'2025-06-04','2025-06-10',1488,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (37,'2025-06-08','2025-06-15',1365,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (55,'2025-06-28',NULL,1420,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (72,'2025-06-28',NULL,908,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (91,'2025-06-12','2025-06-14',1084,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (25,'2025-06-12','2025-06-15',994,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (55,'2025-06-06',NULL,1327,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (41,'2025-06-11','2025-06-13',1454,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (70,'2025-06-16','2025-06-26',1246,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (3,'2025-06-03','2025-06-06',910,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (64,'2025-06-16','2025-06-19',949,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (30,'2025-06-03','2025-06-12',966,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (22,'2025-06-22','2025-06-28',1150,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (66,'2025-06-06',NULL,1351,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (57,'2025-06-27',NULL,952,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (2,'2025-06-14','2025-06-21',1105,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (93,'2025-06-11','2025-06-20',1294,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (13,'2025-06-03',NULL,1449,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (96,'2025-06-14','2025-06-20',1348,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (13,'2025-06-05','2025-06-12',1000,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (80,'2025-06-25','2025-06-25',1147,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (74,'2025-06-15','2025-06-20',1390,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (88,'2025-06-12',NULL,1449,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (58,'2025-06-22',NULL,1088,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (11,'2025-06-27','2025-06-27',933,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (51,'2025-06-09','2025-06-11',1399,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (56,'2025-06-17','2025-06-24',1165,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (92,'2025-06-04','2025-06-11',1458,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (81,'2025-06-02','2025-06-04',1470,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (51,'2025-06-12','2025-06-13',1044,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (65,'2025-06-28',NULL,1405,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (47,'2025-06-02','2025-06-04',1222,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (61,'2025-06-20','2025-06-28',963,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (5,'2025-06-19','2025-06-20',1269,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (41,'2025-06-14','2025-06-20',1483,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (50,'2025-06-26','2025-06-26',1397,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (9,'2025-06-10','2025-06-17',994,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (5,'2025-06-10',NULL,1326,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (9,'2025-06-27',NULL,1422,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (5,'2025-06-13','2025-06-14',1171,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (39,'2025-06-12','2025-06-15',1182,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (44,'2025-06-04','2025-06-06',1302,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (72,'2025-06-04','2025-06-05',1168,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (12,'2025-06-11',NULL,1463,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (6,'2025-06-06','2025-06-16',1195,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (19,'2025-06-10','2025-06-14',1451,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (30,'2025-06-14','2025-06-22',934,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (41,'2025-06-11','2025-06-15',1032,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (79,'2025-06-13','2025-06-17',991,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (27,'2025-06-03','2025-06-11',1355,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (58,'2025-06-28',NULL,1109,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (7,'2025-06-02',NULL,1132,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (81,'2025-06-19','2025-06-29',1270,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (19,'2025-06-22','2025-06-26',1135,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (63,'2025-06-22',NULL,996,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (18,'2025-06-28','2025-06-28',1284,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (41,'2025-06-13','2025-06-21',1311,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (78,'2025-06-14','2025-06-20',939,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (8,'2025-06-19','2025-06-21',1147,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (69,'2025-06-14',NULL,942,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (79,'2025-06-22','2025-06-29',1481,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (90,'2025-07-05','2025-07-13',1234,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (36,'2025-07-17',NULL,1194,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (44,'2025-07-04','2025-07-08',1441,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (85,'2025-07-04','2025-07-14',970,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (90,'2025-07-28','2025-07-28',1231,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (87,'2025-07-01',NULL,1413,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (7,'2025-07-14',NULL,1247,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (2,'2025-07-04','2025-07-11',1451,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (64,'2025-07-07',NULL,1396,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (10,'2025-07-16','2025-07-23',985,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (59,'2025-07-13',NULL,1008,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (39,'2025-07-03',NULL,1221,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (26,'2025-07-16','2025-07-25',1186,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (23,'2025-07-27','2025-07-31',1063,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (17,'2025-07-07','2025-07-15',1191,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (24,'2025-07-20','2025-07-23',1158,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (69,'2025-07-21','2025-07-23',1354,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (95,'2025-07-26','2025-07-26',1148,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (68,'2025-07-03',NULL,1422,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (25,'2025-07-21','2025-07-29',1312,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (72,'2025-07-20',NULL,1066,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (73,'2025-07-18','2025-07-25',1155,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (92,'2025-07-11','2025-07-21',941,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (10,'2025-07-28',NULL,1147,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (23,'2025-07-26',NULL,969,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (94,'2025-07-02','2025-07-05',967,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (77,'2025-07-02',NULL,1185,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (97,'2025-07-19',NULL,1110,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (83,'2025-07-28','2025-07-28',1491,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (19,'2025-07-06','2025-07-10',1043,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (55,'2025-07-11','2025-07-19',1480,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (64,'2025-07-14','2025-07-18',1028,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (95,'2025-07-25','2025-07-30',1278,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (7,'2025-07-05','2025-07-09',1456,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (27,'2025-07-03','2025-07-04',1280,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (51,'2025-07-12',NULL,1426,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (98,'2025-07-08','2025-07-12',1110,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (59,'2025-07-01','2025-07-09',1091,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (42,'2025-07-02','2025-07-08',1052,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (59,'2025-07-20',NULL,998,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (45,'2025-07-14','2025-07-22',1165,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (2,'2025-07-07','2025-07-11',1049,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (68,'2025-07-25','2025-07-25',1270,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (44,'2025-07-20','2025-07-24',1125,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (68,'2025-07-17','2025-07-26',1456,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (89,'2025-07-02',NULL,1060,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (89,'2025-07-22',NULL,1255,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (52,'2025-07-16',NULL,958,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (29,'2025-07-25','2025-07-25',1172,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (8,'2025-07-01','2025-07-10',1280,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (9,'2025-07-05','2025-07-10',941,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (45,'2025-07-26','2025-07-27',1384,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (74,'2025-07-13','2025-07-17',1385,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (94,'2025-07-21','2025-07-29',1265,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (55,'2025-07-17',NULL,1459,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (85,'2025-07-08','2025-07-09',1103,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (77,'2025-07-07','2025-07-08',1105,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (20,'2025-07-21','2025-07-26',984,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (85,'2025-07-06','2025-07-10',1408,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (76,'2025-07-24',NULL,1018,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (7,'2025-07-24',NULL,961,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (25,'2025-07-22','2025-07-30',988,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (18,'2025-07-26','2025-07-26',1259,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (57,'2025-07-22','2025-07-23',1469,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (59,'2025-07-25','2025-07-25',1094,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (40,'2025-07-24',NULL,939,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (71,'2025-07-27',NULL,1077,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (39,'2025-07-04','2025-07-12',1038,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (86,'2025-07-04','2025-07-06',1112,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (7,'2025-07-01',NULL,1222,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (58,'2025-07-05','2025-07-06',1200,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (87,'2025-07-18','2025-07-28',1454,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (100,'2025-07-11','2025-07-12',1466,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (43,'2025-07-20','2025-07-22',1301,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (79,'2025-07-08',NULL,1093,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (84,'2025-07-20','2025-07-24',1355,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (31,'2025-07-04',NULL,1355,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (85,'2025-07-25','2025-07-25',1367,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (24,'2025-07-27','2025-07-27',1500,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (68,'2025-07-24','2025-07-31',1482,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (44,'2025-07-26','2025-07-26',1462,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (87,'2025-07-02','2025-07-08',945,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (26,'2025-07-11','2025-07-18',997,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (81,'2025-07-14','2025-07-17',1086,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (38,'2025-07-18','2025-07-25',924,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (57,'2025-07-26','2025-07-26',1262,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (75,'2025-07-09',NULL,1219,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (70,'2025-08-26','2025-08-30',1413,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (54,'2025-08-15',NULL,1254,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (72,'2025-08-06','2025-08-16',1197,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (36,'2025-08-23','2025-08-31',1453,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (11,'2025-08-14','2025-08-18',1181,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (56,'2025-08-03','2025-08-11',1308,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (85,'2025-08-28',NULL,951,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (46,'2025-08-14','2025-08-18',1416,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (61,'2025-08-14','2025-08-24',929,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (3,'2025-08-19',NULL,1008,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (40,'2025-08-20','2025-08-27',1036,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (53,'2025-08-06',NULL,1321,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (16,'2025-08-18','2025-08-24',1026,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (49,'2025-08-06','2025-08-09',1278,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (98,'2025-08-03','2025-08-04',1389,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (41,'2025-08-04','2025-08-05',1407,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (21,'2025-08-10','2025-08-17',1358,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (60,'2025-08-12','2025-08-16',1452,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (30,'2025-08-27','2025-08-29',986,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (84,'2025-08-09',NULL,1373,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (63,'2025-08-24','2025-08-24',1149,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (28,'2025-08-05','2025-08-15',1420,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (86,'2025-08-10','2025-08-17',1265,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (50,'2025-08-07','2025-08-15',1049,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (75,'2025-08-24',NULL,1123,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (46,'2025-08-25',NULL,1442,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (89,'2025-08-01','2025-08-08',1106,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (42,'2025-08-19',NULL,953,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (97,'2025-08-12','2025-08-18',947,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (83,'2025-08-18',NULL,966,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (55,'2025-08-12','2025-08-20',1212,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (89,'2025-08-11','2025-08-17',1279,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (64,'2025-08-26','2025-08-29',1235,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (39,'2025-08-26',NULL,1257,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (13,'2025-08-25',NULL,1428,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (24,'2025-08-07',NULL,1282,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (81,'2025-08-16','2025-08-25',1384,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (48,'2025-08-24',NULL,1069,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (45,'2025-08-11','2025-08-12',1435,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (23,'2025-08-10','2025-08-11',1264,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (33,'2025-08-10','2025-08-19',933,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (72,'2025-08-01','2025-08-07',1299,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (56,'2025-08-25','2025-08-29',1438,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (51,'2025-08-22','2025-08-24',1154,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (29,'2025-08-02','2025-08-10',1065,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (24,'2025-08-23','2025-08-28',1355,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (18,'2025-08-06',NULL,1230,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (51,'2025-08-04','2025-08-09',1163,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (46,'2025-08-06','2025-08-13',1047,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (70,'2025-08-23',NULL,1426,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (93,'2025-08-23','2025-08-27',1302,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (78,'2025-08-11','2025-08-17',1133,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (94,'2025-08-22','2025-08-29',1242,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (45,'2025-08-18',NULL,1257,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (14,'2025-08-19','2025-08-23',1332,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (72,'2025-08-10','2025-08-11',1095,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (36,'2025-08-20',NULL,1323,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (6,'2025-08-20',NULL,1141,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (99,'2025-08-24',NULL,1161,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (23,'2025-08-05','2025-08-11',1349,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (37,'2025-08-03','2025-08-10',1480,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (76,'2025-08-05','2025-08-13',900,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (94,'2025-08-01',NULL,1217,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (23,'2025-08-02',NULL,1421,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (7,'2025-08-20','2025-08-22',1211,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (62,'2025-08-28',NULL,1460,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (2,'2025-08-08','2025-08-09',1268,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (65,'2025-08-06','2025-08-08',1238,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (64,'2025-08-10',NULL,1063,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (66,'2025-08-03','2025-08-11',1121,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (94,'2025-08-19',NULL,931,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (22,'2025-08-19','2025-08-21',1195,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (12,'2025-08-13','2025-08-18',1425,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (24,'2025-08-19','2025-08-23',1375,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (90,'2025-08-02','2025-08-12',1140,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (55,'2025-08-23','2025-08-24',1252,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (69,'2025-08-05','2025-08-07',1477,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (81,'2025-08-06',NULL,1197,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (56,'2025-08-19','2025-08-28',1415,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (22,'2025-08-09','2025-08-15',1238,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (81,'2025-08-25','2025-08-28',942,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (19,'2025-08-19','2025-08-20',931,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (92,'2025-08-21','2025-08-27',1071,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (72,'2025-08-09',NULL,1327,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (47,'2025-08-11',NULL,1392,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (78,'2025-09-05','2025-09-11',1094,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (14,'2025-09-06','2025-09-09',1117,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (14,'2025-09-02','2025-09-04',1159,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (5,'2025-09-08','2025-09-13',1313,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (5,'2025-09-06','2025-09-14',1417,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (41,'2025-09-02','2025-09-05',1250,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (84,'2025-09-19','2025-09-27',1282,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (55,'2025-09-03',NULL,1355,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (3,'2025-09-20','2025-09-26',1481,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (52,'2025-09-13',NULL,1454,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (98,'2025-09-07',NULL,1466,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (13,'2025-09-12','2025-09-15',917,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (2,'2025-09-05','2025-09-12',1474,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (4,'2025-09-01',NULL,1097,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (40,'2025-09-23','2025-09-27',1252,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (18,'2025-09-18','2025-09-25',1489,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (90,'2025-09-11','2025-09-14',1132,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (28,'2025-09-23','2025-09-30',1325,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (42,'2025-09-16',NULL,1398,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (47,'2025-09-20',NULL,1252,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (35,'2025-09-01','2025-09-05',1351,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (51,'2025-09-21',NULL,1290,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (15,'2025-09-22','2025-09-28',1042,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (2,'2025-09-17',NULL,1146,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (41,'2025-09-23','2025-09-27',1047,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (87,'2025-09-26','2025-09-26',1032,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (83,'2025-09-02',NULL,1149,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (32,'2025-09-05','2025-09-13',994,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (3,'2025-09-04','2025-09-07',989,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (34,'2025-09-02','2025-09-05',1497,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (59,'2025-09-01',NULL,1318,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (65,'2025-09-02',NULL,1375,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (30,'2025-09-23','2025-09-26',1213,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (9,'2025-09-09','2025-09-18',1435,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (34,'2025-09-11','2025-09-20',1333,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (27,'2025-09-03','2025-09-07',1038,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (100,'2025-09-12','2025-09-14',1404,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (8,'2025-09-08',NULL,1389,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (51,'2025-09-17',NULL,1231,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (19,'2025-09-04','2025-09-08',1500,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (43,'2025-09-08','2025-09-14',909,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (16,'2025-09-16','2025-09-23',928,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (69,'2025-09-06','2025-09-08',1051,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (76,'2025-09-13',NULL,1351,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (2,'2025-09-26','2025-09-26',1254,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (63,'2025-09-10','2025-09-14',1000,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (46,'2025-09-10','2025-09-11',1444,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (100,'2025-09-06',NULL,1115,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (74,'2025-09-27','2025-09-28',1316,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (33,'2025-09-20',NULL,1284,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (84,'2025-09-19','2025-09-26',1261,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (8,'2025-09-12',NULL,1314,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (13,'2025-09-13','2025-09-22',1074,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (18,'2025-09-20','2025-09-26',1431,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (100,'2025-09-22',NULL,986,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (86,'2025-09-19','2025-09-29',1355,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (12,'2025-09-11','2025-09-12',1160,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (26,'2025-09-05',NULL,1058,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (3,'2025-09-21',NULL,1136,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (74,'2025-09-09','2025-09-13',1037,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (82,'2025-09-07','2025-09-13',1116,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (21,'2025-09-16','2025-09-22',970,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (19,'2025-09-01','2025-09-05',1094,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (49,'2025-09-23','2025-09-27',1482,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (72,'2025-09-07',NULL,926,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (1,'2025-09-17','2025-09-26',1314,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (66,'2025-09-06','2025-09-10',1190,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (46,'2025-09-11','2025-09-21',1288,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (67,'2025-09-10','2025-09-18',1374,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (24,'2025-09-11','2025-09-19',1370,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (79,'2025-09-06','2025-09-16',1364,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (37,'2025-09-23',NULL,1497,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (8,'2025-09-03','2025-09-09',1114,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (57,'2025-09-08','2025-09-16',1267,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (57,'2025-09-24','2025-09-27',1093,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (4,'2025-09-05',NULL,1144,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (49,'2025-09-24','2025-09-26',1356,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (37,'2025-09-08',NULL,1118,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (14,'2025-09-13','2025-09-18',982,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (62,'2025-09-12','2025-09-15',1232,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (55,'2025-09-16','2025-09-20',1315,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (91,'2025-09-02','2025-09-10',981,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (11,'2025-09-14',NULL,1097,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (73,'2025-09-15','2025-09-19',1045,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (24,'2025-10-11','2025-10-17',1249,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (54,'2025-10-14','2025-10-16',1367,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (27,'2025-10-03','2025-10-04',1111,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (30,'2025-10-03',NULL,1259,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (72,'2025-10-06','2025-10-15',1067,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (9,'2025-10-24','2025-10-29',1478,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (91,'2025-10-06','2025-10-07',1498,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (72,'2025-10-21','2025-10-23',1055,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (68,'2025-10-09','2025-10-13',1451,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (70,'2025-10-01',NULL,1116,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (13,'2025-10-26','2025-10-26',1339,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (82,'2025-10-28','2025-10-28',1178,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (20,'2025-10-05','2025-10-13',1451,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (72,'2025-10-20',NULL,1447,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (96,'2025-10-21','2025-10-24',1150,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (73,'2025-10-13',NULL,1241,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (41,'2025-10-17','2025-10-25',1481,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (36,'2025-10-19',NULL,1132,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (54,'2025-10-28',NULL,1406,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (61,'2025-10-12','2025-10-16',1165,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (37,'2025-10-06','2025-10-10',1183,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (24,'2025-10-15','2025-10-22',1310,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (34,'2025-10-14','2025-10-18',973,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (77,'2025-10-28','2025-10-31',1061,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (98,'2025-10-07',NULL,927,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (85,'2025-10-24','2025-10-29',1152,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (81,'2025-10-05',NULL,1393,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (64,'2025-10-26',NULL,1391,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (1,'2025-10-10','2025-10-20',1168,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (69,'2025-10-16',NULL,1357,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (21,'2025-10-08','2025-10-09',995,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (15,'2025-10-21',NULL,1326,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (45,'2025-10-22',NULL,1465,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (28,'2025-10-12','2025-10-22',1277,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (40,'2025-10-05','2025-10-10',1230,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (7,'2025-10-13','2025-10-15',1421,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (57,'2025-10-10','2025-10-13',1362,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (80,'2025-10-12',NULL,1399,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (67,'2025-10-25',NULL,1191,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (77,'2025-10-23',NULL,980,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (78,'2025-10-13','2025-10-18',1102,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (77,'2025-10-11',NULL,1211,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (39,'2025-10-10','2025-10-14',1151,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (68,'2025-10-20','2025-10-22',1329,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (33,'2025-10-24','2025-10-30',1308,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (92,'2025-10-04','2025-10-12',981,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (35,'2025-10-16','2025-10-20',932,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (69,'2025-10-22',NULL,1036,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (21,'2025-10-20','2025-10-24',1242,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (24,'2025-10-04','2025-10-09',937,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (60,'2025-10-09','2025-10-11',1184,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (75,'2025-10-02','2025-10-09',1262,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (83,'2025-10-25','2025-10-25',1377,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (17,'2025-10-19',NULL,1318,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (64,'2025-10-17','2025-10-22',1425,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (2,'2025-10-10',NULL,936,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (99,'2025-10-19','2025-10-22',1213,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (20,'2025-10-26',NULL,1123,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (55,'2025-10-24','2025-10-26',1190,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (98,'2025-10-18','2025-10-27',1274,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (31,'2025-10-27',NULL,1494,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (93,'2025-10-28',NULL,1210,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (31,'2025-10-22','2025-10-22',1036,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (23,'2025-10-25','2025-10-28',1391,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (43,'2025-10-12',NULL,1468,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (35,'2025-10-28','2025-10-28',1064,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (92,'2025-10-19',NULL,920,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (46,'2025-10-25',NULL,1463,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (63,'2025-10-15','2025-10-23',1119,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (89,'2025-10-15','2025-10-22',1033,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (18,'2025-10-02','2025-10-12',1141,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (82,'2025-10-16','2025-10-25',1358,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (4,'2025-10-23','2025-10-31',974,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (90,'2025-10-03','2025-10-05',1285,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (32,'2025-10-11','2025-10-12',1079,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (77,'2025-10-16','2025-10-20',949,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (2,'2025-10-14',NULL,1251,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (50,'2025-10-05','2025-10-13',1163,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (78,'2025-10-14','2025-10-22',1069,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (36,'2025-10-01','2025-10-06',1273,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (65,'2025-10-16',NULL,1128,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (73,'2025-10-20','2025-10-23',1304,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (2,'2025-10-07','2025-10-15',1132,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (52,'2025-10-04','2025-10-08',1399,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (43,'2025-10-24','2025-10-24',1290,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (22,'2025-10-13',NULL,1342,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (11,'2025-10-09','2025-10-17',1101,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (8,'2025-10-14',NULL,1427,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (71,'2025-10-05',NULL,1447,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (92,'2025-10-19','2025-10-24',1165,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (54,'2025-10-11','2025-10-14',1453,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (3,'2025-10-28','2025-10-28',1390,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (71,'2025-10-08','2025-10-13',1353,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (43,'2025-10-05','2025-10-10',1203,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (5,'2025-10-22','2025-10-23',1112,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (12,'2025-10-02','2025-10-05',924,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (7,'2025-11-18',NULL,1048,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (47,'2025-11-28',NULL,1370,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (25,'2025-11-15','2025-11-25',1079,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (18,'2025-11-03','2025-11-04',1473,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (22,'2025-11-02',NULL,907,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (74,'2025-11-10','2025-11-14',1128,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (6,'2025-11-20','2025-11-30',1282,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (11,'2025-11-24',NULL,1300,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (12,'2025-11-11','2025-11-19',1391,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (14,'2025-11-03','2025-11-12',1242,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (61,'2025-11-24','2025-11-26',996,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (88,'2025-11-16','2025-11-22',1069,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (47,'2025-11-17','2025-11-25',1353,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (58,'2025-11-05','2025-11-11',993,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (94,'2025-11-21','2025-11-21',1393,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (82,'2025-11-13','2025-11-14',1115,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (37,'2025-11-10',NULL,1215,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (83,'2025-11-17','2025-11-20',1425,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (13,'2025-11-09','2025-11-11',1209,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (25,'2025-11-07',NULL,1008,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (18,'2025-11-02','2025-11-05',900,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (72,'2025-11-25','2025-11-30',1188,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (62,'2025-11-04','2025-11-11',908,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (2,'2025-11-08','2025-11-14',1113,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (27,'2025-11-19','2025-11-26',1488,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (95,'2025-11-12','2025-11-16',1187,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (15,'2025-11-06',NULL,1203,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (100,'2025-11-20','2025-11-29',1259,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (21,'2025-11-06',NULL,1076,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (60,'2025-11-19',NULL,1045,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (66,'2025-11-17','2025-11-26',1308,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (42,'2025-11-16','2025-11-24',1492,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (82,'2025-11-15','2025-11-25',981,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (97,'2025-11-12',NULL,1209,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (79,'2025-11-10','2025-11-12',1093,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (28,'2025-11-05','2025-11-14',972,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (40,'2025-11-20',NULL,917,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (85,'2025-11-11',NULL,1162,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (41,'2025-11-20',NULL,1175,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (24,'2025-11-08',NULL,1440,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (97,'2025-11-23','2025-11-25',1446,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (74,'2025-11-23','2025-11-26',949,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (76,'2025-11-02',NULL,1423,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (37,'2025-11-28',NULL,1344,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (82,'2025-11-19','2025-11-29',1190,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (62,'2025-11-12','2025-11-14',1374,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (87,'2025-11-26',NULL,1020,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (19,'2025-11-27','2025-11-27',1230,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (5,'2025-11-10','2025-11-14',1449,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (68,'2025-11-07','2025-11-16',1206,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (54,'2025-11-03',NULL,1210,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (98,'2025-11-20','2025-11-22',1141,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (81,'2025-12-14','2025-12-18',1064,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (48,'2025-12-19','2025-12-21',1424,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (54,'2025-12-09','2025-12-17',1302,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (47,'2025-12-14','2025-12-21',991,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (51,'2025-12-11',NULL,1484,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (84,'2025-12-24','2025-12-24',988,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (82,'2025-12-28','2025-12-28',1337,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (74,'2025-12-09','2025-12-18',1151,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (95,'2025-12-18',NULL,1147,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (35,'2025-12-24','2025-12-27',1252,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (62,'2025-12-17','2025-12-27',925,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (16,'2025-12-14',NULL,1473,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (37,'2025-12-25','2025-12-31',1114,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (15,'2025-12-11',NULL,1499,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (4,'2025-12-24','2025-12-24',1375,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (75,'2025-12-15',NULL,1407,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (98,'2025-12-01','2025-12-11',1264,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (7,'2025-12-19','2025-12-27',1456,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (4,'2025-12-15','2025-12-25',1005,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (89,'2025-12-03','2025-12-06',937,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (91,'2025-12-21','2025-12-28',948,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (91,'2025-12-13','2025-12-20',1121,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (90,'2025-12-13','2025-12-22',1405,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (79,'2025-12-22',NULL,1123,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (69,'2025-12-06','2025-12-13',992,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (6,'2025-12-23',NULL,1018,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (42,'2025-12-12','2025-12-15',1244,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (40,'2025-12-17','2025-12-20',1471,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (28,'2025-12-26','2025-12-26',1439,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (12,'2025-12-10','2025-12-14',1127,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (37,'2025-12-10','2025-12-20',938,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (34,'2025-12-18','2025-12-20',1473,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (48,'2025-12-06',NULL,1499,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (53,'2025-12-09','2025-12-16',1433,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (31,'2025-12-07',NULL,1125,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (90,'2025-12-24','2025-12-29',985,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (7,'2025-12-24','2025-12-28',1135,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (99,'2025-12-15','2025-12-21',918,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (36,'2025-12-04','2025-12-11',1137,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (42,'2025-12-28',NULL,1044,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (82,'2025-12-04','2025-12-07',1179,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (85,'2025-12-21',NULL,1254,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (82,'2025-12-27','2025-12-30',1364,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (55,'2025-12-08','2025-12-15',1053,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (29,'2025-12-23',NULL,922,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (75,'2025-12-12','2025-12-21',1001,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (14,'2025-12-13','2025-12-16',1404,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (57,'2025-12-26','2025-12-26',1122,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (37,'2025-12-07','2025-12-13',1438,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (4,'2025-12-17',NULL,929,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (73,'2025-12-20','2025-12-27',1023,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (93,'2025-12-05','2025-12-12',1001,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (21,'2025-12-21','2025-12-24',1033,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (30,'2025-12-28','2025-12-28',1214,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (69,'2025-12-04','2025-12-10',903,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (46,'2025-12-21','2025-12-25',1204,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (2,'2025-12-19',NULL,1012,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (52,'2025-12-12','2025-12-22',1127,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (53,'2025-12-04','2025-12-13',1396,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (12,'2025-12-08',NULL,1062,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (5,'2025-12-21',NULL,974,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (64,'2025-12-20',NULL,1219,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (18,'2025-12-12','2025-12-19',1041,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (6,'2025-12-22',NULL,1344,'Cancelado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (93,'2025-12-02','2025-12-05',1477,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (77,'2025-12-17',NULL,1341,'Pendiente');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (63,'2025-12-06','2025-12-12',977,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (72,'2025-12-10','2025-12-11',912,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (44,'2025-12-03','2025-12-10',1120,'Firmado');
INSERT INTO contratos_kpi (id_cliente,fecha_creacion,fecha_firma,monto,estado) VALUES (48,'2025-12-18',NULL,1370,'Pendiente');



