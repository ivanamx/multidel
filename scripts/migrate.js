require('dotenv').config();
const db = require('../config/database');

async function createTables() {
    try {
        console.log('🔄 Creando tablas de la base de datos...');

        // Crear tabla de plataformas
        await db.query(`
            CREATE TABLE IF NOT EXISTS platforms (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                api_url VARCHAR(255),
                client_id VARCHAR(255),
                client_secret VARCHAR(255),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla de pedidos
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                platform_id INTEGER REFERENCES platforms(id),
                platform_order_id VARCHAR(255) NOT NULL,
                customer_name VARCHAR(255) NOT NULL,
                customer_phone VARCHAR(50),
                customer_address TEXT,
                customer_lat DECIMAL(10,8),
                customer_lng DECIMAL(11,8),
                driver_lat DECIMAL(10,8),
                driver_lng DECIMAL(11,8),
                items JSONB,
                total_amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                platform_status VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla de configuración de webhooks
        await db.query(`
            CREATE TABLE IF NOT EXISTS webhook_configs (
                id SERIAL PRIMARY KEY,
                platform_id INTEGER REFERENCES platforms(id),
                webhook_url VARCHAR(255) NOT NULL,
                secret_key VARCHAR(255),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla de logs de pedidos
        await db.query(`
            CREATE TABLE IF NOT EXISTS order_logs (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES orders(id),
                status VARCHAR(50) NOT NULL,
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla de tracking de entregas
        await db.query(`
            CREATE TABLE IF NOT EXISTS delivery_tracking (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES orders(id) UNIQUE,
                platform VARCHAR(100) NOT NULL,
                driver_lat DECIMAL(10,8),
                driver_lng DECIMAL(11,8),
                estimated_arrival TIMESTAMP,
                status VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insertar plataformas por defecto
        await db.query(`
            INSERT INTO platforms (name) VALUES 
            ('Uber Eats'),
            ('Rappi'),
            ('Didi Food')
            ON CONFLICT (name) DO NOTHING
        `);

        console.log('✅ Tablas creadas correctamente');
    } catch (error) {
        console.error('❌ Error creando tablas:', error);
        throw error;
    }
}

createTables().then(() => {
    console.log('🎉 Migración completada');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Error en migración:', error);
    process.exit(1);
});