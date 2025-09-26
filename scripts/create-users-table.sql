-- Script para crear la tabla de usuarios
-- Ejecutar este script en PostgreSQL para crear la tabla de usuarios

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
    active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insertar usuario administrador por defecto
-- Contraseña: admin123 (encriptada con bcrypt)
INSERT INTO users (username, email, password, role, active) 
VALUES (
    'admin', 
    'admin@multidel.com', 
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8QzK8K2', -- admin123
    'admin', 
    true
) ON CONFLICT (username) DO NOTHING;

-- Insertar usuario gerente de ejemplo
-- Contraseña: manager123 (encriptada con bcrypt)
INSERT INTO users (username, email, password, role, active) 
VALUES (
    'manager', 
    'manager@multidel.com', 
    '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- manager123
    'manager', 
    true
) ON CONFLICT (username) DO NOTHING;

-- Insertar usuario staff de ejemplo
-- Contraseña: staff123 (encriptada con bcrypt)
INSERT INTO users (username, email, password, role, active) 
VALUES (
    'staff', 
    'staff@multidel.com', 
    '$2a$12$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', -- staff123
    'staff', 
    true
) ON CONFLICT (username) DO NOTHING;

-- Comentarios sobre la tabla
COMMENT ON TABLE users IS 'Tabla de usuarios del sistema MultiDel';
COMMENT ON COLUMN users.id IS 'ID único del usuario';
COMMENT ON COLUMN users.username IS 'Nombre de usuario único';
COMMENT ON COLUMN users.email IS 'Email único del usuario';
COMMENT ON COLUMN users.password IS 'Contraseña encriptada con bcrypt';
COMMENT ON COLUMN users.role IS 'Rol del usuario: admin, manager, staff';
COMMENT ON COLUMN users.active IS 'Indica si el usuario está activo';
COMMENT ON COLUMN users.last_login IS 'Última vez que el usuario inició sesión';
COMMENT ON COLUMN users.created_at IS 'Fecha de creación del usuario';
COMMENT ON COLUMN users.updated_at IS 'Fecha de última actualización del usuario';

-- Mostrar información de la tabla creada
SELECT 
    'Tabla de usuarios creada exitosamente' as mensaje,
    COUNT(*) as usuarios_creados
FROM users;

-- Mostrar usuarios creados
SELECT 
    id,
    username,
    email,
    role,
    active,
    created_at
FROM users 
ORDER BY created_at;
