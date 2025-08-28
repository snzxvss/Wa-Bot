import { WASocket } from 'baileys';

export const sendMessage = async (
  sock: WASocket,
  to: string,
  message: string
): Promise<void> => {
  try {
    await sock.sendMessage(to, { text: message });
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    throw error;
  }
};

export const sendImageMessage = async (
  sock: WASocket,
  to: string,
  imagePath: string,
  caption?: string
): Promise<void> => {
  try {
    await sock.sendMessage(to, {
      image: { url: imagePath },
      caption: caption || ''
    });
  } catch (error) {
    console.error('Error enviando imagen:', error);
    throw error;
  }
};

export const sendDocumentMessage = async (
  sock: WASocket,
  to: string,
  documentPath: string,
  filename: string,
  caption?: string
): Promise<void> => {
  try {
    await sock.sendMessage(to, {
      document: { url: documentPath },
      mimetype: 'application/pdf',
      fileName: filename,
      caption: caption || ''
    });
  } catch (error) {
    console.error('Error enviando documento:', error);
    throw error;
  }
};
