import makeWASocket, { 
  Browsers, 
  useMultiFileAuthState, 
  DisconnectReason,
  fetchLatestBaileysVersion
} from 'baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';

async function testWhatsAppConnection() {
  console.log('🔧 Probando conexión a WhatsApp...\n');

  try {
    const { state, saveCreds } = await useMultiFileAuthState('test-wa-session');
    
    // Obtener la versión más reciente
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`📱 Versión WhatsApp: ${version} (última: ${isLatest})\n`);

    const sock = makeWASocket({
      auth: state,
      version,
      browser: Browsers.ubuntu('Chrome'),
      printQRInTerminal: true,
      qrTimeout: 40000,
    });

    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      console.log(`🔄 Estado de conexión: ${connection || 'desconocido'}`);

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
        
        console.log(`❌ Conexión cerrada. Código: ${statusCode}. ¿Reconectar?: ${shouldReconnect}`);
        
        if (shouldReconnect && statusCode !== DisconnectReason.restartRequired) {
          console.log('🔄 Reintentando en 5 segundos...');
          setTimeout(() => testWhatsAppConnection(), 5000);
        } else {
          console.log('🛑 No se puede reconectar automáticamente');
          process.exit(1);
        }
      } else if (connection === 'open') {
        console.log('✅ ¡Conexión establecida exitosamente!');
        console.log('🎉 WhatsApp conectado correctamente');
        
        // Opcional: cerrar después de conectar exitosamente
        setTimeout(() => {
          console.log('✅ Prueba completada exitosamente');
          process.exit(0);
        }, 3000);
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // Timeout de seguridad
    setTimeout(() => {
      console.log('⏱️ Timeout de conexión alcanzado');
      process.exit(1);
    }, 120000); // 2 minutos

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    process.exit(1);
  }
}

// Ejecutar la prueba
testWhatsAppConnection().catch(console.error);
