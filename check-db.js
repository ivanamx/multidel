const db = require('./config/database');

async function checkDatabase() {
    try {
        console.log('🔍 Verificando estado de la base de datos...');
        
        // Verificar plataformas
        const platformsResult = await db.query('SELECT COUNT(*) as count FROM platforms');
        console.log(`📊 Plataformas: ${platformsResult.rows[0].count}`);
        
        // Verificar pedidos
        const ordersResult = await db.query('SELECT COUNT(*) as count FROM orders');
        console.log(`📦 Pedidos: ${ordersResult.rows[0].count}`);
        
        // Verificar pedidos de hoy
        const today = new Date().toISOString().split('T')[0];
        const todayOrdersResult = await db.query(`
            SELECT COUNT(*) as count 
            FROM orders 
            WHERE DATE(created_at) = $1
        `, [today]);
        console.log(`📅 Pedidos de hoy (${today}): ${todayOrdersResult.rows[0].count}`);
        
        // Mostrar algunos pedidos de ejemplo
        const sampleOrdersResult = await db.query(`
            SELECT id, platform_order_id, customer_name, status, total_amount, created_at
            FROM orders 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        if (sampleOrdersResult.rows.length > 0) {
            console.log('\n📋 Últimos 5 pedidos:');
            sampleOrdersResult.rows.forEach(order => {
                console.log(`  - ID: ${order.id}, Cliente: ${order.customer_name}, Estado: ${order.status}, Total: $${order.total_amount}`);
            });
        } else {
            console.log('\n❌ No hay pedidos en la base de datos');
        }
        
    } catch (error) {
        console.error('❌ Error verificando base de datos:', error);
    } finally {
        process.exit(0);
    }
}

checkDatabase();