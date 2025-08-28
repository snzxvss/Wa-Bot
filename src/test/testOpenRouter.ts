import dotenv from 'dotenv';
import { OpenRouterProvider } from '../infrastructure/ai/openRouterProvider';

dotenv.config();

async function testOpenRouter() {
  try {
    console.log('🧪 Probando OpenRouter...');
    
    const provider = new OpenRouterProvider();
    
    // Test health check
    console.log('Verificando salud del servicio...');
    const isHealthy = await provider.isHealthy();
    console.log(`Salud: ${isHealthy ? '✅ OK' : '❌ Error'}`);
    
    if (!isHealthy) {
      console.log('❌ El servicio no está disponible');
      return;
    }
    
    // Test mensaje simple
    console.log('\nEnviando mensaje de prueba...');
    const response = await provider.generateResponse([
      {
        rol: 'sistema',
        contenido: 'Eres un asistente virtual amigable para un negocio de WhatsApp.',
        timestamp: new Date()
      },
      {
        rol: 'usuario',
        contenido: '¡Hola! ¿Cómo estás?',
        timestamp: new Date()
      }
    ]);
    
    console.log('✅ Respuesta recibida:');
    console.log(`Modelo: ${response.modelo}`);
    console.log(`Tokens: ${response.tokens || 'No especificado'}`);
    console.log(`Contenido: ${response.contenido}`);
    
    // Test información del modelo
    console.log('\nInformación del modelo:');
    console.log(`Modelo actual: ${provider.getCurrentModel()}`);
    console.log('Info del modelo:', provider.getModelInfo());
    console.log('Modelos gratuitos disponibles:', OpenRouterProvider.getFreeModels());
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testOpenRouter();
}

export { testOpenRouter };
