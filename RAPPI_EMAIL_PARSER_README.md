# 📧 Parser de Emails para Rappi - MultiDel

## 📋 **Descripción**

El sistema de parser de emails permite integrar automáticamente pedidos de Rappi mediante el monitoreo de emails de notificación. Esta solución funciona **sin necesidad de acceso a APIs oficiales** de Rappi.

## 🚀 **Características Implementadas**

### **✅ Funcionalidades Principales:**
- **📧 Monitoreo automático** de emails de Rappi
- **🔍 Parser inteligente** que extrae datos del pedido
- **🔄 Integración automática** con tu sistema existente
- **📊 Dashboard en tiempo real** con nuevos pedidos
- **🛡️ Validación** de datos extraídos
- **📝 Logging detallado** de todo el proceso

### **✅ Componentes Creados:**
1. **`config/email.js`** - Configuración del sistema de email
2. **`services/emailMonitoringService.js`** - Servicio de monitoreo
3. **`services/rappiEmailParser.js`** - Parser específico de Rappi
4. **`routes/email-monitoring.js`** - Endpoints de control
5. **`test-rappi-parser.js`** - Script de pruebas
6. **`env.example`** - Configuración de variables de entorno

## 🛠️ **Instalación y Configuración**

### **Paso 1: Instalar Dependencias**
```bash
npm install node-imap mailparser cheerio node-cron
```

### **Paso 2: Configurar Variables de Entorno**
```bash
# Copiar archivo de ejemplo
cp env.example .env

# Editar .env con tus credenciales
```

**Variables importantes:**
```env
# Configuración de email
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
EMAIL_USER=pedidos@tu-restaurante.com
EMAIL_PASSWORD=tu_password_de_aplicacion_gmail
```

### **Paso 3: Configurar Email en Rappi**
1. **Acceder** al panel de restaurante de Rappi
2. **Ir a Configuración** → Notificaciones
3. **Cambiar email** a: `pedidos@tu-restaurante.com`
4. **Activar** todas las notificaciones de pedidos

### **Paso 4: Configurar Gmail (Recomendado)**
1. **Activar** autenticación de 2 factores
2. **Generar** contraseña de aplicación específica
3. **Usar** esa contraseña en `EMAIL_PASSWORD`

## 🔧 **Uso del Sistema**

### **Iniciar el Servidor**
```bash
npm start
```

El sistema iniciará automáticamente:
- ✅ Monitoreo de emails cada minuto
- ✅ Parser automático de emails de Rappi
- ✅ Integración con tu sistema existente

### **Endpoints Disponibles**

#### **Estado del Monitoreo**
```bash
GET /api/email-monitoring/status
```

#### **Iniciar/Detener Monitoreo**
```bash
POST /api/email-monitoring/start
POST /api/email-monitoring/stop
```

#### **Probar Parser**
```bash
POST /api/email-monitoring/test-parser
Content-Type: application/json

{
  "testText": "Pedido #12345\nCliente: Juan Pérez\nTotal: $50.00"
}
```

#### **Probar Conexión**
```bash
POST /api/email-monitoring/test-connection
```

## 🧪 **Pruebas**

### **Probar Parser Localmente**
```bash
node test-rappi-parser.js
```

### **Probar con Texto Personalizado**
```bash
curl -X POST http://localhost:3000/api/email-monitoring/test-parser \
  -H "Content-Type: application/json" \
  -d '{"testText": "Tu texto de email aquí"}'
```

## 📊 **Flujo de Funcionamiento**

```
1. Cliente hace pedido en Rappi
   ↓
2. Rappi envía email a pedidos@tu-restaurante.com
   ↓
3. Sistema detecta nuevo email (cada minuto)
   ↓
4. Parser extrae datos del pedido
   ↓
5. Se crea pedido en tu sistema
   ↓
6. Dashboard se actualiza en tiempo real
   ↓
7. Se activa tracking automático
```

## 🔍 **Datos Extraídos del Email**

El parser extrae automáticamente:
- ✅ **ID del pedido** (número único)
- ✅ **Nombre del cliente**
- ✅ **Teléfono del cliente**
- ✅ **Dirección de entrega**
- ✅ **Items del pedido** (nombre, cantidad, precio)
- ✅ **Total del pedido**
- ✅ **Estado del pedido**
- ✅ **Tiempo estimado**

## ⚙️ **Configuración Avanzada**

### **Personalizar Patrones de Extracción**
Editar `config/email.js`:
```javascript
patterns: {
    orderId: /pedido\s*#?(\d+)/i,
    customerName: /cliente[:\s]+([^\n\r]+)/i,
    // Agregar más patrones según necesites
}
```

### **Ajustar Intervalo de Monitoreo**
```javascript
monitoring: {
    checkInterval: 60000, // 1 minuto
    maxEmailsPerCycle: 10
}
```

## 🚨 **Solución de Problemas**

### **Error de Conexión IMAP**
- ✅ Verificar credenciales de email
- ✅ Activar autenticación de 2 factores en Gmail
- ✅ Usar contraseña de aplicación específica

### **Parser No Extrae Datos**
- ✅ Verificar formato del email de Rappi
- ✅ Ajustar patrones regex en configuración
- ✅ Probar con texto de ejemplo

### **Emails No Detectados**
- ✅ Verificar filtros de email en configuración
- ✅ Confirmar que Rappi envía emails
- ✅ Revisar logs del sistema

## 📈 **Monitoreo y Logs**

### **Ver Estado del Sistema**
```bash
curl http://localhost:3000/health
```

### **Logs del Sistema**
El sistema registra automáticamente:
- 📧 Emails detectados
- 🔍 Datos extraídos
- ✅ Pedidos creados
- ❌ Errores encontrados

## 🎯 **Próximos Pasos**

1. **Configurar** email en Rappi
2. **Probar** con pedidos reales
3. **Ajustar** patrones si es necesario
4. **Monitorear** funcionamiento
5. **Expandir** a otras plataformas

## 💡 **Ventajas de Esta Solución**

- ✅ **Sin APIs oficiales** requeridas
- ✅ **Funciona inmediatamente** con cualquier restaurante
- ✅ **Información completa** del pedido
- ✅ **Integración automática** con tu sistema
- ✅ **Escalable** a múltiples plataformas
- ✅ **Confiable** y estable

---

**¡El sistema está listo para usar!** Solo necesitas configurar el email en Rappi y el sistema comenzará a procesar pedidos automáticamente.
