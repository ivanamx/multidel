# 🚀 MultiDel - Plataforma Unificada de Delivery

## 📋 **Descripción**

MultiDel es una plataforma que unifica pedidos de múltiples plataformas de delivery (Uber Eats, Rappi, Didí Food) en una sola interfaz para gestionar tu negocio de manera eficiente.

## ✨ **Características Principales**

- **🔄 Integración Multiplataforma**: Conecta con Uber Eats, Rappi, Didí Food
- **📊 Dashboard Unificado**: Interfaz web moderna para gestionar todos los pedidos
- **⚡ Tiempo Real**: Actualizaciones automáticas via WebSockets
- **📧 Parser de Emails**: Integración automática con Rappi via email
- **🌐 Web Scraping**: Monitoreo automático de Uber Eats y Didí Food
- **🗺️ Tracking en Tiempo Real**: Seguimiento de entregas en mapa interactivo
- **📱 Responsive**: Funciona en desktop, tablet y móvil
- **🔒 Seguro**: Autenticación JWT y validación de datos

## 🛠️ **Tecnologías Utilizadas**

- **Backend**: Node.js, Express.js, PostgreSQL
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **WebSockets**: Socket.IO para tiempo real
- **Web Scraping**: Puppeteer para automatización
- **Email Parsing**: Node-IMAP para Rappi
- **Base de Datos**: PostgreSQL con migraciones
- **Seguridad**: Helmet, CORS, Rate Limiting

## 🚀 **Instalación Rápida**

### **Prerrequisitos**
- Node.js 16+
- PostgreSQL 12+
- Git

### **Pasos de Instalación**

1. **Clonar el repositorio**
```bash
git clone <tu-repositorio-privado>
cd multidel
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar base de datos**
```bash
# Crear base de datos PostgreSQL
createdb multidel_db

# Ejecutar migraciones
npm run db:migrate
```

4. **Configurar variables de entorno**
```bash
# Copiar archivo de ejemplo
cp env.example .env

# Editar .env con tus configuraciones
```

5. **Iniciar el servidor**
```bash
npm start
```

## ⚙️ **Configuración de Plataformas**

### **Rappi (Email Parsing)**
```env
EMAIL_HOST=imap.gmail.com
EMAIL_USER=pedidos@tu-restaurante.com
EMAIL_PASSWORD=tu_password_de_aplicacion
```

### **Uber Eats (Web Scraping)**
```env
UBER_EATS_EMAIL=tu_email@restaurante.com
UBER_EATS_PASSWORD=tu_password_de_uber_eats
```

### **Didí Food (Web Scraping)**
```env
DIDI_FOOD_EMAIL=tu_email@restaurante.com
DIDI_FOOD_PASSWORD=tu_password_de_didi_food
DIDI_FOOD_PHONE=+52XXXXXXXXXX
```

## 📊 **Funcionalidades por Plataforma**

| Plataforma | Método de Integración | Tiempo de Respuesta | Estado |
|------------|----------------------|-------------------|--------|
| **Rappi** | 📧 Parser de Emails | 1-3 minutos | ✅ Implementado |
| **Uber Eats** | 🌐 Web Scraping | 1-2 minutos | ✅ Implementado |
| **Didí Food** | 🌐 Web Scraping + SMS | 1.5-3 minutos | ✅ Implementado |

## 🔧 **Scripts Disponibles**

```bash
# Desarrollo
npm run dev          # Servidor con nodemon
npm start            # Servidor de producción

# Base de datos
npm run db:migrate   # Ejecutar migraciones
npm run db:seed      # Poblar con datos de prueba

# Pruebas
node test-rappi-parser.js      # Probar parser de Rappi
node test-uber-eats-scraper.js # Probar scraper de Uber Eats
node test-didi-food-scraper.js # Probar scraper de Didí Food
```

## 🌐 **Endpoints de la API**

### **Pedidos**
- `GET /api/orders` - Listar pedidos
- `POST /api/orders` - Crear pedido
- `PATCH /api/orders/:id/status` - Actualizar estado

### **Monitoreo**
- `GET /api/email-monitoring/status` - Estado de Rappi
- `GET /api/uber-eats-scraping/status` - Estado de Uber Eats
- `GET /api/didi-food-scraping/status` - Estado de Didí Food

### **Dashboard**
- `GET /api/dashboard` - Interfaz web principal
- `GET /health` - Estado del sistema

## 📱 **Acceso a la Aplicación**

- **Dashboard Web**: http://localhost:3000/api/dashboard
- **API Health Check**: http://localhost:3000/health
- **Documentación API**: http://localhost:3000/api

## 🔒 **Seguridad**

- **Autenticación JWT** para acceso a la API
- **Rate Limiting** para prevenir abusos
- **CORS** configurado correctamente
- **Helmet** para headers de seguridad
- **Validación de datos** con Joi
- **Variables de entorno** para credenciales sensibles

## 📈 **Monitoreo y Logs**

El sistema incluye logging detallado para:
- 📧 Procesamiento de emails de Rappi
- 🌐 Web scraping de Uber Eats y Didí Food
- 🔄 Cambios de estado de pedidos
- ❌ Errores y excepciones
- 📊 Métricas de rendimiento

## 🚨 **Solución de Problemas**

### **Error de Conexión a Base de Datos**
```bash
# Verificar que PostgreSQL esté ejecutándose
pg_ctl status

# Verificar credenciales en .env
DB_HOST=localhost
DB_NAME=multidel_db
DB_USER=postgres
DB_PASSWORD=tu_password
```

### **Error de Web Scraping**
```bash
# Probar scraper individualmente
node test-uber-eats-scraper.js test
node test-didi-food-scraper.js test
```

### **Error de Email Parsing**
```bash
# Probar parser de emails
node test-rappi-parser.js
```

## 🤝 **Contribución**

Este es un proyecto privado. Para contribuir:

1. **Fork** el repositorio (si tienes acceso)
2. **Crear** una rama para tu feature
3. **Commit** tus cambios
4. **Push** a la rama
5. **Crear** un Pull Request

## 📄 **Licencia**

Este proyecto es privado y está protegido por derechos de autor. No se permite el uso comercial sin autorización expresa.

## 📞 **Soporte**

Para soporte técnico o consultas:
- **Email**: soporte@multidel.com
- **Documentación**: Ver archivos README específicos por plataforma

## 🎯 **Roadmap**

- [ ] Integración con más plataformas de delivery
- [ ] App móvil para restaurantes
- [ ] Analytics avanzados
- [ ] Integración con sistemas de inventario
- [ ] API pública para desarrolladores

---

**MultiDel** - Simplificando la gestión de delivery para restaurantes 🍕🚀