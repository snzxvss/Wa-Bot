import { WASocket } from "baileys";

export const sendSelfMessage = async (bot: WASocket) => {
  const botJid = bot?.user?.id;
  if (!botJid) {
    throw new Error("No se pudo determinar el número del bot.");
  }
  
  await bot.sendMessage(botJid, { 
    text: "Este es un mensaje enviado al mismo número del bot." 
  });
};