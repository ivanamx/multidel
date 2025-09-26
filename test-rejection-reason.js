// Script de prueba para verificar la funcionalidad de razón de rechazo
const fetch = require('node-fetch');

async function testRejectionReason() {
    try {
        console.log('🧪 Probando funcionalidad de razón de rechazo...');
        
        // Obtener el pedido rechazado (ID 251)
        const response = await fetch('http://localhost:3000/api/orders/251');
        const data = await response.json();
        
        if (data.success) {
            const order = data.data;
            console.log('✅ Pedido obtenido correctamente');
            console.log(`📋 ID: ${order.id}`);
            console.log(`📋 Estado: ${order.status}`);
            console.log(`📋 Razón de rechazo: ${order.rejection_reason || 'No especificada'}`);
            
            if (order.status === 'rejected' && order.rejection_reason) {
                console.log('✅ El pedido está rechazado y tiene razón de rechazo');
                console.log('✅ La funcionalidad debería mostrar ambas badges en el modal');
            } else {
                console.log('⚠️ El pedido no está rechazado o no tiene razón de rechazo');
            }
        } else {
            console.error('❌ Error obteniendo el pedido:', data.message);
        }
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

// Ejecutar la prueba
testRejectionReason(); 