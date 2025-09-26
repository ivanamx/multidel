/**
 * Script de Prueba para Web Scraper de Uber Eats
 * 
 * Este script permite probar el scraper de Uber Eats
 * con credenciales reales o simuladas.
 */

const uberEatsScrapingService = require('./services/uberEatsScrapingService');

// Configuración de prueba
const TEST_CONFIG = {
    email: process.env.UBER_EATS_EMAIL || 'test@restaurante.com',
    password: process.env.UBER_EATS_PASSWORD || 'test_password',
    testMode: true // Cambiar a false para pruebas reales
};

async function testUberEatsScraper() {
    console.log('🧪 Iniciando pruebas del scraper de Uber Eats...\n');
    
    try {
        // Prueba 1: Inicializar navegador
        console.log('🌐 Prueba 1: Inicializando navegador');
        console.log('=' .repeat(50));
        await uberEatsScrapingService.initializeBrowser();
        console.log('✅ Navegador inicializado correctamente\n');
        
        if (TEST_CONFIG.testMode) {
            console.log('⚠️ Modo de prueba activado - omitiendo login real');
            console.log('Para pruebas reales, cambiar testMode a false\n');
        } else {
            // Prueba 2: Login
            console.log('🔐 Prueba 2: Intentando login');
            console.log('=' .repeat(50));
            const loginSuccess = await uberEatsScrapingService.login(
                TEST_CONFIG.email, 
                TEST_CONFIG.password
            );
            
            if (loginSuccess) {
                console.log('✅ Login exitoso\n');
                
                // Prueba 3: Navegar a pedidos
                console.log('📋 Prueba 3: Navegando a página de pedidos');
                console.log('=' .repeat(50));
                const navigationSuccess = await uberEatsScrapingService.navigateToOrders();
                
                if (navigationSuccess) {
                    console.log('✅ Navegación exitosa\n');
                    
                    // Prueba 4: Extraer pedidos
                    console.log('🔍 Prueba 4: Extrayendo pedidos');
                    console.log('=' .repeat(50));
                    const orders = await uberEatsScrapingService.extractOrders();
                    
                    console.log(`✅ Extraídos ${orders.length} pedidos:`);
                    orders.forEach((order, index) => {
                        console.log(`   ${index + 1}. ID: ${order.platform_order_id}, Cliente: ${order.customer_name}, Total: $${order.total_amount}`);
                    });
                } else {
                    console.log('❌ Error navegando a pedidos\n');
                }
            } else {
                console.log('❌ Login fallido\n');
            }
        }
        
        // Prueba 5: Estado del servicio
        console.log('📊 Prueba 5: Estado del servicio');
        console.log('=' .repeat(50));
        const status = uberEatsScrapingService.getStatus();
        console.log('Estado:', JSON.stringify(status, null, 2));
        
        // Resumen de pruebas
        console.log('\n📊 Resumen de Pruebas:');
        console.log('=' .repeat(50));
        console.log(`✅ Navegador: ${status.isLoggedIn !== undefined ? 'INICIALIZADO' : 'ERROR'}`);
        console.log(`✅ Login: ${status.isLoggedIn ? 'EXITOSO' : 'FALLIDO'}`);
        console.log(`✅ Monitoreo: ${status.isMonitoring ? 'ACTIVO' : 'INACTIVO'}`);
        
        if (status.isLoggedIn) {
            console.log('\n🎉 ¡Scraper funcionando correctamente!');
            console.log('El sistema está listo para monitorear pedidos de Uber Eats.');
        } else {
            console.log('\n⚠️ Scraper necesita configuración adicional.');
            console.log('Verifica las credenciales y la configuración.');
        }
        
    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
    } finally {
        // Cerrar navegador
        console.log('\n🔒 Cerrando navegador...');
        await uberEatsScrapingService.closeBrowser();
        console.log('✅ Pruebas completadas');
    }
}

// Función para probar monitoreo continuo
async function testContinuousMonitoring() {
    console.log('🔄 Iniciando prueba de monitoreo continuo...\n');
    
    try {
        await uberEatsScrapingService.startMonitoring(
            TEST_CONFIG.email, 
            TEST_CONFIG.password
        );
        
        console.log('✅ Monitoreo iniciado');
        console.log('Presiona Ctrl+C para detener...\n');
        
        // Mantener el proceso activo
        process.on('SIGINT', async () => {
            console.log('\n🛑 Deteniendo monitoreo...');
            uberEatsScrapingService.stopMonitoring();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Error iniciando monitoreo:', error);
    }
}

// Función para mostrar ayuda
function showHelp() {
    console.log(`
🧪 Script de Prueba para Uber Eats Scraper

Uso:
  node test-uber-eats-scraper.js [comando]

Comandos:
  test          - Ejecutar pruebas básicas (por defecto)
  monitor       - Probar monitoreo continuo
  help          - Mostrar esta ayuda

Variables de entorno:
  UBER_EATS_EMAIL     - Email para login en Uber Eats
  UBER_EATS_PASSWORD  - Password para login en Uber Eats

Ejemplos:
  node test-uber-eats-scraper.js test
  node test-uber-eats-scraper.js monitor
  UBER_EATS_EMAIL=test@restaurante.com node test-uber-eats-scraper.js
`);
}

// Ejecutar según el comando
const command = process.argv[2] || 'test';

switch (command) {
    case 'test':
        testUberEatsScraper();
        break;
    case 'monitor':
        testContinuousMonitoring();
        break;
    case 'help':
        showHelp();
        break;
    default:
        console.log(`❌ Comando desconocido: ${command}`);
        showHelp();
        break;
}

module.exports = { testUberEatsScraper, testContinuousMonitoring };
