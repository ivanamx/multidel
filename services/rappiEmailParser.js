const cheerio = require('cheerio');
const emailConfig = require('../config/email');

class RappiEmailParser {
    constructor() {
        this.config = emailConfig.platforms.rappi;
    }

    // Parsear email de Rappi y extraer datos del pedido
    async parseEmail(email) {
        try {
            console.log('🔍 Parseando email de Rappi...');
            
            // Extraer texto del email
            const emailText = this.extractEmailText(email);
            
            // Parsear datos del pedido
            const orderData = this.parseOrderData(emailText);
            
            // Validar datos extraídos
            if (this.validateOrderData(orderData)) {
                console.log('✅ Datos del pedido extraídos correctamente:', orderData);
                return orderData;
            } else {
                console.log('⚠️ Datos del pedido incompletos:', orderData);
                return null;
            }
        } catch (error) {
            console.error('❌ Error parseando email de Rappi:', error);
            return null;
        }
    }

    // Extraer texto del email (HTML y texto plano)
    extractEmailText(email) {
        let text = '';
        
        // Priorizar HTML si está disponible
        if (email.html) {
            text = this.extractTextFromHTML(email.html);
        } else if (email.text) {
            text = email.text;
        } else {
            console.log('⚠️ No se encontró contenido en el email');
            return '';
        }

        return text;
    }

    // Extraer texto de HTML usando Cheerio
    extractTextFromHTML(html) {
        try {
            const $ = cheerio.load(html);
            
            // Remover scripts y estilos
            $('script, style').remove();
            
            // Extraer texto de elementos específicos que contienen información del pedido
            let text = '';
            
            // Buscar elementos comunes donde Rappi pone la información
            const selectors = [
                '.order-info',
                '.pedido-info',
                '.order-details',
                '.pedido-details',
                'table',
                '.content',
                'body'
            ];

            for (const selector of selectors) {
                const element = $(selector);
                if (element.length > 0) {
                    text = element.text();
                    break;
                }
            }

            // Si no se encuentra nada específico, usar todo el texto
            if (!text) {
                text = $('body').text();
            }

            return text;
        } catch (error) {
            console.error('❌ Error extrayendo texto de HTML:', error);
            return html; // Fallback al HTML original
        }
    }

    // Parsear datos del pedido usando patrones regex
    parseOrderData(text) {
        const patterns = this.config.parser.patterns;
        const orderData = {};

        try {
            // Extraer ID del pedido
            const orderIdMatch = text.match(patterns.orderId);
            if (orderIdMatch) {
                orderData.platform_order_id = orderIdMatch[1];
            }

            // Extraer nombre del cliente
            const customerNameMatch = text.match(patterns.customerName);
            if (customerNameMatch) {
                orderData.customer_name = customerNameMatch[1].trim();
            }

            // Extraer teléfono del cliente
            const customerPhoneMatch = text.match(patterns.customerPhone);
            if (customerPhoneMatch) {
                orderData.customer_phone = customerPhoneMatch[1].trim();
            }

            // Extraer dirección
            const addressMatch = text.match(patterns.address);
            if (addressMatch) {
                orderData.customer_address = addressMatch[1].trim();
            }

            // Extraer total
            const totalMatch = text.match(patterns.total);
            if (totalMatch) {
                orderData.total_amount = parseFloat(totalMatch[1].replace(',', ''));
            }

            // Extraer estado
            const statusMatch = text.match(patterns.status);
            if (statusMatch) {
                const rawStatus = statusMatch[1].trim().toLowerCase();
                orderData.status = this.mapStatus(rawStatus);
            }

            // Extraer items del pedido (patrón más complejo)
            orderData.items = this.extractItems(text);

            // Agregar información adicional
            orderData.platform = 'Rappi';
            orderData.source = 'email';
            orderData.created_at = new Date();

            return orderData;
        } catch (error) {
            console.error('❌ Error parseando datos del pedido:', error);
            return {};
        }
    }

    // Extraer items del pedido
    extractItems(text) {
        const items = [];
        
        try {
            // Patrones comunes para items en emails de Rappi
            const itemPatterns = [
                // Patrón: "2x Hamburguesa - $25.00"
                /(\d+)x\s+([^-]+?)\s*-\s*\$?([0-9,]+\.?[0-9]*)/gi,
                // Patrón: "Hamburguesa (2) - $25.00"
                /([^(]+?)\s*\((\d+)\)\s*-\s*\$?([0-9,]+\.?[0-9]*)/gi,
                // Patrón: "• 2 Hamburguesa $25.00"
                /•\s*(\d+)\s+([^$]+?)\s*\$?([0-9,]+\.?[0-9]*)/gi
            ];

            for (const pattern of itemPatterns) {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    const quantity = parseInt(match[1]) || 1;
                    const name = match[2].trim();
                    const price = parseFloat(match[3].replace(',', ''));

                    items.push({
                        name: name,
                        quantity: quantity,
                        price: price,
                        total: quantity * price
                    });
                }
            }

            // Si no se encontraron items con patrones, intentar extracción básica
            if (items.length === 0) {
                items.push({
                    name: 'Pedido Rappi',
                    quantity: 1,
                    price: 0,
                    total: 0
                });
            }

            return items;
        } catch (error) {
            console.error('❌ Error extrayendo items:', error);
            return [{
                name: 'Pedido Rappi',
                quantity: 1,
                price: 0,
                total: 0
            }];
        }
    }

    // Mapear estado de Rappi a estado interno
    mapStatus(rappiStatus) {
        const statusMap = this.config.parser.statusMap;
        
        // Buscar coincidencia exacta
        if (statusMap[rappiStatus]) {
            return statusMap[rappiStatus];
        }

        // Buscar coincidencia parcial
        for (const [key, value] of Object.entries(statusMap)) {
            if (rappiStatus.includes(key) || key.includes(rappiStatus)) {
                return value;
            }
        }

        // Estado por defecto
        return 'pending';
    }

    // Validar datos del pedido
    validateOrderData(orderData) {
        const requiredFields = ['platform_order_id', 'customer_name'];
        
        for (const field of requiredFields) {
            if (!orderData[field]) {
                console.log(`⚠️ Campo requerido faltante: ${field}`);
                return false;
            }
        }

        // Validar que el ID del pedido sea numérico
        if (!/^\d+$/.test(orderData.platform_order_id)) {
            console.log('⚠️ ID del pedido no es numérico:', orderData.platform_order_id);
            return false;
        }

        return true;
    }

    // Método para probar el parser con texto de ejemplo
    async testParser(testText) {
        console.log('🧪 Probando parser con texto de ejemplo...');
        
        const mockEmail = {
            html: testText,
            text: testText,
            subject: 'Nuevo pedido Rappi',
            from: { text: 'noreply@rappi.com' }
        };

        return await this.parseEmail(mockEmail);
    }
}

module.exports = new RappiEmailParser();
