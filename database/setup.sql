-- Base de datos para Wa-Bot
-- Ejecutar en MySQL

CREATE DATABASE IF NOT EXISTS wa_bot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wa_bot_db;

-- Tabla de permisos/roles
CREATE TABLE IF NOT EXISTS permisos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    permisoId INT NOT NULL,
    fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (permisoId) REFERENCES permisos(id)
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    telefono VARCHAR(20) NOT NULL UNIQUE,
    direccion TEXT,
    fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- Tabla de bodegas
CREATE TABLE IF NOT EXISTS bodegas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(255) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(20),
    fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10, 2) NOT NULL,
    imagenUrl VARCHAR(500),
    fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- Tabla de inventario
CREATE TABLE IF NOT EXISTS inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    productoId INT NOT NULL,
    bodegaId INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 0,
    fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (productoId) REFERENCES productos(id),
    FOREIGN KEY (bodegaId) REFERENCES bodegas(id),
    UNIQUE KEY unique_producto_bodega (productoId, bodegaId)
);

-- Tabla de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clienteId INT NOT NULL,
    items JSON NOT NULL,
    montoTotal DECIMAL(10, 2) NOT NULL,
    estado ENUM('PENDIENTE', 'CONFIRMADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO') DEFAULT 'PENDIENTE',
    fechaPedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (clienteId) REFERENCES clientes(id)
);

-- Tabla de ventas
CREATE TABLE IF NOT EXISTS ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedidoId INT NOT NULL,
    clienteId INT NOT NULL,
    items JSON NOT NULL,
    montoTotal DECIMAL(10, 2) NOT NULL,
    metodoPago VARCHAR(50),
    referenciaPago VARCHAR(100),
    fechaVenta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedidoId) REFERENCES pedidos(id),
    FOREIGN KEY (clienteId) REFERENCES clientes(id)
);

-- Insertar datos iniciales
INSERT INTO permisos (nombre, descripcion) VALUES 
('ADMIN', 'Administrador del sistema'),
('USER', 'Usuario regular'),
('OPERATOR', 'Operador de ventas');

INSERT INTO bodegas (nombre, ubicacion, contacto) VALUES 
('Bodega Principal', 'Calle 123 #45-67, Bogotá', 'Juan Pérez');

INSERT INTO productos (nombre, descripcion, precio) VALUES 
('Producto Demo', 'Producto de demostración', 10000.00),
('Camiseta Básica', 'Camiseta de algodón 100%', 25000.00),
('Pantalón Jean', 'Pantalón jean clásico', 45000.00);

INSERT INTO inventario (productoId, bodegaId, cantidad) VALUES 
(1, 1, 100),
(2, 1, 50),
(3, 1, 30);

-- Usuario administrador por defecto (password: admin123)
INSERT INTO usuarios (nombre, email, password, permisoId) VALUES 
('Administrador', 'admin@wabot.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1);
