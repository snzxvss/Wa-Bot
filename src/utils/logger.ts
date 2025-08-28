// Logger simple y efectivo para Windows
class SimpleLogger {
  private cleanMessage(message: string): string {
    if (process.platform === 'win32') {
      // Reemplazar emojis con texto legible
      return message
        .replace(/🚀/g, '[INICIO]')
        .replace(/✅/g, '[OK]')
        .replace(/❌/g, '[ERROR]')
        .replace(/🔧/g, '[CONFIG]')
        .replace(/💥/g, '[FATAL]')
        .replace(/⚠️/g, '[WARN]')
        .replace(/🔄/g, '[RECONECT]')
        .replace(/📱/g, '[WHATSAPP]')
        .replace(/🎉/g, '[SUCCESS]')
        .replace(/🌐/g, '[SERVER]')
        .replace(/📨/g, '[MSG]')
        .replace(/📩/g, '[MSG_PROC]')
        .replace(/🔑/g, '[KEY]')
        .replace(/💬/g, '[CHAT]')
        .replace(/🤖/g, '[BOT]')
        .replace(/📝/g, '[AUTO]')
        .replace(/ℹ️/g, '[INFO]')
        .replace(/📚/g, '[HISTORY]')
        .replace(/🔗/g, '[QR]')
        .replace(/📋/g, '[INSTRUCT]')
        .replace(/💚/g, '[HEALTH]')
        .replace(/🏗️/g, '[ARCH]')
        .replace(/📡/g, '[MODEL]')
        .replace(/💰/g, '[FREE]')
        .replace(/💡/g, '[TIP]');
    }
    return message;
  }

  private getTimestamp(): string {
    const now = new Date();
    return now.toLocaleTimeString('es-ES', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + '.' + now.getMilliseconds().toString().padStart(3, '0');
  }

  info(message: string, ...args: any[]) {
    const cleanedMessage = this.cleanMessage(message);
    console.log(`\x1b[36mINFO [${this.getTimestamp()}]\x1b[0m ${cleanedMessage}`, ...args);
  }

  error(message: string, ...args: any[]) {
    const cleanedMessage = this.cleanMessage(message);
    console.error(`\x1b[31mERROR [${this.getTimestamp()}]\x1b[0m ${cleanedMessage}`, ...args);
  }

  warn(message: string, ...args: any[]) {
    const cleanedMessage = this.cleanMessage(message);
    console.warn(`\x1b[33mWARN [${this.getTimestamp()}]\x1b[0m ${cleanedMessage}`, ...args);
  }

  debug(message: string, ...args: any[]) {
    const cleanedMessage = this.cleanMessage(message);
    console.log(`\x1b[37mDEBUG [${this.getTimestamp()}]\x1b[0m ${cleanedMessage}`, ...args);
  }

  trace(message: string, ...args: any[]) {
    const cleanedMessage = this.cleanMessage(message);
    console.log(`\x1b[90mTRACE [${this.getTimestamp()}]\x1b[0m ${cleanedMessage}`, ...args);
  }

  fatal(message: string, ...args: any[]) {
    const cleanedMessage = this.cleanMessage(message);
    console.error(`\x1b[41m\x1b[37mFATAL [${this.getTimestamp()}]\x1b[0m ${cleanedMessage}`, ...args);
  }
}

export const logger = new SimpleLogger();
