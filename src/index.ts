// Eliminar la importación y uso de MessageHandler y getMessage
import makeWASocket, {
  Browsers,
  useMultiFileAuthState,
  DisconnectReason,
  WAMessage,
} from "baileys";
import qrcode from "qrcode-terminal";
import { Boom } from "@hapi/boom";
import { logger } from "./utils/logger";
import { sendSelfMessage } from "./handlers/sendSelfMessage";

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
        sendSelfMessage(sock);
        break;
    }

    if (qr !== undefined) {
      qrcode.generate(qr, { small: true });
    }
  });

  sock.ev.on("creds.update", saveCreds);
};

// initWASocket(); // Comentado para evitar conflicto con main.ts