require('dotenv').config();
const db = require('../config/database');

const seedData = async () => {
  try {
    console.log('🌱 Insertando datos de ejemplo...');

    // Obtener plataformas
    const platformsResult = await db.query('SELECT id, name FROM platforms');
    const platforms = platformsResult.rows;

    if (platforms.length === 0) {
      console.log('❌ No se encontraron plataformas. Ejecuta primero la migración.');
      process.exit(1);
    }

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

    // Generar pedidos de ejemplo para hoy
    const today = new Date();
    const orders = [];

    // Ubicación del restaurante (centro)
    const restaurantLocation = {
        lat: 19.4326, // Ciudad de México (ajusta a tu ubicación)
        lng: -99.1332
    };

    // Crear 15 pedidos de ejemplo para hoy
    for (let i = 1; i <= 15; i++) {
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

        // Estados aleatorios (optimizados)
        const statuses = ['pending', 'preparing', 'ready', 'delivering', 'delivered'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        // Generar coordenadas de prueba
        const customerLat = restaurantLocation.lat + (Math.random() - 0.5) * 0.05; // ±0.025 grados
        const customerLng = restaurantLocation.lng + (Math.random() - 0.5) * 0.05;
        
        // Generar coordenadas del repartidor (más cerca del restaurante)
        const driverLat = restaurantLocation.lat + (Math.random() - 0.5) * 0.02; // ±0.01 grados
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

    // Insertar pedidos
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
    const ordersResult = await db.query('SELECT id FROM orders LIMIT 5');
    const orderIds = ordersResult.rows.map(row => row.id);

    for (const orderId of orderIds) {
      await db.query(`
        INSERT INTO order_logs (order_id, action, details) VALUES 
        ($1, 'created', '{"message": "Pedido creado"}'),
        ($1, 'status_updated', '{"old_status": "pending", "new_status": "preparing"}')
      `, [orderId]);
    }

    console.log('✅ Datos de ejemplo insertados correctamente');
    console.log(`📊 Se crearon ${orders.length} pedidos de ejemplo`);
    console.log('🎯 Ahora puedes probar las estadísticas en el dashboard');

  } catch (error) {
    console.error('❌ Error insertando datos de ejemplo:', error);
    process.exit(1);
  }
};

seedData().then(() => {
  console.log('🎉 Seed completado');
  process.exit(0);
});