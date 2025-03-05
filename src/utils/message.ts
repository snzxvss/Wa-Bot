import { proto, WAMessage } from "baileys";
import { logger } from "./logger";

export type FormattedMessage = {
  key: proto.IMessageKey;
  messageTimestamp: Number | Long | null;
  pushName: string | null;
  content: string | null;
  rawMessage?: WAMessage;
};

/**
 * @param message
 * @returns
 */
export const getMessage = (message: WAMessage) => {
  try {
      return {
    key: message.key,
    messageTimestamp: message.messageTimestamp,
    pushName: message.pushName,
    content: message.message?.conversation || message.message?.extendedTextMessage?.text,
    rawMessage: message,
  };
  } catch (error) {
    logger.error(error);
  }
};
