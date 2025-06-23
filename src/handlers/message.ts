import { WASocket } from "baileys";
import { FormattedMessage } from "../utils/message";
import { sendMessageToDiscord } from "./discordHandler";

const MessageHandler = async (bot: WASocket, message: FormattedMessage) => {
  // Evitar responder a mensajes del propio bot
  if (message.key.fromMe) {
    return;
  }

  const sender = message.key.remoteJid!;

  // Reenviar mensajes de WhatsApp a Discord
  const discordChannelId = process.env.DISCORD_CHANNEL_ID || "960687736363298867";
  if (!discordChannelId) {
    console.error("No se ha configurado el ID del canal de Discord.");
    return;
  }

  const senderName = message.pushName || "Desconocido";
  const messageContent = message.content || "(Sin contenido)";

  // Extraer el número del participante
  const participant = message.rawMessage?.key?.participant || "";
  const senderNumber = participant.split("@")[0];

  console.log(`Mensaje recibido de WhatsApp: ${sender}`);
  console.log(`Contenido del mensaje: ${messageContent}`);
  console.log(`Timestamp del mensaje: ${message.messageTimestamp}`);
  console.log(`Remitente: ${senderName}`);
  console.log(`Número del remitente: ${senderNumber}`);

  const discordMessage = `(+${senderNumber})[${senderName}]: ${messageContent}`;

  console.log(`Reenviando mensaje de WhatsApp al canal de Discord con ID: ${discordChannelId}`);
  console.log(`Contenido del mensaje: ${discordMessage}`);
  await sendMessageToDiscord(discordChannelId, discordMessage);
  console.log("Mensaje enviado al canal de Discord.");
};

export default MessageHandler;