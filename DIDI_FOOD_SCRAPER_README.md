# 🚗 Web Scraper para Didí Food - MultiDel

## 📋 **Descripción**

El sistema de web scraping permite integrar automáticamente pedidos de Didí Food mediante el monitoreo del panel web de Didí Food Partner. Esta solución funciona **sin necesidad de acceso a APIs oficiales** de Didí Food.

## 🚀 **Características Implementadas**

### **✅ Funcionalidades Principales:**
- **🌐 Monitoreo automático** del panel web de Didí Food
- **🔍 Scraper inteligente** que extrae datos del pedido
- **📱 Soporte para verificación SMS** (requerida por Didí)
- **🔄 Integración automática** con tu sistema existente
- **📊 Dashboard en tiempo real** con nuevos pedidos
- **🛡️ Detección de cambios** en estados de pedidos
- **📝 Logging detallado** de todo el proceso
- **🤖 Automatización completa** con Puppeteer

### **✅ Componentes Creados:**
1. **`config/didiFoodScraping.js`** - Configuración del scraper
2. **`services/didiFoodScrapingService.js`** - Servicio principal de scraping
3. **`routes/didi-food-scraping.js`** - Endpoints de control
4. **`test-didi-food-scraper.js`** - Script de pruebas
5. **Variables de entorno** actualizadas

## 🛠️ **Instalación y Configuración**

### **Paso 1: Instalar Dependencias**
```bash
npm install puppeteer cheerio node-cron
```

### **Paso 2: Configurar Variables de Entorno**
```bash
# Copiar archivo de ejemplo
cp env.example .env

# Editar .env con tus credenciales
```

**Variables importantes:**
```env
# Credenciales de Didí Food Partner
DIDI_FOOD_EMAIL=tu_email@restaurante.com
DIDI_FOOD_PASSWORD=tu_password_de_didi_food
DIDI_FOOD_PHONE=+52XXXXXXXXXX

# Configuración del scraper
SCRAPER_HEADLESS=true
SCRAPER_TIMEOUT=30000
```

