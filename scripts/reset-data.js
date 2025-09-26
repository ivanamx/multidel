require('dotenv').config();
const db = require('../config/database');

const resetData = async () => {
  try {
    console.log('🧹 Limpiando base de datos...');
    
    // Limpiar todos los pedidos existentes
    await db.query('DELETE FROM order_logs');
    await db.query('DELETE FROM orders');
    
    console.log('✅ Base de datos limpiada');

    // Obtener plataformas
    const platformsResult = await db.query('SELECT id, name FROM platforms');
    const platforms = platformsResult.rows;

    if (platforms.length === 0) {
      console.log('❌ No se encontraron plataformas. Ejecuta primero la migración.');
      process.exit(1);
    }

    // Productos de ejemplo con precios más altos (180-220 MXN)
    const sampleProducts = [
      { name: 'Hamburguesa Gourmet', price: 185.00 },
      { name: 'Pizza Premium', price: 220.00 },
      { name: 'Ensalada Gourmet', price: 195.00 },
      { name: 'Pollo a la Plancha Especial', price: 210.00 },
      { name: 'Pasta Carbonara Premium', price: 200.00 },
      { name: 'Sushi California Roll Deluxe', price: 225.00 },
      { name: 'Tacos Gourmet', price: 180.00 },
      { name: 'Sopa de Tomate Gourmet', price: 190.00 },
      { name: 'Bebida Premium', price: 185.00 },
      { name: 'Postre Tiramisú Gourmet', price: 195.00 }
    ];

    // Generar pedidos para diferentes fechas
    const orders = [];
    const today = new Date();
    
    // Ubicación del restaurante (centro)
    const restaurantLocation = {
        lat: 19.4326, // Ciudad de México
        lng: -99.1332
    };

    // Crear 20 pedidos para hoy
    for (let i = 1; i <= 20; i++) {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items por pedido
        const items = [];
        let totalAmount = 0;

        for (let j = 0; j < numItems; j++) {
            const product = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
            const quantity = Math.floor(Math.random() * 2) + 1; // 1-2 unidades
            const itemTotal = product.price * quantity;
            totalAmount += itemTotal;

            items.push({
                name: product.name,
                price: product.price,
                quantity: quantity,
                total: itemTotal
            });
        }

        // Generar hora aleatoria entre 8:00 y 22:00
        const hour = Math.floor(Math.random() * 14) + 8; // 8-22
        const minute = Math.floor(Math.random() * 60);
        const orderTime = new Date(today);
        orderTime.setHours(hour, minute, 0, 0);

        // Estados aleatorios
        const statuses = ['pending', 'preparing', 'ready', 'delivering', 'delivered'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        // Generar coordenadas de prueba
        const customerLat = restaurantLocation.lat + (Math.random() - 0.5) * 0.05;
        const customerLng = restaurantLocation.lng + (Math.random() - 0.5) * 0.05;
        const driverLat = restaurantLocation.lat + (Math.random() - 0.5) * 0.02;
        const driverLng = restaurantLocation.lng + (Math.random() - 0.5) * 0.02;

        orders.push({
            platform_id: platform.id,
            platform_order_id: `PLAT-${platform.name.toUpperCase()}-${Date.now()}-${i}`,
            customer_name: `Cliente ${i}`,
            customer_phone: `+593 9${Math.floor(Math.random() * 90000000) + 10000000}`,
            customer_address: `Dirección ${i}, Ciudad`,
            customer_lat: customerLat,
            customer_lng: customerLng,
            driver_lat: driverLat,
            driver_lng: driverLng,
            items: items,
            total_amount: totalAmount.toFixed(2),
            status: status,
            platform_status: status,
            created_at: orderTime.toISOString(),
            updated_at: orderTime.toISOString()
        });
    }

    // Crear 50-60 pedidos adicionales para días anteriores (total 70-80)
    const totalOrders = 75; // 20 de hoy + 55 de días anteriores
    const remainingOrders = totalOrders - 20;

    for (let i = 21; i <= totalOrders; i++) {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const numItems = Math.floor(Math.random() * 3) + 1;
        const items = [];
        let totalAmount = 0;

        for (let j = 0; j < numItems; j++) {
            const product = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
            const quantity = Math.floor(Math.random() * 2) + 1;
            const itemTotal = product.price * quantity;
            totalAmount += itemTotal;

            items.push({
                name: product.name,
                price: product.price,
                quantity: quantity,
                total: itemTotal
            });
        }

        // Generar fecha aleatoria en los últimos 30 días
        const daysAgo = Math.floor(Math.random() * 30) + 1;
        const orderDate = new Date(today);
        orderDate.setDate(orderDate.getDate() - daysAgo);
        
        // Generar hora aleatoria
        const hour = Math.floor(Math.random() * 14) + 8;
        const minute = Math.floor(Math.random() * 60);
        orderDate.setHours(hour, minute, 0, 0);

        // Estados aleatorios (más probabilidad de estar entregados para pedidos antiguos)
        const statuses = ['delivered', 'delivered', 'delivered', 'delivered', 'delivering', 'ready', 'preparing', 'pending'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        // Generar coordenadas
        const customerLat = restaurantLocation.lat + (Math.random() - 0.5) * 0.05;
        const customerLng = restaurantLocation.lng + (Math.random() - 0.5) * 0.05;
        const driverLat = restaurantLocation.lat + (Math.random() - 0.5) * 0.02;
        const driverLng = restaurantLocation.lng + (Math.random() - 0.5) * 0.02;

        orders.push({
            platform_id: platform.id,
            platform_order_id: `PLAT-${platform.name.toUpperCase()}-${Date.now()}-${i}`,
            customer_name: `Cliente ${i}`,
            customer_phone: `+593 9${Math.floor(Math.random() * 90000000) + 10000000}`,
            customer_address: `Dirección ${i}, Ciudad`,
            customer_lat: customerLat,
            customer_lng: customerLng,
            driver_lat: driverLat,
            driver_lng: driverLng,
            items: items,
            total_amount: totalAmount.toFixed(2),
            status: status,
            platform_status: status,
            created_at: orderDate.toISOString(),
            updated_at: orderDate.toISOString()
        });
    }

    // Insertar todos los pedidos
    console.log('📦 Insertando pedidos...');
    for (const order of orders) {
      await db.query(`
        INSERT INTO orders (
          platform_id, platform_order_id, customer_name, customer_phone, 
          customer_address, customer_lat, customer_lng, driver_lat, driver_lng,
          items, total_amount, status, platform_status, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        order.platform_id,
        order.platform_order_id,
        order.customer_name,
        order.customer_phone,
        order.customer_address,
        order.customer_lat,
        order.customer_lng,
        order.driver_lat,
        order.driver_lng,
        JSON.stringify(order.items),
        order.total_amount,
        order.status,
        order.platform_status,
        order.created_at,
        order.updated_at
      ]);
    }

    // Crear algunos logs de ejemplo
    const ordersResult = await db.query('SELECT id FROM orders LIMIT 10');
    const orderIds = ordersResult.rows.map(row => row.id);

    for (const orderId of orderIds) {
      await db.query(`
        INSERT INTO order_logs (order_id, action, details) VALUES 
        ($1, 'created', '{"message": "Pedido creado"}'),
        ($1, 'status_updated', '{"old_status": "pending", "new_status": "preparing"}')
      `, [orderId]);
    }

    console.log('✅ Datos reseteados correctamente');
    console.log(`📊 Se crearon ${orders.length} pedidos totales`);
    console.log(`📅 20 pedidos para hoy`);
    console.log(`💰 Precios entre $180-225 MXN`);
    console.log('🎯 Ahora puedes probar las estadísticas en el dashboard');

  } catch (error) {
    console.error('❌ Error reseteando datos:', error);
    process.exit(1);
  }
};

resetData().then(() => {
  console.log('🎉 Reset completado');
  process.exit(0);
}); 