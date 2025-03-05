import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Funcion para limpiar una carpeta especifica
 * @param folderPath Ruta de la carpeta a limpiar
 * @param folderName Nombre de la carpeta para los logs
 */
export const cleanFolder = (folderPath: string, folderName: string) => {
  // Verificar que la carpeta existe
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    logger.info(`Carpeta ${folderName} creada`);
    return;
  }

  try {
    // Leer todos los archivos en la carpeta
    const files = fs.readdirSync(folderPath);
    
    // Contar archivos en la carpeta
    const fileCount = files.length;
    
    // Si no hay archivos, informar y salir
    if (fileCount === 0) {
      logger.info(`La carpeta ${folderName} esta vacia, no se requiere limpieza`);
      return;
    }
    
    // Eliminar cada archivo
    let deletedCount = 0;
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      
      // Verificar que es un archivo (no una carpeta)
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      logger.info(`Limpieza completada: ${deletedCount} archivos eliminados de la carpeta ${folderName}`);
    }
  } catch (error) {
    logger.error(`Error al limpiar la carpeta ${folderName}:`, error);
  }
};

/**
 * Alias para mantener compatibilidad con codigo existente
 */
export const cleanTempFolder = () => {
  cleanFolder(path.join(process.cwd(), './tmp'), 'tmp');
};

/**
 * Funcion para limpiar la carpeta de imagenes
 */
export const cleanImagesFolder = () => {
  cleanFolder(path.join(process.cwd(), './public/images'), 'public/images');
};

/**
 * Funcion para verificar el estado de una carpeta
 * @param folderPath Ruta de la carpeta a verificar
 * @param folderName Nombre de la carpeta para los logs
 */
const checkFolderStatus = (folderPath: string, folderName: string) => {
  if (!fs.existsSync(folderPath)) {
    logger.info(`Verificacion de ${folderName}: La carpeta aún no existe`);
    return;
  }
  
  try {
    const files = fs.readdirSync(folderPath);
    logger.info(`Verificacion programada: La carpeta ${folderName} contiene ${files.length} archivos. Se limpiara en la proxima ejecucion.`);
  } catch (error) {
    logger.error(`Error al verificar la carpeta ${folderName}:`, error);
  }
};

/**
 * Alias para mantener compatibilidad con codigo existente
 */
const checkTempStatus = () => {
  checkFolderStatus(path.join(process.cwd(), './tmp'), 'tmp');
};

/**
 * Funcion para verificar el estado de la carpeta de imagenes
 */
const checkImagesStatus = () => {
  checkFolderStatus(path.join(process.cwd(), './public/images'), 'public/images');
};

/**
 * Inicializa el sistema de limpieza de archivos temporales
 * @returns Objeto con los IDs de los intervalos configurados
 */
export const initTempCleaner = () => {
  // Obtener configuracion desde variables de entorno
  const statusIntervalSeconds = parseInt(process.env.TEMP_STATUS_INTERVAL || '10');  
  const cleanIntervalSeconds = parseInt(process.env.TEMP_CLEAN_INTERVAL || '60');
  
  // Convertir a milisegundos
  const statusIntervalMs = statusIntervalSeconds * 1000;
  const cleanIntervalMs = cleanIntervalSeconds * 1000;
  
  // Ejecutar inmediatamente una primera limpieza
  cleanTempFolder();
  cleanImagesFolder();
  
  // Configurar verificacion según el intervalo especificado
  const statusIntervalId = setInterval(() => {
    checkTempStatus();
    checkImagesStatus();
  }, statusIntervalMs);
  
  // Configurar limpieza periodica según el intervalo especificado
  const cleanIntervalId = setInterval(() => {
    cleanTempFolder();
    cleanImagesFolder();
  }, cleanIntervalMs);
  
  // Mostrar la configuracion actual
  logger.info('Sistema de gestion de archivos temporales iniciado:');
  logger.info(`- Verificacion cada ${statusIntervalSeconds} segundos`);
  logger.info(`- Limpieza cada ${cleanIntervalSeconds} segundos`);
  logger.info('- Carpetas monitorizadas: tmp, public/images');
  
  // Devolver los IDs de los intervalos por si necesitamos detenerlos
  return { statusIntervalId, cleanIntervalId };
};