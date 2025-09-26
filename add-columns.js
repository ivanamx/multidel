require('dotenv').config();
const db = require('./config/database');

async function addColumns() {
    try {
        console.log('🔧 Agregando columnas de coordenadas...');
        
        // Agregar columnas de coordenadas
        await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_lat DECIMAL(10,8)');
        await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_lng DECIMAL(11,8)');
        await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_lat DECIMAL(10,8)');
        await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_lng DECIMAL(11,8)');
        await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_status VARCHAR(50)');
        
        console.log('✅ Columnas de coordenadas agregadas correctamente');
        
        console.log('🔧 Agregando columnas para sistema de confirmación...');
        
        // Agregar columnas para el sistema de confirmación
        await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP');
        await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP');
        await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT');
        
        console.log('✅ Columnas de confirmación agregadas correctamente');
        
        // Verificar la estructura de la tabla
        const result = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'orders' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Estructura actual de la tabla orders:');
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });
        
    } catch (error) {
        console.error('❌ Error agregando columnas:', error);
    } finally {
        process.exit(0);
    }
}

addColumns();