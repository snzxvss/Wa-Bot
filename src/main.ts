import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { initializeDatabase } from './config/db';
import { seedProductos } from './config/seeders';
import { initializeWhatsApp, setMessageHandler } from './config/whatsapp';
import { errorHandler, notFoundHandler } from './infrastructure/middlewares/errorHandler';

// Importar servicios y dependencias
import { MySQLUsuarioRepository } from './infrastructure/repositories/mysqlUsuarioRepository';
import { MockClienteRepository } from './infrastructure/repositories/mockClienteRepository';
import { MySQLProductoRepository } from './infrastructure/repositories/mysqlProductoRepository';
import { MockPedidoRepository } from './infrastructure/repositories/mockPedidoRepository';

import { UsuarioService } from './application/services/usuarioService';
import { ClienteService } from './application/services/clienteService';
import { ProductoService } from './application/services/productoService';
import { PedidoService } from './application/services/pedidoService';
import { IAService } from './application/services/iaService';

// Importar proveedores de IA
import { OpenRouterProvider } from './infrastructure/ai/openRouterProvider';
import { OpenAIProvider } from './infrastructure/ai/openaiProvider';
import { GeminiProvider } from './infrastructure/ai/geminiProvider';

// Importar controladores
import { UsuarioController } from './infrastructure/controllers/usuarioController';

// Importar handlers de WhatsApp
import { MessageHandler } from './infrastructure/whatsapp/handlers/messageHandler';

// Configurar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging de requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Función para inicializar dependencias
async function initializeDependencies() {
  try {
    // Inicializar base de datos
    await initializeDatabase();
    
    // Sembrar datos iniciales
    await seedProductos();
    
    // Inicializar repositorios
    const usuarioRepository = new MySQLUsuarioRepository();
    const clienteRepository = new MockClienteRepository(); // Usar mock por ahora
    const productoRepository = new MySQLProductoRepository(); // Usar MySQL ahora
    const pedidoRepository = new MockPedidoRepository(); // Usar mock por ahora
    
    // Inicializar servicios
    const usuarioService = new UsuarioService(usuarioRepository);
    const clienteService = new ClienteService(clienteRepository);
    const productoService = new ProductoService(productoRepository);
    const pedidoService = new PedidoService(pedidoRepository, productoRepository, undefined); // Sin inventario por ahora
    
    // Inicializar proveedor de IA (prioridad: OpenRouter > Gemini > OpenAI)
    let llmProvider = null;
    if (process.env.OPENROUTER_API_KEY) {
      try {
        llmProvider = new OpenRouterProvider();
        logger.info('✅ Usando OpenRouter como proveedor de IA');
        logger.info(`📡 Modelo: ${llmProvider.getCurrentModel()}`);
        logger.info(`💰 Modelo gratuito: ${llmProvider.getModelInfo().isFree ? 'Sí' : 'No'}`);
      } catch (error) {
        logger.error('❌ Error inicializando OpenRouter:', error);
      }
    } else if (process.env.GEMINI_API_KEY) {
      try {
        llmProvider = new GeminiProvider();
        logger.info('✅ Usando Gemini como proveedor de IA');
      } catch (error) {
        logger.error('❌ Error inicializando Gemini:', error);
      }
    } else if (process.env.OPENAI_API_KEY) {
      try {
        llmProvider = new OpenAIProvider();
        logger.info('✅ Usando OpenAI como proveedor de IA');
      } catch (error) {
        logger.error('❌ Error inicializando OpenAI:', error);
      }
    } else {
      logger.warn('⚠️ No se configuró ningún proveedor de IA');
      logger.info('💡 Para usar IA, configura una de estas variables en .env:');
      logger.info('   - OPENROUTER_API_KEY (recomendado - modelos gratuitos disponibles)');
      logger.info('   - GEMINI_API_KEY');
      logger.info('   - OPENAI_API_KEY');
    }
    
    // Inicializar servicio de IA
    let iaService = null;
    if (llmProvider) {
      iaService = new IAService(llmProvider, clienteService, productoService, pedidoService);
      logger.info('Servicio de IA inicializado correctamente');
    }
    
    // Inicializar controladores
    const usuarioController = new UsuarioController(usuarioService);
    
    return {
      usuarioController,
      iaService,
      llmProvider
    };
  } catch (error) {
    logger.error('Error inicializando dependencias:', error);
    throw error;
  }
}

