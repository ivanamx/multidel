/**
 * Script de Prueba para Web Scraper de Didí Food
 * 
 * Este script permite probar el scraper de Didí Food
 * con credenciales reales o simuladas.
 */

const didiFoodScrapingService = require('./services/didiFoodScrapingService');

// Configuración de prueba
const TEST_CONFIG = {
    email: process.env.DIDI_FOOD_EMAIL || 'test@restaurante.com',
    password: process.env.DIDI_FOOD_PASSWORD || 'test_password',
    phone: process.env.DIDI_FOOD_PHONE || '+521234567890',
    testMode: true // Cambiar a false para pruebas reales
};

async function testDidiFoodScraper() {
    console.log('🧪 Iniciando pruebas del scraper de Didí Food...\n');
    
    try {
        // Prueba 1: Inicializar navegador
        console.log('🌐 Prueba 1: Inicializando navegador');
        console.log('=' .repeat(50));
        await didiFoodScrapingService.initializeBrowser();
        console.log('✅ Navegador inicializado correctamente\n');
        
        if (TEST_CONFIG.testMode) {
            console.log('⚠️ Modo de prueba activado - omitiendo login real');
            console.log('Para pruebas reales, cambiar testMode a false\n');
        } else {
            // Prueba 2: Login
            console.log('🔐 Prueba 2: Intentando login');
            console.log('=' .repeat(50));
            const loginResult = await didiFoodScrapingService.login(
                TEST_CONFIG.email, 
                TEST_CONFIG.password,
                TEST_CONFIG.phone
            );
            
            if (loginResult.success) {
                console.log('✅ Login exitoso\n');
                
                // Prueba 3: Navegar a pedidos
                console.log('📋 Prueba 3: Navegando a página de pedidos');
                console.log('=' .repeat(50));
                const navigationSuccess = await didiFoodScrapingService.navigateToOrders();
                
                if (navigationSuccess) {
                    console.log('✅ Navegación exitosa\n');
                    
                    // Prueba 4: Extraer pedidos
                    console.log('🔍 Prueba 4: Extrayendo pedidos');
                    console.log('=' .repeat(50));
                    const orders = await didiFoodScrapingService.extractOrders();
                    
                    console.log(`✅ Extraídos ${orders.length} pedidos:`);
                    orders.forEach((order, index) => {
                        console.log(`   ${index + 1}. ID: ${order.platform_order_id}, Cliente: ${order.customer_name}, Total: $${order.total_amount}`);
                    });
                } else {
                    console.log('❌ Error navegando a pedidos\n');
                }
            } else if (loginResult.requiresSMS) {
                console.log('📱 Se requiere verificación SMS\n');
                console.log('Para completar el login, usar el endpoint de verificación SMS\n');
            } else {
                console.log('❌ Login fallido\n');
            }
        }
        
        // Prueba 5: Estado del servicio
        console.log('📊 Prueba 5: Estado del servicio');
        console.log('=' .repeat(50));
        const status = didiFoodScrapingService.getStatus();
        console.log('Estado:', JSON.stringify(status, null, 2));
        
        // Resumen de pruebas
        console.log('\n📊 Resumen de Pruebas:');
        console.log('=' .repeat(50));
        console.log(`✅ Navegador: ${status.isLoggedIn !== undefined ? 'INICIALIZADO' : 'ERROR'}`);
        console.log(`✅ Login: ${status.isLoggedIn ? 'EXITOSO' : 'FALLIDO'}`);
        console.log(`✅ SMS Requerido: ${status.requiresSMSVerification ? 'SÍ' : 'NO'}`);
        console.log(`✅ Monitoreo: ${status.isMonitoring ? 'ACTIVO' : 'INACTIVO'}`);
        
        if (status.isLoggedIn) {
            console.log('\n🎉 ¡Scraper funcionando correctamente!');
            console.log('El sistema está listo para monitorear pedidos de Didí Food.');
        } else if (status.requiresSMSVerification) {
            console.log('\n📱 Scraper necesita verificación SMS.');
            console.log('Usar el endpoint de verificación SMS para completar el login.');
        } else {
            console.log('\n⚠️ Scraper necesita configuración adicional.');
            console.log('Verifica las credenciales y la configuración.');
        }
        
    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
    } finally {
        // Cerrar navegador
        console.log('\n🔒 Cerrando navegador...');
        await didiFoodScrapingService.closeBrowser();
        console.log('✅ Pruebas completadas');
    }
}

