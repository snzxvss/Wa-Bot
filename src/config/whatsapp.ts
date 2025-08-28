import makeWASocket, { 
  Browsers, 
  useMultiFileAuthState, 
  DisconnectReason,
  WASocket,
  fetchLatestBaileysVersion
} from 'baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { logger } from '../utils/logger';

export let whatsappSocket: WASocket | null = null;
export let messageHandlerCallback: ((sock: WASocket) => void) | null = null;

export const setMessageHandler = (callback: (sock: WASocket) => void) => {
  messageHandlerCallback = callback;
};

export const initializeWhatsApp = async (): Promise<WASocket> => {
  const { state, saveCreds } = await useMultiFileAuthState(
    process.env.WA_SESSION_NAME || 'wa-bot-session'
  );

  // Obtener la versión más reciente de Baileys
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info(`Usando versión de WhatsApp: ${version}, es la última: ${isLatest}`);

  const sock = makeWASocket({
    auth: state,
    version,
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: true,
    keepAliveIntervalMs: 30000, // Reducido para mantener conexión más activa
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    emitOwnEvents: false,
    fireInitQueries: true,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    qrTimeout: 60000, // Timeout para el QR de 60 segundos
    // Configuraciones adicionales para estabilidad
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 5,
    // Configurar reconexión automática
    shouldSyncHistoryMessage: () => false,
    shouldIgnoreJid: () => false,
  });

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    try {
      logger.info(`Socket Connection Update: ${connection || ''}`);

      if (qr) {
        console.log('\n🔗 ==========================================');
        console.log('📱 CÓDIGO QR PARA WHATSAPP');
        console.log('🔗 ==========================================\n');
        qrcode.generate(qr, { small: true });
        console.log('\n📋 Instrucciones:');
        console.log('1. Abre WhatsApp en tu teléfono');
        console.log('2. Ve a Configuración > Dispositivos vinculados');
        console.log('3. Toca "Vincular un dispositivo"');
        console.log('4. Escanea el código QR de arriba');
        console.log('🔗 ==========================================\n');
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        
        logger.info(`Conexión cerrada. Código: ${statusCode}. Reconectando: ${shouldReconnect}`);
        
        if (shouldReconnect) {
          // Aumentar el tiempo de reconexión para evitar loops de reconexión
          const reconnectDelay = statusCode === 428 ? 10000 : 3000; // 10 segundos para error 428
          logger.info(`🔄 Reintentando conexión en ${reconnectDelay/1000} segundos...`);
          setTimeout(async () => {
            try {
              await initializeWhatsApp();
            } catch (err) {
              logger.error('Error al reinicializar WhatsApp:', err);
            }
          }, reconnectDelay);
        } else {
          logger.warn('❌ Sesión cerrada permanentemente. Reinicia el bot para generar un nuevo QR.');
        }
      } else if (connection === 'open') {
        logger.info('✅ Conexión a WhatsApp establecida exitosamente');
        logger.info('🎉 Bot listo para recibir mensajes');
        whatsappSocket = sock;
        
        // Configurar el handler de mensajes si existe
        if (messageHandlerCallback) {
          logger.info('🔄 Reconfigurando handlers de mensajes...');
          messageHandlerCallback(sock);
          logger.info('✅ Handlers reconfigurados exitosamente');
        }
      } else if (connection === 'connecting') {
        logger.info('🔄 Conectando a WhatsApp...');
      }
    } catch (error) {
      logger.error('❌ Error en connection.update:', error);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Eventos adicionales para mantener la sesión
  sock.ev.on('messaging-history.set', () => {
    logger.info('📚 Historial de mensajes cargado');
  });

  return sock;
};