// Función para configurar rutas
function setupRoutes(dependencies: any) {
  try {
    logger.info('🔧 Configurando ruta de salud...');
    // Ruta de salud
    app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Wa-Bot API funcionando correctamente',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

    logger.info('🔧 Configurando rutas de usuarios...');
    // Rutas de usuarios
    const userRoutes = express.Router();
    
    try {
      logger.info('🔧 Configurando validations rules...');
      const validationRules = UsuarioController.getValidationRules();
      logger.info('✅ Validation rules obtenidas');
      
      userRoutes.post('/login', validationRules.login, dependencies.usuarioController.login);
      userRoutes.get('/profile', dependencies.usuarioController.getProfile);
      userRoutes.get('/', dependencies.usuarioController.findAll);
      userRoutes.get('/:id', dependencies.usuarioController.findById);
      userRoutes.post('/', validationRules.create, dependencies.usuarioController.create);
      userRoutes.put('/:id', validationRules.update, dependencies.usuarioController.update);
      userRoutes.delete('/:id', dependencies.usuarioController.delete);
      
      logger.info('🔧 Registrando rutas de usuarios...');
      app.use('/api/usuarios', userRoutes);
      logger.info('✅ Rutas de usuarios registradas');
    } catch (error) {
      logger.error('❌ Error configurando rutas de usuarios:', error);
      throw error;
    }

    // TODO: Agregar otras rutas cuando se implementen
    // app.use('/api/clientes', clienteRoutes);
    // app.use('/api/productos', productoRoutes);
    // app.use('/api/pedidos', pedidoRoutes);
    // app.use('/api/inventario', inventarioRoutes);
    // app.use('/api/ventas', ventaRoutes);

    logger.info('✅ Rutas de API configuradas exitosamente');
  } catch (error) {
    logger.error('💥 Error configurando rutas:', error);
    throw error;
  }
}

// Función para inicializar WhatsApp
async function initializeWhatsAppHandlers(dependencies: any) {
  try {
    logger.info('🔧 Definiendo setupMessageHandlers...');
    // Definir la función para configurar los handlers
    const setupMessageHandlers = (sock: any) => {
      logger.info('🔧 Configurando message handlers para socket...');
      // Configurar handler de mensajes si hay servicio de IA
      if (dependencies.iaService) {
        const messageHandler = new MessageHandler(dependencies.iaService);
        
        sock.ev.on('messages.upsert', ({ messages, type }: any) => {
          logger.info(`📨 Evento messages.upsert recibido: type=${type}, cantidad=${messages.length}`);
          
          if (type === 'notify') {
            messages.forEach(async (message: any, index: number) => {
              logger.info(`📩 Procesando mensaje ${index + 1}/${messages.length}`);
              logger.info(`🔑 Key: fromMe=${message.key.fromMe}, remoteJid=${message.key.remoteJid}`);
              logger.info(`💬 Message keys: ${Object.keys(message.message || {}).join(', ')}`);
              
              if (!message.key.fromMe && message.message) {
                logger.info('✅ Mensaje válido para procesar, enviando a MessageHandler...');
                await messageHandler.handleMessage(sock, message);
              } else {
                logger.info(`❌ Mensaje ignorado: fromMe=${message.key.fromMe}, hasMessage=${!!message.message}`);
              }
            });
          } else {
            logger.info(`ℹ️ Evento messages.upsert con type=${type} - ignorado`);
          }
        });

        logger.info('✅ MessageHandler configurado con IA');
      } else {
        // Configurar handler básico sin IA
        sock.ev.on('messages.upsert', ({ messages, type }: any) => {
          logger.info(`📨 Evento messages.upsert recibido (modo básico): type=${type}, cantidad=${messages.length}`);
          
          if (type === 'notify') {
            messages.forEach(async (message: any, index: number) => {
              logger.info(`📩 Procesando mensaje ${index + 1}/${messages.length} (modo básico)`);
              logger.info(`🔑 Key: fromMe=${message.key.fromMe}, remoteJid=${message.key.remoteJid}`);
              
              if (!message.key.fromMe && message.message) {
                const from = message.key.remoteJid;
                const text = message.message.conversation || 
                            message.message.extendedTextMessage?.text || 
                            'Mensaje no de texto';
                
                logger.info(`📱 Mensaje de ${from}: ${text}`);
                
                // Respuesta simple por ahora
                if (text.toLowerCase().includes('hola')) {
                  logger.info('🤖 Enviando respuesta de saludo...');
                  await sock.sendMessage(from!, {
                    text: '¡Hola! 👋 Soy el bot de Wa-Bot. El servicio de IA no está disponible en este momento.'
                  });
                  logger.info('✅ Respuesta enviada');
                } else {
                  logger.info('📝 Enviando respuesta automática...');
                  await sock.sendMessage(from!, {
                    text: '📱 Mensaje recibido. Escribe "hola" para obtener una respuesta.'
                  });
                  logger.info('✅ Respuesta automática enviada');
                }
              } else {
                logger.info(`❌ Mensaje ignorado: fromMe=${message.key.fromMe}, hasMessage=${!!message.message}`);
              }
            });
          }
        });

        logger.warn('⚠️ Handler básico configurado (sin IA)');
      }
    };

    // Registrar el callback para reconexiones
    logger.info('🔧 Registrando callback para reconexiones...');
    setMessageHandler(setupMessageHandlers);
    logger.info('✅ Callback registrado');
    
    // Inicializar WhatsApp
    logger.info('🔧 Inicializando socket de WhatsApp...');
    const sock = await initializeWhatsApp();
    logger.info('✅ Socket de WhatsApp inicializado');
    
    // Los handlers se configurarán automáticamente cuando la conexión esté abierta
    // mediante el callback registrado en setMessageHandler

    logger.info('✅ Handlers de WhatsApp configurados completamente');
  } catch (error) {
    logger.error('❌ Error inicializando WhatsApp:', error);
    throw error; // Re-lanzar el error para que se capture en main
  }
}

