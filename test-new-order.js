require('dotenv').config();
const db = require('./config/database');

const testNewOrder = async () => {
  try {
    console.log('🧪 Creando pedido de prueba para el modal de confirmación...');

    // Obtener una plataforma
    const platformsResult = await db.query('SELECT id, name FROM platforms LIMIT 1');
    if (platformsResult.rows.length === 0) {
      console.log('❌ No se encontraron plataformas. Ejecuta primero la migración.');
      process.exit(1);
    }
    const platform = platformsResult.rows[0];

    // Crear un pedido de prueba con estado 'pending'
    const testOrder = {
      platform_id: platform.id,
      platform_order_id: `TEST-${Date.now()}`,
      customer_name: 'Cliente de Prueba',
      customer_phone: '+593 912345678',
      customer_address: 'Av. Principal 123, Quito, Ecuador',
      customer_lat: -0.2299,
      customer_lng: -78.5249,
      driver_lat: -0.2300,
      driver_lng: -78.5250,
      items: [
        {
          name: 'Hamburguesa Clásica',
          price: 12.50,
          quantity: 2,
          total: 25.00,
          notes: 'Sin cebolla, extra queso'
        },
        {
          name: 'Papas Fritas',
          price: 4.50,
          quantity: 1,
          total: 4.50,
          notes: 'Bien crujientes'
        },
        {
          name: 'Bebida Gaseosa',
          price: 3.00,
          quantity: 2,
          total: 6.00,
          notes: 'Coca Cola'
        }
      ],
      total_amount: 35.50,
      status: 'pending',
      platform_status: 'pending',
      special_instructions: 'Entregar en la puerta principal, tocar timbre dos veces',
      payment_method: 'Tarjeta de crédito',
      created_at: new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"}),
      updated_at: new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"})
    };

    // Insertar el pedido
    const result = await db.query(`
      INSERT INTO orders (
        platform_id, platform_order_id, customer_name, customer_phone, 
        customer_address, customer_lat, customer_lng, driver_lat, driver_lng,
        items, total_amount, status, platform_status, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id
    `, [
      testOrder.platform_id,
      testOrder.platform_order_id,
      testOrder.customer_name,
      testOrder.customer_phone,
      testOrder.customer_address,
      testOrder.customer_lat,
      testOrder.customer_lng,
      testOrder.driver_lat,
      testOrder.driver_lng,
      JSON.stringify(testOrder.items),
      testOrder.total_amount,
      testOrder.status,
      testOrder.platform_status,
      testOrder.special_instructions,
      testOrder.created_at,
      testOrder.updated_at
    ]);

    const orderId = result.rows[0].id;
    console.log(`✅ Pedido de prueba creado con ID: ${orderId}`);
    console.log(`📋 Detalles del pedido:`);
    console.log(`   - Cliente: ${testOrder.customer_name}`);
    console.log(`   - Total: $${testOrder.total_amount}`);
    console.log(`   - Items: ${testOrder.items.length} productos`);
    console.log(`   - Estado: ${testOrder.status}`);
    console.log(`   - Plataforma: ${platform.name}`);
    
    console.log('\n🎯 Para probar el modal de confirmación:');
    console.log('1. Abre el dashboard en tu navegador');
    console.log('2. El modal debería aparecer automáticamente');
    console.log('3. Prueba los botones de "Aceptar" y "Rechazar"');
    console.log('4. Verifica que el timer de 30 segundos funcione');
    
    console.log('\n🔗 URL del dashboard: http://localhost:3000');
    
    // Simular el evento de nuevo pedido por WebSocket (si el servidor está corriendo)
    console.log('\n📡 Para simular el evento WebSocket, puedes:');
    console.log('1. Reiniciar el servidor para que detecte el nuevo pedido');
    console.log('2. O crear otro pedido con este script');

  } catch (error) {
    console.error('❌ Error creando pedido de prueba:', error);
  } finally {
    process.exit(0);
  }
};

testNewOrder(); 