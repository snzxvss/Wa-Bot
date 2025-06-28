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
import express from "express";
import cors from "cors";
import reminderRouter from "./api/reminder";

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
        // MessageHandler(sock, formattedMessage);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);


  waSocketInstance = sock;
  return sock;
};

initWASocket();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api", reminderRouter);

app.listen(PORT, () => {
  logger.info(`Servidor API escuchando en el puerto ${PORT}`);
});