// Función principal
async function main() {
  try {
    logger.info('🚀 Iniciando Wa-Bot...');

    // Inicializar dependencias
    const dependencies = await initializeDependencies();
    logger.info('✅ Dependencias inicializadas');

    // Configurar rutas
    logger.info('🔧 Configurando rutas...');
    setupRoutes(dependencies);
    logger.info('✅ Rutas configuradas');

    // Configurar middlewares
    logger.info('🔧 Configurando middlewares...');
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cors());
    logger.info('✅ Middlewares básicos configurados');

    // Configurar middlewares de error
    logger.info('🔧 Configurando middlewares de error...');
    app.use(notFoundHandler);
    app.use(errorHandler);
    logger.info('✅ Middlewares de error configurados');

    // Inicializar WhatsApp
    logger.info('🔧 Inicializando WhatsApp handlers...');
    await initializeWhatsAppHandlers(dependencies);
    logger.info('✅ WhatsApp handlers inicializados');

    // Iniciar servidor
    logger.info('🔧 Iniciando servidor HTTP...');
    app.listen(PORT, () => {
      logger.info(`🌐 Servidor API iniciado en puerto ${PORT}`);
      logger.info(`📱 WhatsApp Bot iniciado`);
      logger.info(`💚 Health check: http://localhost:${PORT}/health`);
      logger.info(`🏗️  Arquitectura Clean implementada`);
    });
    logger.info('✅ Servidor HTTP configurado');

  } catch (error) {
    logger.error('💥 Error fatal iniciando la aplicación:', error);
    process.exit(1);
  }
}

// Manejar cierre graceful
process.on('SIGINT', () => {
  logger.info('🔄 Cerrando aplicación (SIGINT)...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('🔄 Cerrando aplicación (SIGTERM)...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('=== EXCEPCION NO CAPTURADA ===');
  console.error('Error:', error.name);
  console.error('Mensaje:', error.message);
  console.error('Stack:', error.stack);
  console.error('==============================');
  logger.error('💥 Excepción no capturada - Ver detalles arriba');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('=== PROMESA RECHAZADA NO MANEJADA ===');
  console.error('Razon:', reason);
  console.error('Promise:', promise);
  console.error('====================================');
  logger.error('💥 Promesa rechazada no manejada - Ver detalles arriba');
  process.exit(1);
});

// Iniciar aplicación
main();
