require('dotenv').config();
const db = require('./config/database');

const simulateOrders = async () => {
  try {
    console.log('🎭 Simulando múltiples pedidos nuevos...');

    // Obtener plataformas
    const platformsResult = await db.query('SELECT id, name FROM platforms');
    if (platformsResult.rows.length === 0) {
      console.log('❌ No se encontraron plataformas. Ejecuta primero la migración.');
      process.exit(1);
    }
    const platforms = platformsResult.rows;

    // Productos de ejemplo
    const sampleProducts = [
      { name: 'Hamburguesa Clásica', price: 12.50 },
      { name: 'Pizza Margherita', price: 18.00 },
      { name: 'Ensalada César', price: 8.50 },
      { name: 'Pollo a la Plancha', price: 15.00 },
      { name: 'Pasta Carbonara', price: 14.00 },
      { name: 'Sushi California Roll', price: 22.00 },
      { name: 'Tacos de Carne', price: 10.00 },
      { name: 'Sopa de Tomate', price: 6.50 },
      { name: 'Bebida Gaseosa', price: 3.00 },
      { name: 'Postre Tiramisú', price: 7.50 }
    ];

    // Crear 5 pedidos de prueba con diferentes características
    const testOrders = [
      {
        customer_name: 'María González',
        customer_phone: '+593 912345678',
        customer_address: 'Av. Amazonas 123, Quito',
        items: [
          { name: 'Hamburguesa Clásica', price: 12.50, quantity: 2, notes: 'Sin cebolla' },
          { name: 'Papas Fritas', price: 4.50, quantity: 1, notes: 'Extra crujientes' }
        ],
        special_instructions: 'Entregar en la puerta principal',
        payment_method: 'Efectivo'
      },
      {
        customer_name: 'Carlos Rodríguez',
        customer_phone: '+593 923456789',
        customer_address: 'Calle 10 de Agosto 456, Quito',
        items: [
          { name: 'Pizza Margherita', price: 18.00, quantity: 1, notes: 'Extra queso' },
          { name: 'Bebida Gaseosa', price: 3.00, quantity: 2, notes: 'Coca Cola' }
        ],
        special_instructions: 'Llamar antes de llegar',
        payment_method: 'Tarjeta de crédito'
      },
      {
        customer_name: 'Ana López',
        customer_phone: '+593 934567890',
        customer_address: 'Av. 6 de Diciembre 789, Quito',
        items: [
          { name: 'Sushi California Roll', price: 22.00, quantity: 1, notes: 'Sin aguacate' },
          { name: 'Ensalada César', price: 8.50, quantity: 1, notes: 'Sin crutones' }
        ],
        special_instructions: 'Dieta sin gluten',
        payment_method: 'Transferencia bancaria'
      },
      {
        customer_name: 'Luis Martínez',
        customer_phone: '+593 945678901',
        customer_address: 'Calle Juan León Mera 321, Quito',
        items: [
          { name: 'Pollo a la Plancha', price: 15.00, quantity: 1, notes: 'Bien cocido' },
          { name: 'Pasta Carbonara', price: 14.00, quantity: 1, notes: 'Sin crema' },
          { name: 'Postre Tiramisú', price: 7.50, quantity: 1, notes: 'Sin alcohol' }
        ],
        special_instructions: 'Entregar en recepción del edificio',
        payment_method: 'Efectivo'
      },
      {
        customer_name: 'Sofia Torres',
        customer_phone: '+593 956789012',
        customer_address: 'Av. República 654, Quito',
        items: [
          { name: 'Tacos de Carne', price: 10.00, quantity: 3, notes: 'Extra picante' },
          { name: 'Sopa de Tomate', price: 6.50, quantity: 1, notes: 'Caliente' },
          { name: 'Bebida Gaseosa', price: 3.00, quantity: 1, notes: 'Sprite' }
        ],
        special_instructions: 'Tocar timbre 3 veces',
        payment_method: 'Tarjeta de débito'
      }
    ];

    console.log(`📦 Creando ${testOrders.length} pedidos de prueba...`);

    for (let i = 0; i < testOrders.length; i++) {
      const orderData = testOrders[i];
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      
      // Calcular total
      const totalAmount = orderData.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      // Generar coordenadas aleatorias cerca de Quito
      const baseLat = -0.2299;
      const baseLng = -78.5249;
      const customerLat = baseLat + (Math.random() - 0.5) * 0.02;
      const customerLng = baseLng + (Math.random() - 0.5) * 0.02;
      const driverLat = baseLat + (Math.random() - 0.5) * 0.01;
      const driverLng = baseLng + (Math.random() - 0.5) * 0.01;

      // Insertar pedido
      const result = await db.query(`
        INSERT INTO orders (
          platform_id, platform_order_id, customer_name, customer_phone, 
          customer_address, customer_lat, customer_lng, driver_lat, driver_lng,
          items, total_amount, status, platform_status, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `, [
        platform.id,
        `SIM-${Date.now()}-${i}`,
        orderData.customer_name,
        orderData.customer_phone,
        orderData.customer_address,
        customerLat,
        customerLng,
        driverLat,
        driverLng,
        JSON.stringify(orderData.items),
        totalAmount.toFixed(2),
        'pending',
        'pending',
        orderData.special_instructions,
        new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"}),
        new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"})
      ]);

      const orderId = result.rows[0].id;
      console.log(`✅ Pedido ${i + 1} creado - ID: ${orderId} - ${orderData.customer_name} - $${totalAmount.toFixed(2)}`);
      
      // Pequeña pausa entre pedidos para simular llegada real
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🎉 Simulación completada!');
    console.log('\n📊 Resumen:');
    console.log(`   - ${testOrders.length} pedidos creados`);
    console.log(`   - Todos en estado 'pending'`);
    console.log(`   - Listos para confirmación`);
    
    console.log('\n🎯 Próximos pasos:');
    console.log('1. Abre el dashboard en http://localhost:3000');
    console.log('2. Los modales aparecerán automáticamente');
    console.log('3. Prueba aceptar algunos pedidos y rechazar otros');
    console.log('4. Verifica que el timer funcione en cada modal');
    console.log('5. Comprueba que los estados se actualicen correctamente');

    console.log('\n💡 Consejos:');
    console.log('- Los modales aparecerán uno tras otro');
    console.log('- Cada modal tiene su propio timer de 30 segundos');
    console.log('- Puedes cerrar un modal y abrir otro manualmente');
    console.log('- Los pedidos rechazados no aparecerán más en la lista');

  } catch (error) {
    console.error('❌ Error en la simulación:', error);
  } finally {
    process.exit(0);
  }
};

simulateOrders(); 