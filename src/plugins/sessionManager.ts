import { logger } from "../utils/logger";
import { loadSessions, saveSessions, sessions } from '../plugins/utils';
import { WASocket } from 'baileys';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Tiempo de inactividad máximo en milisegundos antes de cerrar una sesion
 * Se puede configurar en .env con SESSION_INACTIVITY_TIMEOUT (en minutos)
 */
const INACTIVITY_TIMEOUT = (parseInt(process.env.SESSION_INACTIVITY_TIMEOUT || '30') * 60 * 1000);

/**
 * Revisa las sesiones y cierra aquellas que han superado el tiempo de inactividad
 * @param bot Cliente de WhatsApp para enviar mensajes de despedida
 */
export const checkExpiredSessions = async (bot: WASocket): Promise<void> => {
  logger.info('Verificando sesiones expiradas...');
  
  // Cargar sesiones actuales
  loadSessions();
  
  const now = Date.now();
  const expiredSessions: string[] = [];
  
  // Comprobar cada sesion
  for (const [jid, userData] of Object.entries(sessions)) {
    if (userData && userData.lastTime) {
      const elapsed = now - userData.lastTime;
      
      // Si paso el tiempo máximo de inactividad
      if (elapsed > INACTIVITY_TIMEOUT) {
        expiredSessions.push(jid);
        
        // Enviar mensaje de despedida
        try {
          await bot.sendMessage(jid, { 
            text: "🔔 *Sesion finalizada por inactividad*\n\nHa pasado un tiempo desde tu última interaccion. Tu sesion ha sido cerrada.\n\nSi necesitas ayuda nuevamente, escribe cualquier mensaje para comenzar una nueva conversacion." 
          });
          logger.info(`Mensaje de cierre de sesion enviado a ${jid}`);
        } catch (error) {
          logger.error(`Error al enviar mensaje de cierre de sesion a ${jid}:`, error);
        }
      }
    }
  }
  
  // Eliminar sesiones expiradas
  expiredSessions.forEach(jid => {
    delete sessions[jid];
    logger.info(`Sesion eliminada por inactividad: ${jid}`);
  });
  
  // Guardar cambios si hubo sesiones eliminadas
  if (expiredSessions.length > 0) {
    saveSessions();
    logger.info(`${expiredSessions.length} sesiones eliminadas por inactividad`);
  } else {
    logger.info('No se encontraron sesiones expiradas');
  }
};

/**
 * Inicia el verificador de sesiones con un intervalo específico
 * @param bot Cliente de WhatsApp
 * @returns ID del intervalo para poder cancelarlo si es necesario
 */
export const initSessionManager = (bot: WASocket): NodeJS.Timeout => {
  // Leer intervalo de verificacion desde .env (en minutos, por defecto 5)
  const checkIntervalMinutes = parseInt(process.env.SESSION_CHECK_INTERVAL || '5');
  const checkIntervalMs = checkIntervalMinutes * 60 * 1000;
  
  // Mostrar configuracion actual
  logger.info(`Configuracion del gestor de sesiones:`);
  logger.info(`- Tiempo de inactividad: ${INACTIVITY_TIMEOUT / 60 / 1000} minutos`);
  logger.info(`- Intervalo de verificacion: ${checkIntervalMinutes} minutos`);
  
  // Ejecutar una verificacion inmediata al iniciar
  setTimeout(() => checkExpiredSessions(bot), 10000); // Esperar 10 segundos al inicio para que el bot esté listo
  
  // Configurar verificaciones periodicas
  const intervalId = setInterval(() => checkExpiredSessions(bot), checkIntervalMs);
  
  logger.info(`Gestor de sesiones iniciado correctamente`);
  
  return intervalId;
};