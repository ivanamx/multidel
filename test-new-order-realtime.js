require('dotenv').config();
const db = require('./config/database');
const io = require('socket.io-client');

const testNewOrderRealtime = async () => {
  try {
    console.log('🧪 Creando pedido de prueba con notificación en tiempo real...');

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
      platform_order_id: `REALTIME-${Date.now()}`,
      customer_name: 'Cliente Tiempo Real',
      customer_phone: '+593 998877665',
      customer_address: 'Av. Real Time 456, Quito, Ecuador',
      customer_lat: -0.2299,
      customer_lng: -78.5249,
      driver_lat: -0.2300,
      driver_lng: -78.5250,
      items: [
        {
          name: 'Pizza Hawaiana',
          price: 20.00,
          quantity: 1,
          total: 20.00,
          notes: 'Extra piña, sin jamón'
        },
        {
          name: 'Ensalada César',
          price: 8.50,
          quantity: 2,
          total: 17.00,
          notes: 'Sin crutones, aderezo aparte'
        },
        {
          name: 'Bebida Natural',
          price: 4.00,
          quantity: 3,
          total: 12.00,
          notes: 'Limonada sin azúcar'
        }
      ],
      total_amount: 49.00,
      status: 'pending',
      platform_status: 'pending',
      special_instructions: 'Entregar en la puerta trasera, llamar al 0998877665',
      payment_method: 'Efectivo',
      created_at: new Date(),
      updated_at: new Date()
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
    
    // Simular evento WebSocket de nuevo pedido
    console.log('\n📡 Simulando evento WebSocket de nuevo pedido...');
    
    // Conectar al WebSocket del servidor
    const socket = io('http://localhost:5678');
    
    socket.on('connect', () => {
      console.log('🔌 Conectado al WebSocket del servidor');
      
      // Emitir evento de nuevo pedido
      socket.emit('newOrder', {
        orderId: orderId,
        platform: platform.name,
        customerName: testOrder.customer_name,
        total: testOrder.total_amount
      });
      
      console.log('📤 Evento de nuevo pedido emitido');
      
      // Cerrar conexión después de 2 segundos
      setTimeout(() => {
        socket.disconnect();
        console.log('🔌 Conexión WebSocket cerrada');
      }, 2000);
    });
    
         socket.on('connect_error', (error) => {
       console.log('❌ Error conectando al WebSocket:', error.message);
       console.log('💡 Asegúrate de que el servidor esté corriendo en http://localhost:5678');
     });
    
    console.log('\n🎯 Para probar el modal de confirmación:');
    console.log('1. Abre el dashboard en tu navegador');
    console.log('2. El modal debería aparecer automáticamente en los próximos 5 segundos');
    console.log('3. Prueba los botones de "Aceptar" y "Rechazar"');
    console.log('4. Verifica que el timer de 30 segundos funcione');
    
    console.log('\n🔗 URL del dashboard: http://localhost:5678');
    
    console.log('\n💡 El sistema ahora:');
    console.log('- Verifica pedidos nuevos cada 5 segundos');
    console.log('- Detecta automáticamente pedidos en estado "pending"');
    console.log('- Muestra el modal de confirmación inmediatamente');
    console.log('- Emite eventos WebSocket para notificaciones en tiempo real');

  } catch (error) {
    console.error('❌ Error creando pedido de prueba:', error);
  } finally {
    // Salir después de 3 segundos para dar tiempo al WebSocket
    setTimeout(() => {
      process.exit(0);
    }, 3000);
  }
};

testNewOrderRealtime(); 