import makeWASocket, {
  Browsers,
  useMultiFileAuthState,
  DisconnectReason,
  WAMessage,
} from "baileys";
import qrcode from "qrcode-terminal";
import { Boom } from "@hapi/boom";
import { logger } from "./utils/logger";
import { FormattedMessage, getMessage } from "./utils/message";
import MessageHandler from "./handlers/message";
import { initTempCleaner } from "./plugins/cleanTemp";
import { initAssetsDownloader } from "./plugins/downloadAssets";
import { initSessionManager } from "./plugins/sessionManager";
import { initEnvManager } from "./plugins/envManager";
import { initDomicilioAPI } from "./plugins/delivery";

// Iniciar el limpiador de archivos temporales
initTempCleaner();

// Iniciar el descargador de assets
initAssetsDownloader();

// Iniciar el gestor de variables de entorno (API REST)
initEnvManager();

// Iniciar la API de cálculo de domicilios
initDomicilioAPI();

export const initWASocket = async (): Promise<void> => {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  // @ts-ignore
  const sock = makeWASocket({
    auth: state,
    browser: Browsers.appropriate("Desktop"),
    printQRInTerminal: false,
  });

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }: any) => {
    logger.info(
      `Socket Connection Update: ${connection || ""} ${lastDisconnect || ""}`
    );

    switch (connection) {
      case "close":
        logger.error("Conexion cerrada");
        const shouldReconnect =
          (lastDisconnect.error as Boom)?.output?.statusCode !==
          DisconnectReason.loggedOut;

        if (shouldReconnect) {
          initWASocket();
        }
        break;
      case "open":
        logger.info("Bot Conectado");
        // Iniciar el gestor de sesiones cuando el bot se conecta
        initSessionManager(sock);
        break;
    }

    if (qr !== undefined) {
      qrcode.generate(qr, { small: true });
    }
  });

  sock.ev.on("messages.upsert", ({ messages }: { messages: WAMessage[] }) => {
    for (let index = 0; index < messages.length; index++) {
      const message = messages[index];

      const isGroup = message.key.remoteJid?.endsWith("@g.us");
      const isStatus = message.key.remoteJid === "status@broadcast";

      if (isGroup || isStatus) return;

      // @ts-ignore
      const formattedMessage: FormattedMessage | undefined =
        getMessage(message);
      if (formattedMessage !== undefined) {
        MessageHandler(sock, formattedMessage);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
};

initWASocket();