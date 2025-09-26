const Imap = require('node-imap');
const { simpleParser } = require('mailparser');
const emailConfig = require('../config/email');
const rappiEmailParser = require('./rappiEmailParser');
const platformService = require('./platformService');

class EmailMonitoringService {
    constructor() {
        this.imap = null;
        this.isConnected = false;
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.processedEmails = new Set(); // Para evitar procesar emails duplicados
    }

    // Conectar al servidor IMAP
    async connect() {
        try {
            this.imap = new Imap(emailConfig.imap);
            
            return new Promise((resolve, reject) => {
                this.imap.once('ready', () => {
                    console.log('✅ Conectado al servidor de email');
                    this.isConnected = true;
                    resolve();
                });

                this.imap.once('error', (err) => {
                    console.error('❌ Error conectando al servidor de email:', err);
                    this.isConnected = false;
                    reject(err);
                });

                this.imap.once('end', () => {
                    console.log('📧 Conexión de email cerrada');
                    this.isConnected = false;
                });

                this.imap.connect();
            });
        } catch (error) {
            console.error('❌ Error inicializando conexión IMAP:', error);
            throw error;
        }
    }

    // Desconectar del servidor IMAP
    disconnect() {
        if (this.imap && this.isConnected) {
            this.imap.end();
            this.isConnected = false;
        }
    }

    // Iniciar monitoreo de emails
    async startMonitoring() {
        if (this.isMonitoring) {
            console.log('⚠️ El monitoreo de emails ya está activo');
            return;
        }

        try {
            await this.connect();
            this.isMonitoring = true;
            
            // Configurar monitoreo periódico
            this.monitoringInterval = setInterval(async () => {
                try {
                    await this.checkForNewEmails();
                } catch (error) {
                    console.error('❌ Error en monitoreo de emails:', error);
                }
            }, emailConfig.monitoring.checkInterval);

            console.log('🔄 Monitoreo de emails iniciado');
        } catch (error) {
            console.error('❌ Error iniciando monitoreo de emails:', error);
            throw error;
        }
    }

    // Detener monitoreo de emails
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.isMonitoring = false;
        this.disconnect();
        console.log('🛑 Monitoreo de emails detenido');
    }

    // Verificar nuevos emails
    async checkForNewEmails() {
        if (!this.isConnected) {
            console.log('⚠️ No hay conexión al servidor de email');
            return;
        }

        try {
            // Abrir buzón INBOX
            this.imap.openBox('INBOX', false, (err, box) => {
                if (err) {
                    console.error('❌ Error abriendo buzón:', err);
                    return;
                }

                // Buscar emails no leídos
                this.imap.search(['UNSEEN'], (err, results) => {
                    if (err) {
                        console.error('❌ Error buscando emails:', err);
                        return;
                    }

                    if (results.length === 0) {
                        console.log('📧 No hay emails nuevos');
                        return;
                    }

                    console.log(`📧 Encontrados ${results.length} emails nuevos`);
                    this.processEmails(results);
                });
            });
        } catch (error) {
            console.error('❌ Error verificando emails:', error);
        }
    }

    // Procesar emails encontrados
    async processEmails(emailIds) {
        const fetch = this.imap.fetch(emailIds, {
            bodies: '',
            struct: true
        });

        let processedCount = 0;
        const maxEmails = emailConfig.monitoring.maxEmailsPerCycle;

        fetch.on('message', (msg, seqno) => {
            if (processedCount >= maxEmails) {
                console.log(`⚠️ Límite de emails por ciclo alcanzado (${maxEmails})`);
                return;
            }

            let buffer = '';
            msg.on('body', (stream, info) => {
                stream.on('data', (chunk) => {
                    buffer += chunk.toString('utf8');
                });
            });

            msg.once('end', async () => {
                try {
                    const parsed = await simpleParser(buffer);
                    await this.processEmail(parsed);
                    processedCount++;
                } catch (error) {
                    console.error(`❌ Error procesando email ${seqno}:`, error);
                }
            });
        });

        fetch.once('error', (err) => {
            console.error('❌ Error obteniendo emails:', err);
        });

        fetch.once('end', () => {
            console.log(`✅ Procesados ${processedCount} emails`);
        });
    }

    // Procesar un email individual
    async processEmail(email) {
        try {
            // Verificar si es un email de Rappi
            if (this.isRappiEmail(email)) {
                console.log('📧 Procesando email de Rappi:', email.subject);
                
                // Parsear email de Rappi
                const orderData = await rappiEmailParser.parseEmail(email);
                
                if (orderData) {
                    // Crear pedido en el sistema
                    const order = await platformService.createOrder(orderData, 'Rappi');
                    console.log('✅ Pedido creado desde email:', order.id);
                    
                    // Marcar email como procesado
                    this.processedEmails.add(email.messageId);
                }
            }
        } catch (error) {
            console.error('❌ Error procesando email:', error);
        }
    }

    // Verificar si es un email de Rappi
    isRappiEmail(email) {
        const rappiConfig = emailConfig.platforms.rappi;
        
        // Verificar remitente
        const from = email.from?.text?.toLowerCase() || '';
        const isFromRappi = rappiConfig.filters.from.some(filter => 
            from.includes(filter.toLowerCase())
        );

        // Verificar asunto
        const subject = email.subject?.toLowerCase() || '';
        const isRappiSubject = rappiConfig.filters.subject.some(filter => 
            subject.includes(filter.toLowerCase())
        );

        // Verificar contenido
        const text = email.text?.toLowerCase() || '';
        const isRappiContent = rappiConfig.filters.keywords.some(keyword => 
            text.includes(keyword.toLowerCase())
        );

        return isFromRappi || isRappiSubject || isRappiContent;
    }

    // Obtener estado del servicio
    getStatus() {
        return {
            isConnected: this.isConnected,
            isMonitoring: this.isMonitoring,
            processedEmailsCount: this.processedEmails.size,
            lastCheck: new Date().toISOString()
        };
    }
}

module.exports = new EmailMonitoringService();
