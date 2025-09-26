const db = require('./config/database');

const createPreparingOrders = async () => {
  try {
    console.log('🍳 Creando pedidos en estado "preparing" para probar el botón Listo...');
    
    // Obtener plataforma
    const platformResult = await db.query('SELECT id, name FROM platforms LIMIT 1');
    if (platformResult.rows.length === 0) {
      console.error('❌ No hay plataformas configuradas');
      return;
    }
    const platform = platformResult.rows[0];
    
    // Crear 3 pedidos en estado preparing
    const testOrders = [
      {
        customer_name: 'María González',
        customer_phone: '+52 5512345678',
        customer_address: 'Av. Insurgentes 123, CDMX',
        items: [
          { name: 'Pizza Margherita', price: 180.00, quantity: 1, notes: 'Extra queso' },
          { name: 'Refresco', price: 25.00, quantity: 2, notes: 'Coca Cola' }
        ],
        total_amount: 230.00,
        special_instructions: 'Entregar en recepción'
      },
      {
        customer_name: 'Carlos Rodríguez',
        customer_phone: '+52 5587654321',
        customer_address: 'Calle Reforma 456, CDMX',
        items: [
          { name: 'Hamburguesa Clásica', price: 120.00, quantity: 2, notes: 'Sin cebolla' },
          { name: 'Papas Fritas', price: 45.00, quantity: 1, notes: 'Bien crujientes' }
        ],
        total_amount: 285.00,
        special_instructions: 'Tocar timbre dos veces'
      },
      {
        customer_name: 'Ana Martínez',
        customer_phone: '+52 5599887766',
        customer_address: 'Blvd. Ávila Camacho 789, CDMX',
        items: [
          { name: 'Ensalada César', price: 95.00, quantity: 1, notes: 'Sin crutones' },
          { name: 'Sopa de Tomate', price: 65.00, quantity: 1, notes: 'Caliente' },
          { name: 'Agua Mineral', price: 20.00, quantity: 1, notes: 'Sin gas' }
        ],
        total_amount: 180.00,
        special_instructions: 'Entregar en la puerta principal'
      }
    ];

    for (let i = 0; i < testOrders.length; i++) {
      const orderData = testOrders[i];
      
      // Generar coordenadas aleatorias cerca de CDMX
      const baseLat = 19.4326;
      const baseLng = -99.1332;
      const customerLat = baseLat + (Math.random() - 0.5) * 0.02;
      const customerLng = baseLng + (Math.random() - 0.5) * 0.02;
      const driverLat = baseLat + (Math.random() - 0.5) * 0.01;
      const driverLng = baseLng + (Math.random() - 0.5) * 0.01;

      // Insertar pedido en estado preparing
      const result = await db.query(`
        INSERT INTO orders (
          platform_id, platform_order_id, customer_name, customer_phone, 
          customer_address, customer_lat, customer_lng, driver_lat, driver_lng,
          items, total_amount, status, platform_status, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `, [
        platform.id,
        `PREP-${Date.now()}-${i}`,
        orderData.customer_name,
        orderData.customer_phone,
        orderData.customer_address,
        customerLat,
        customerLng,
        driverLat,
        driverLng,
        JSON.stringify(orderData.items),
        orderData.total_amount,
        'preparing', // Estado preparing
        'preparing',
        orderData.special_instructions,
        new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"}),
        new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"})
      ]);

      const orderId = result.rows[0].id;
      console.log(`✅ Pedido ${i + 1} creado - ID: ${orderId} - ${orderData.customer_name} - $${orderData.total_amount} - Estado: preparing`);
      
      // Pequeña pausa entre pedidos
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n🎉 Pedidos en preparación creados exitosamente!');
    console.log('\n📋 Para probar el botón "Listo":');
    console.log('1. Abre el dashboard en http://localhost:3000');
    console.log('2. Haz clic en la card "Pendientes"');
    console.log('3. En el modal, ve a la columna "Preparando"');
    console.log('4. Verás los botones "Listo" en cada card');
    console.log('5. Haz clic en "Listo" para cambiar el estado a "ready"');
    console.log('6. El pedido se moverá automáticamente a la columna "Listos"');

  } catch (error) {
    console.error('❌ Error creando pedidos en preparación:', error);
  } finally {
    process.exit(0);
  }
};

createPreparingOrders(); 