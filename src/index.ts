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
import { initializeDiscord } from "./handlers/discordHandler";

// Este archivo inicializa el socket de WhatsApp y escucha mensajes entrantes.
// Los mensajes se procesan y se reenvían a Discord mediante el manejador de mensajes.

// Archivos relacionados:
// - handlers/message.ts: Procesa mensajes de WhatsApp y los reenvía a Discord.
// - handlers/discordHandler.ts: Escucha mensajes de Discord y los reenvía a WhatsApp.

let waSocketInstance: ReturnType<typeof makeWASocket> | null = null;

export const initWASocket = async (): Promise<ReturnType<typeof makeWASocket>> => {
  if (waSocketInstance) {
    logger.info("Socket de WhatsApp ya inicializado. Reutilizando instancia existente.");
    return waSocketInstance;
  }

  const { state, saveCreds } = await useMultiFileAuthState("auth");

  // @ts-ignore
  const sock = makeWASocket({
    auth: state,
    browser: Browsers.appropriate("Desktop"),
    printQRInTerminal: false,
  });

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }: any) => {
    if (connection === "close") {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      logger.error("Conexion cerrada", lastDisconnect?.error);
      if (shouldReconnect) {
        logger.info("Intentando reconectar...");
        initWASocket();
      }
    } else if (connection === "open") {
      logger.info("Bot Conectado");
    }

    if (qr !== undefined) {
      qrcode.generate(qr, { small: true });
      logger.info("Escanea el código QR para conectar WhatsApp.");
    }
  });

  sock.ev.on("messages.upsert", ({ messages }: { messages: WAMessage[] }) => {
    for (let index = 0; index < messages.length; index++) {
      const message = messages[index];

      const isGroup = message.key.remoteJid?.endsWith("@g.us");
      const isStatus = message.key.remoteJid === "status@broadcast";

      if (isGroup || isStatus) {
        logger.info(`Mensaje recibido de grupo: ${message.key.remoteJid}`);
      }

      // @ts-ignore
      const formattedMessage: FormattedMessage | undefined =
        getMessage(message);
      if (formattedMessage !== undefined) {
        MessageHandler(sock, formattedMessage);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  logger.info("Inicializando cliente de Discord...");
  await initializeDiscord();
  logger.info("Cliente de Discord inicializado correctamente.");

  waSocketInstance = sock;
  return sock;
};

initWASocket();