// Función para probar monitoreo continuo
async function testContinuousMonitoring() {
    console.log('🔄 Iniciando prueba de monitoreo continuo...\n');
    
    try {
        await didiFoodScrapingService.startMonitoring(
            TEST_CONFIG.email, 
            TEST_CONFIG.password,
            TEST_CONFIG.phone
        );
        
        console.log('✅ Monitoreo iniciado');
        console.log('Presiona Ctrl+C para detener...\n');
        
        // Mantener el proceso activo
        process.on('SIGINT', async () => {
            console.log('\n🛑 Deteniendo monitoreo...');
            didiFoodScrapingService.stopMonitoring();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Error iniciando monitoreo:', error);
    }
}

// Función para probar verificación SMS
async function testSMSVerification() {
    console.log('📱 Probando verificación SMS...\n');
    
    try {
        // Primero hacer login para activar SMS
        await didiFoodScrapingService.initializeBrowser();
        const loginResult = await didiFoodScrapingService.login(
            TEST_CONFIG.email, 
            TEST_CONFIG.password,
            TEST_CONFIG.phone
        );
        
        if (loginResult.requiresSMS) {
            console.log('📱 SMS requerido. Ingresa el código de verificación:');
            
            // En un entorno real, esto vendría de la entrada del usuario
            const verificationCode = '123456'; // Código de ejemplo
            
            const smsResult = await didiFoodScrapingService.handleSMSVerification(
                TEST_CONFIG.phone,
                verificationCode
            );
            
            if (smsResult.success) {
                console.log('✅ Verificación SMS exitosa');
            } else {
                console.log('❌ Verificación SMS fallida');
            }
        } else {
            console.log('ℹ️ No se requiere verificación SMS');
        }
        
    } catch (error) {
        console.error('❌ Error probando SMS:', error);
    } finally {
        await didiFoodScrapingService.closeBrowser();
    }
}

// Función para mostrar ayuda
function showHelp() {
    console.log(`
🧪 Script de Prueba para Didí Food Scraper

Uso:
  node test-didi-food-scraper.js [comando]

Comandos:
  test          - Ejecutar pruebas básicas (por defecto)
  monitor       - Probar monitoreo continuo
  sms           - Probar verificación SMS
  help          - Mostrar esta ayuda

Variables de entorno:
  DIDI_FOOD_EMAIL     - Email para login en Didí Food
  DIDI_FOOD_PASSWORD  - Password para login en Didí Food
  DIDI_FOOD_PHONE     - Teléfono para verificación SMS

Ejemplos:
  node test-didi-food-scraper.js test
  node test-didi-food-scraper.js monitor
  node test-didi-food-scraper.js sms
  DIDI_FOOD_EMAIL=test@restaurante.com node test-didi-food-scraper.js
`);
}

// Ejecutar según el comando
const command = process.argv[2] || 'test';

switch (command) {
    case 'test':
        testDidiFoodScraper();
        break;
    case 'monitor':
        testContinuousMonitoring();
        break;
    case 'sms':
        testSMSVerification();
        break;
    case 'help':
        showHelp();
        break;
    default:
        console.log(`❌ Comando desconocido: ${command}`);
        showHelp();
        break;
}

module.exports = { testDidiFoodScraper, testContinuousMonitoring, testSMSVerification };
