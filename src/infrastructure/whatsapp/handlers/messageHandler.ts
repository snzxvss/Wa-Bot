import { WAMessage, WASocket } from 'baileys';
import { IAService } from '../../../application/services/iaService';
import { logger } from '../../../utils/logger';

export class MessageHandler {
  constructor(private iaService: IAService) {}

  async handleMessage(sock: WASocket, message: WAMessage): Promise<void> {
    try {
      logger.info('🔍 MessageHandler: Procesando mensaje entrante...');
      
      // Verificar que el mensaje es válido
      if (!message.key.remoteJid || !message.message) {
        logger.warn('⚠️ Mensaje inválido: falta remoteJid o message');
        return;
      }

      // Extraer información del mensaje
      const from = message.key.remoteJid;
      const messageText = this.extractMessageText(message);
      
      logger.info(`📍 Mensaje de: ${from}`);
      logger.info(`📝 Tipo de mensaje: ${Object.keys(message.message || {})[0]}`);
      logger.info(`💬 Texto extraído: ${messageText || 'N/A'}`);
      
      if (!messageText) {
        logger.warn('⚠️ No se pudo extraer texto del mensaje');
        return;
      }

      // Obtener número de teléfono del remitente
      const phoneNumber = from.split('@')[0];
      
      // Obtener nombre del contacto si está disponible
      const pushName = message.pushName || undefined;

      logger.info(`📱 Mensaje recibido de ${phoneNumber} (${pushName || 'Sin nombre'}): ${messageText}`);

      // Verificar si es un comando
      if (messageText.startsWith('/')) {
        const [command, ...args] = messageText.slice(1).split(' ');
        await this.handleCommand(sock, from, command, args);
        return;
      }

      // Procesar mensaje con IA
      const response = await this.iaService.procesarMensaje(
        phoneNumber,
        messageText,
        pushName
      );

      // Enviar respuesta
      await sock.sendMessage(from, { text: response });

      logger.info(`Respuesta enviada a ${phoneNumber}: ${response}`);

    } catch (error) {
      logger.error('Error procesando mensaje:', error);
      
      // Enviar mensaje de error al usuario
      if (message.key.remoteJid) {
        await sock.sendMessage(message.key.remoteJid, {
          text: 'Lo siento, ha ocurrido un error procesando tu mensaje. Por favor, intenta nuevamente.'
        });
      }
    }
  }

  private extractMessageText(message: WAMessage): string | null {
    // Texto simple
    if (message.message?.conversation) {
      return message.message.conversation;
    }

    // Mensaje extendido
    if (message.message?.extendedTextMessage?.text) {
      return message.message.extendedTextMessage.text;
    }

    // Otros tipos de mensaje (imagen con caption, etc.)
    if (message.message?.imageMessage?.caption) {
      return message.message.imageMessage.caption;
    }

    if (message.message?.videoMessage?.caption) {
      return message.message.videoMessage.caption;
    }

    return null;
  }

  async handleCommand(sock: WASocket, from: string, command: string, args: string[]): Promise<void> {
    try {
      const phoneNumber = from.split('@')[0];

      switch (command.toLowerCase()) {
        case 'productos':
        case 'buscar':
          const query = args.join(' ');
          if (!query) {
            await sock.sendMessage(from, {
              text: 'Por favor, especifica qué producto estás buscando. Ejemplo: /productos camisa'
            });
            return;
          }

          const productosResponse = await this.iaService.buscarProductos(query);
          await sock.sendMessage(from, { text: productosResponse });
          break;

        case 'pedidos':
        case 'mispedidos':
          const pedidosResponse = await this.iaService.consultarPedidos(phoneNumber);
          await sock.sendMessage(from, { text: pedidosResponse });
          break;

        case 'ayuda':
        case 'help':
          const helpText = `
*Comandos disponibles:*

📋 */productos [búsqueda]* - Buscar productos
📦 */pedidos* - Ver tus pedidos
❓ */ayuda* - Mostrar esta ayuda

También puedes enviarme mensajes directos y te ayudaré con:
• Información de productos
• Estado de pedidos
• Proceso de compra
• Consultas generales

¡Estoy aquí para ayudarte! 😊
          `;
          await sock.sendMessage(from, { text: helpText });
          break;

        default:
          await sock.sendMessage(from, {
            text: 'Comando no reconocido. Escribe */ayuda* para ver los comandos disponibles.'
          });
      }

    } catch (error) {
      logger.error('Error procesando comando:', error);
      await sock.sendMessage(from, {
        text: 'Error procesando comando. Por favor, intenta nuevamente.'
      });
    }
  }
}
