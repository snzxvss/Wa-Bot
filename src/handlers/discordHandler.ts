import { Client, GatewayIntentBits, TextChannel, Message } from 'discord.js';
import { DiscordMessage } from '../interfaces/userManager';
import { initWASocket } from '../index';
import { WASocket } from "baileys";

const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let messageQueue: DiscordMessage[] = [];
let isProcessingQueue = false;
let reconnectTimeout: NodeJS.Timeout | null = null;

const processMessageQueue = async () => {
  if (isProcessingQueue || messageQueue.length === 0) return;

  isProcessingQueue = true;
  const message = messageQueue.shift();

  if (message) {
    try {
      console.log("Reenviando mensaje de Discord a WhatsApp...");
      const sock = await initWASocket();
      await forwardToWhatsApp(message, sock);
      console.log("Mensaje reenviado exitosamente.");
    } catch (error) {
      console.error("Error al reenviar mensaje de Discord a WhatsApp:", error);
    }
  }

  isProcessingQueue = false;

  if (messageQueue.length > 0) {
    setTimeout(processMessageQueue, 1000); // Procesar el siguiente mensaje después de 1 segundo
  }
};

export const initializeDiscord = async () => {
  discordClient.on('ready', () => {
    console.log(`Discord client is ready. Logged in as ${discordClient.user?.tag}`);
  });

  discordClient.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;

    console.log(`Mensaje recibido en Discord: ${message.content}`);
    console.log(`Autor: ${message.author.username}`);
    console.log(`Canal ID: ${message.channel.id}`);

    const discordMessage: DiscordMessage = {
      id: message.id,
      author: message.author.username,
      channelId: message.channel.id,
      content: message.content,
      timestamp: message.createdTimestamp,
    };

    messageQueue.push(discordMessage);
    processMessageQueue();
  });

  try {
    await discordClient.login("MTM2NzIyNDU3Mjk4NjAwMzUxNg.GDMAvy.Fn9sGwSqVCepyF9zZL_vjxYnGUusrvQOzzMWCc");
    console.log("Discord client logged in successfully.");
  } catch (error) {
    console.error("Error al iniciar sesión en Discord:", error);
  }
};

export const sendMessageToDiscord = async (channelId: string, content: string) => {
  const channel = discordClient.channels.cache.get(channelId) as TextChannel;
  if (channel) {
    console.log(`Enviando mensaje al canal de Discord con ID: ${channelId}`);
    console.log(`Contenido del mensaje: ${content}`);
    await channel.send(content);
    console.log("Mensaje enviado exitosamente.");
  } else {
    console.error(`No se pudo encontrar el canal con ID: ${channelId}`);
  }
};

const forwardToWhatsApp = async (message: DiscordMessage, sock: WASocket) => {
  const whatsappGroupId = process.env.WHATSAPP_GROUP_ID || '120363416976698555@g.us';
  console.log(`ID del grupo de WhatsApp: ${whatsappGroupId}`);
  if (!whatsappGroupId) {
    console.error("No se ha configurado el ID del grupo de WhatsApp.");
    return;
  }

  try {
    const formattedMessage = `[${message.author}]: ${message.content}`;
    console.log(`Enviando mensaje al grupo de WhatsApp con ID: ${whatsappGroupId}`);
    console.log(`Contenido del mensaje: ${formattedMessage}`);
    await sock.sendMessage(whatsappGroupId, { text: formattedMessage });
    console.log("Mensaje enviado exitosamente a WhatsApp.");
  } catch (error) {
    console.error("Error al enviar mensaje a WhatsApp:", error);
  }
};
