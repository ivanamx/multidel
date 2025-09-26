require('dotenv').config();
const db = require('../config/database');

const migrateStatuses = async () => {
  try {
    console.log('🔄 Iniciando migración de estados...');
    
    // Migrar confirmed a pending
    const confirmedResult = await db.query(`
      UPDATE orders 
      SET status = 'pending', platform_status = 'pending', updated_at = CURRENT_TIMESTAMP 
      WHERE status = 'confirmed'
    `);
    
    console.log(`✅ Migrados ${confirmedResult.rowCount} pedidos de 'confirmed' a 'pending'`);
    
    // Migrar cancelled a delivered
    const cancelledResult = await db.query(`
      UPDATE orders 
      SET status = 'delivered', platform_status = 'delivered', updated_at = CURRENT_TIMESTAMP 
      WHERE status = 'cancelled'
    `);
    
    console.log(`✅ Migrados ${cancelledResult.rowCount} pedidos de 'cancelled' a 'delivered'`);
    
    // Verificar estados actuales
    const statusStats = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      GROUP BY status 
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Estados actuales en la base de datos:');
    statusStats.rows.forEach(row => {
      console.log(`  - ${row.status}: ${row.count} pedidos`);
    });
    
    // Verificar si hay estados no válidos
    const invalidStatuses = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      WHERE status NOT IN ('pending', 'preparing', 'ready', 'delivering', 'delivered')
      GROUP BY status
    `);
    
    if (invalidStatuses.rows.length > 0) {
      console.log('\n⚠️  Estados no válidos encontrados:');
      invalidStatuses.rows.forEach(row => {
        console.log(`  - ${row.status}: ${row.count} pedidos`);
      });
    } else {
      console.log('\n✅ Todos los estados son válidos');
    }
    
    console.log('\n🎉 Migración completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
};

migrateStatuses().then(() => {
  console.log('🏁 Script de migración finalizado');
  process.exit(0);
}); 