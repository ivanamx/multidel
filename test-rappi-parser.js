/**
 * Script de Prueba para Parser de Emails de Rappi
 * 
 * Este script permite probar el parser de emails con texto de ejemplo
 * sin necesidad de configurar un servidor de email real.
 */

const rappiEmailParser = require('./services/rappiEmailParser');

// Texto de ejemplo de email de Rappi
const testEmailText = `
<!DOCTYPE html>
<html>
<head>
    <title>Nuevo Pedido Rappi</title>
</head>
<body>
    <div class="order-info">
        <h2>¡Nuevo Pedido!</h2>
        <p><strong>Pedido #12345</strong></p>
        
        <div class="customer-info">
            <h3>Información del Cliente</h3>
            <p><strong>Cliente:</strong> Juan Pérez</p>
            <p><strong>Teléfono:</strong> +52 55 1234 5678</p>
            <p><strong>Dirección:</strong> Calle Principal 123, Colonia Centro, CDMX</p>
        </div>
        
        <div class="order-details">
            <h3>Detalles del Pedido</h3>
            <ul>
                <li>2x Hamburguesa Clásica - $25.00</li>
                <li>1x Papas Fritas - $15.00</li>
                <li>1x Refresco - $12.00</li>
            </ul>
            
            <p><strong>Total:</strong> $77.00</p>
            <p><strong>Estado:</strong> Pendiente</p>
        </div>
        
        <div class="delivery-info">
            <h3>Información de Entrega</h3>
            <p>Tiempo estimado: 25-35 minutos</p>
            <p>Método de pago: Efectivo</p>
        </div>
    </div>
</body>
</html>
`;

// Texto de ejemplo alternativo (más simple)
const testEmailTextSimple = `
Nuevo Pedido Rappi

Pedido #67890

Cliente: María González
Teléfono: +52 55 9876 5432
Dirección: Av. Reforma 456, Colonia Roma, CDMX

Items:
• 1 Pizza Margherita $180.00
• 2 Refrescos $24.00

Total: $204.00
Estado: Confirmado

Tiempo estimado: 30-40 minutos
`;

async function testParser() {
    console.log('🧪 Iniciando pruebas del parser de emails de Rappi...\n');
    
    try {
        // Prueba 1: Email HTML completo
        console.log('📧 Prueba 1: Email HTML completo');
        console.log('=' .repeat(50));
        const result1 = await rappiEmailParser.testParser(testEmailText);
        console.log('Resultado:', JSON.stringify(result1, null, 2));
        console.log('\n');
        
        // Prueba 2: Email texto simple
        console.log('📧 Prueba 2: Email texto simple');
        console.log('=' .repeat(50));
        const result2 = await rappiEmailParser.testParser(testEmailTextSimple);
        console.log('Resultado:', JSON.stringify(result2, null, 2));
        console.log('\n');
        
        // Resumen de pruebas
        console.log('📊 Resumen de Pruebas:');
        console.log('=' .repeat(50));
        console.log(`✅ Prueba 1 (HTML): ${result1 ? 'EXITOSA' : 'FALLIDA'}`);
        console.log(`✅ Prueba 2 (Texto): ${result2 ? 'EXITOSA' : 'FALLIDA'}`);
        
        if (result1 && result2) {
            console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
            console.log('El parser está listo para procesar emails reales de Rappi.');
        } else {
            console.log('\n⚠️ Algunas pruebas fallaron.');
            console.log('Revisa la configuración del parser.');
        }
        
    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
    }
}

// Ejecutar pruebas si el script se ejecuta directamente
if (require.main === module) {
    testParser();
}

module.exports = { testParser, testEmailText, testEmailTextSimple };
