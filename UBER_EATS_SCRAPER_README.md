# 🌐 Web Scraper para Uber Eats - MultiDel

## 📋 **Descripción**

El sistema de web scraping permite integrar automáticamente pedidos de Uber Eats mediante el monitoreo del panel web de Uber Eats Partner. Esta solución funciona **sin necesidad de acceso a APIs oficiales** de Uber Eats.

## 🚀 **Características Implementadas**

### **✅ Funcionalidades Principales:**
- **🌐 Monitoreo automático** del panel web de Uber Eats
- **🔍 Scraper inteligente** que extrae datos del pedido
- **🔄 Integración automática** con tu sistema existente
- **📊 Dashboard en tiempo real** con nuevos pedidos
- **🛡️ Detección de cambios** en estados de pedidos
- **📝 Logging detallado** de todo el proceso
- **🤖 Automatización completa** con Puppeteer

### **✅ Componentes Creados:**
1. **`config/uberEatsScraping.js`** - Configuración del scraper
2. **`services/uberEatsScrapingService.js`** - Servicio principal de scraping
3. **`routes/uber-eats-scraping.js`** - Endpoints de control
4. **`test-uber-eats-scraper.js`** - Script de pruebas
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
# Credenciales de Uber Eats Partner
UBER_EATS_EMAIL=tu_email@restaurante.com
UBER_EATS_PASSWORD=tu_password_de_uber_eats

# Configuración del scraper
SCRAPER_HEADLESS=true
SCRAPER_TIMEOUT=30000
```

### **Paso 3: Configurar Acceso a Uber Eats Partner**
1. **Acceder** a [restaurants.ubereats.com](https://restaurants.ubereats.com)
2. **Hacer login** con tus credenciales de restaurante
3. **Verificar** que puedes ver la página de pedidos
4. **Configurar** las credenciales en tu archivo `.env`

### **Paso 4: Probar el Sistema**
```bash
# Probar scraper localmente
node test-uber-eats-scraper.js test

# Probar monitoreo continuo
node test-uber-eats-scraper.js monitor

# Iniciar servidor completo
npm start
```

## 🔧 **Uso del Sistema**

### **Iniciar el Servidor**
```bash
npm start
```

El sistema iniciará automáticamente:
- ✅ Monitoreo del panel web cada minuto
- ✅ Scraper automático de pedidos
- ✅ Integración con tu sistema existente

### **Endpoints Disponibles**

#### **Estado del Scraper**
```bash
GET /api/uber-eats-scraping/status
```

#### **Iniciar/Detener Monitoreo**
```bash
POST /api/uber-eats-scraping/start
Content-Type: application/json

{
  "email": "tu_email@restaurante.com",
  "password": "tu_password"
}

POST /api/uber-eats-scraping/stop
```

#### **Probar Login**
```bash
POST /api/uber-eats-scraping/test-login
Content-Type: application/json

{
  "email": "tu_email@restaurante.com",
  "password": "tu_password"
}
```

#### **Extraer Pedidos Manualmente**
```bash
POST /api/uber-eats-scraping/extract-orders
```

#### **Ver Configuración**
```bash
GET /api/uber-eats-scraping/config
```

## 🧪 **Pruebas**

### **Probar Scraper Localmente**
```bash
# Pruebas básicas
node test-uber-eats-scraper.js test

# Monitoreo continuo
node test-uber-eats-scraper.js monitor

# Ver ayuda
node test-uber-eats-scraper.js help
```

### **Probar con API**
```bash
# Probar login
curl -X POST http://localhost:3000/api/uber-eats-scraping/test-login \
  -H "Content-Type: application/json" \
  -d '{"email": "tu_email", "password": "tu_password"}'

# Ver estado
curl http://localhost:3000/api/uber-eats-scraping/status
```

## 📊 **Flujo de Funcionamiento**

```
1. Sistema inicia navegador automático
   ↓
2. Hace login en Uber Eats Partner
   ↓
3. Navega a página de pedidos
   ↓
4. Extrae datos de pedidos actuales
   ↓
5. Detecta nuevos pedidos
   ↓
6. Crea pedidos en tu sistema
   ↓
7. Dashboard se actualiza en tiempo real
   ↓
8. Se activa tracking automático
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
Editar `config/uberEatsScraping.js`:
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
    checkInterval: 60000, // 1 minuto
    maxOrdersPerCycle: 20
}
```

### **Configurar Navegador**
```javascript
browser: {
    headless: true, // false para ver el navegador
    timeout: 30000,
    viewport: { width: 1920, height: 1080 }
}
```

## 🚨 **Solución de Problemas**

### **Error de Login**
- ✅ Verificar credenciales de Uber Eats Partner
- ✅ Confirmar que el restaurante está activo
- ✅ Verificar que no hay bloqueos de seguridad

### **Scraper No Encuentra Pedidos**
- ✅ Verificar que hay pedidos en el panel
- ✅ Ajustar selectores en configuración
- ✅ Revisar logs del sistema

### **Navegador No Inicia**
- ✅ Verificar que Puppeteer está instalado
- ✅ Revisar permisos del sistema
- ✅ Probar con `headless: false`

### **Selectores Cambiaron**
- ✅ Uber Eats actualizó su interfaz
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
- 📋 Navegación a páginas
- 🔍 Pedidos extraídos
- ✅ Pedidos creados
- ❌ Errores encontrados

## 🎯 **Próximos Pasos**

1. **Configurar** credenciales de Uber Eats Partner
2. **Probar** con pedidos reales
3. **Ajustar** selectores si es necesario
4. **Monitorear** funcionamiento
5. **Expandir** a otras plataformas

## 💡 **Ventajas de Esta Solución**

- ✅ **Sin APIs oficiales** requeridas
- ✅ **Funciona inmediatamente** con cualquier restaurante
- ✅ **Información completa** del pedido
- ✅ **Tiempo real** o casi tiempo real
- ✅ **Integración automática** con tu sistema
- ✅ **Escalable** a múltiples plataformas
- ✅ **Adaptable** a cambios en la interfaz

## 🔒 **Consideraciones de Seguridad**

- ✅ **Credenciales seguras** - Usar variables de entorno
- ✅ **Rotación de User-Agent** - Parecer más humano
- ✅ **Delays aleatorios** - Evitar detección
- ✅ **Manejo de errores** - Sistema robusto
- ✅ **Logs seguros** - No exponer credenciales

---

**¡El sistema está listo para usar!** Solo necesitas configurar las credenciales de Uber Eats Partner y el sistema comenzará a procesar pedidos automáticamente.
