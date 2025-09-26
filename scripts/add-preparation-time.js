const db = require('../config/database');

async function addPreparationTimeColumn() {
    try {
        console.log('🔄 Agregando columna preparation_time a la tabla orders...');
        
        // Agregar columna preparation_time
        await db.query(`
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS preparation_time INTEGER DEFAULT 15
        `);
        
        // Agregar comentario a la columna
        await db.query(`
            COMMENT ON COLUMN orders.preparation_time IS 'Tiempo de preparación en minutos'
        `);
        
        console.log('✅ Columna preparation_time agregada correctamente');
        
        // Verificar que la columna existe
        const result = await db.query(`
            SELECT column_name, data_type, column_default, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'orders' AND column_name = 'preparation_time'
        `);
        
        if (result.rows.length > 0) {
            console.log('✅ Verificación exitosa - Columna preparation_time existe');
            console.log('📋 Detalles de la columna:', result.rows[0]);
        } else {
            console.error('❌ Error: La columna no se creó correctamente');
        }
        
    } catch (error) {
        console.error('❌ Error agregando columna preparation_time:', error);
        throw error;
    }
}

// Ejecutar migración
addPreparationTimeColumn().then(() => {
    console.log('🎉 Migración completada exitosamente');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Error en migración:', error);
    process.exit(1);
}); 