### **Paso 3: Configurar Acceso a Didí Food Partner**
1. **Acceder** a [merchant.didiglobal.com](https://merchant.didiglobal.com)
2. **Hacer login** con tus credenciales de restaurante
3. **Verificar** que puedes ver la página de pedidos
4. **Configurar** las credenciales en tu archivo `.env`

### **Paso 4: Probar el Sistema**
```bash
# Pruebas básicas
node test-didi-food-scraper.js test

# Probar verificación SMS
node test-didi-food-scraper.js sms

# Probar monitoreo continuo
node test-didi-food-scraper.js monitor

# Iniciar servidor completo
npm start
```

## 🔧 **Uso del Sistema**

### **Iniciar el Servidor**
```bash
npm start
```

El sistema iniciará automáticamente:
- ✅ Monitoreo del panel web cada 1.5 minutos
- ✅ Scraper automático de pedidos
- ✅ Integración con tu sistema existente

### **Endpoints Disponibles**

#### **Estado del Scraper**
```bash
GET /api/didi-food-scraping/status
```

#### **Iniciar/Detener Monitoreo**
```bash
POST /api/didi-food-scraping/start
Content-Type: application/json

{
  "email": "tu_email@restaurante.com",
  "password": "tu_password",
  "phone": "+52XXXXXXXXXX"
}

POST /api/didi-food-scraping/stop
```

#### **Probar Login**
```bash
POST /api/didi-food-scraping/test-login
Content-Type: application/json

{
  "email": "tu_email@restaurante.com",
  "password": "tu_password",
  "phone": "+52XXXXXXXXXX"
}
```

#### **Verificación SMS**
```bash
POST /api/didi-food-scraping/sms-verification
Content-Type: application/json

{
  "phone": "+52XXXXXXXXXX",
  "verificationCode": "123456"
}
```

#### **Extraer Pedidos Manualmente**
```bash
POST /api/didi-food-scraping/extract-orders
```

#### **Verificar si Requiere SMS**
```bash
GET /api/didi-food-scraping/sms-required
```

#### **Ver Configuración**
```bash
GET /api/didi-food-scraping/config
```

## 🧪 **Pruebas**

### **Probar Scraper Localmente**
```bash
# Pruebas básicas
node test-didi-food-scraper.js test

# Probar verificación SMS
node test-didi-food-scraper.js sms

# Monitoreo continuo
node test-didi-food-scraper.js monitor

# Ver ayuda
node test-didi-food-scraper.js help
```

### **Probar con API**
```bash
# Probar login
curl -X POST http://localhost:3000/api/didi-food-scraping/test-login \
  -H "Content-Type: application/json" \
  -d '{"email": "tu_email", "password": "tu_password", "phone": "+52XXXXXXXXXX"}'

# Verificar SMS requerido
curl http://localhost:3000/api/didi-food-scraping/sms-required

# Ver estado
curl http://localhost:3000/api/didi-food-scraping/status
```

## 📊 **Flujo de Funcionamiento**

```
1. Sistema inicia navegador automático
   ↓
2. Hace login en Didí Food Partner
   ↓
3. Verifica si requiere SMS (común en Didí)
   ↓
4. Navega a página de pedidos
   ↓
5. Extrae datos de pedidos actuales
   ↓
6. Detecta nuevos pedidos
   ↓
7. Crea pedidos en tu sistema
   ↓
8. Dashboard se actualiza en tiempo real
   ↓
9. Se activa tracking automático
```

## 🔍 **Datos Extraídos del Panel Web**

El scraper extrae automáticamente:
- ✅ **ID del pedido** (número único)
- ✅ **Nombre del cliente**
- ✅ **Teléfono del cliente**
- ✅ **Dirección de entrega**
- ✅ **Items del pedido** (nombre, cantidad, precio)
- ✅ **Total del pedido**
- ✅ **Estado del pedido**
- ✅ **Tiempo de creación**

## ⚙️ **Configuración Avanzada**

### **Personalizar Selectores**
Editar `config/didiFoodScraping.js`:
```javascript
selectors: {
    orders: {
        orderItem: '.order-item, .order-card, [data-testid="order-item"]',
        orderId: '.order-id, [data-testid="order-id"]',
        // Agregar más selectores según necesites
    }
}
```

### **Ajustar Intervalo de Monitoreo**
```javascript
monitoring: {
    checkInterval: 90000, // 1.5 minutos (más conservador)
    maxOrdersPerCycle: 15
}
```

### **Configurar Verificación SMS**
```javascript
features: {
    requiresSMSVerification: true,
    smsVerification: {
        phoneInput: 'input[name="phone"]',
        sendCodeButton: '.send-code-btn',
        codeInput: 'input[name="code"]',
        verifyButton: '.verify-btn'
    }
}
```

## 🚨 **Solución de Problemas**

### **Error de Login**
- ✅ Verificar credenciales de Didí Food Partner
- ✅ Confirmar que el restaurante está activo
- ✅ Verificar que no hay bloqueos de seguridad

### **Se Requiere Verificación SMS**
- ✅ **Normal en Didí Food** - Usar endpoint de verificación SMS
- ✅ Configurar teléfono en variables de entorno
- ✅ Usar código SMS recibido en el teléfono

### **Scraper No Encuentra Pedidos**
- ✅ Verificar que hay pedidos en el panel
- ✅ Ajustar selectores en configuración
- ✅ Revisar logs del sistema

### **Navegador No Inicia**
- ✅ Verificar que Puppeteer está instalado
- ✅ Revisar permisos del sistema
- ✅ Probar con `headless: false`

### **Selectores Cambiaron**
- ✅ Didí Food actualizó su interfaz
- ✅ Actualizar selectores en configuración
- ✅ Usar múltiples selectores como fallback

## 📈 **Monitoreo y Logs**

### **Ver Estado del Sistema**
```bash
curl http://localhost:3000/health
```

### **Logs del Sistema**
El sistema registra automáticamente:
- 🌐 Inicio/cierre de navegador
- 🔐 Intentos de login
- 📱 Verificaciones SMS
- 📋 Navegación a páginas
- 🔍 Pedidos extraídos
- ✅ Pedidos creados
- ❌ Errores encontrados

## 🎯 **Próximos Pasos**

1. **Configurar** credenciales de Didí Food Partner
2. **Probar** con pedidos reales
3. **Configurar** verificación SMS si es requerida
4. **Ajustar** selectores si es necesario
5. **Monitorear** funcionamiento
6. **Expandir** a otras plataformas

## 💡 **Ventajas de Esta Solución**

- ✅ **Sin APIs oficiales** requeridas
- ✅ **Funciona inmediatamente** con cualquier restaurante
- ✅ **Información completa** del pedido
- ✅ **Soporte SMS** para verificación
- ✅ **Tiempo real** o casi tiempo real
- ✅ **Integración automática** con tu sistema
- ✅ **Escalable** a múltiples plataformas
- ✅ **Adaptable** a cambios en la interfaz

## 🔒 **Consideraciones de Seguridad**

- ✅ **Credenciales seguras** - Usar variables de entorno
- ✅ **Rotación de User-Agent** - Parecer más humano
- ✅ **Delays aleatorios** - Evitar detección (más conservador)
- ✅ **Manejo de errores** - Sistema robusto
- ✅ **Logs seguros** - No exponer credenciales
- ✅ **Verificación SMS** - Seguridad adicional de Didí

## 🌍 **Soporte Multi-Región**

Didí Food opera en múltiples países. El sistema soporta:
- 🇲🇽 **México** - `merchant.didiglobal.com/mx`
- 🇨🇴 **Colombia** - `merchant.didiglobal.com/co`
- 🇦🇷 **Argentina** - `merchant.didiglobal.com/ar`
- 🌍 **Otros países** - Configuración automática

---

**¡El sistema está listo para usar!** Solo necesitas configurar las credenciales de Didí Food Partner y el sistema comenzará a procesar pedidos automáticamente.

**Nota importante:** Didí Food frecuentemente requiere verificación SMS, por lo que es importante configurar el teléfono y usar el endpoint de verificación SMS cuando sea necesario.
