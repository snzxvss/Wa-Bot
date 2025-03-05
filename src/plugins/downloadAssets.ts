import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

// Cargar las variables de entorno
dotenv.config();

/**
 * Verifica que las variables de entorno necesarias estén definidas
 * @returns {boolean} - True si todas las variables necesarias existen
 */
const validateEnvVars = () => {
  const missingVars = [];
  if (!process.env.CATALOG_PDF_URL) missingVars.push('CATALOG_PDF_URL');
  if (!process.env.QR_IMAGE_URL) missingVars.push('QR_IMAGE_URL');
  
  if (missingVars.length > 0) {
    logger.warn(`Faltan variables de entorno requeridas: ${missingVars.join(', ')}`);
    return false;
  }
  return true;
};

/**
 * Descarga el catalogo PDF y la imagen QR desde las URLs especificadas en .env
 */
export const downloadAssets = async (): Promise<void> => {
  logger.info('Iniciando descarga de assets...');
  
  // Validar las variables de entorno
  if (!validateEnvVars()) {
    logger.error('No se pudieron descargar los assets debido a variables de entorno faltantes');
    return;
  }
  
  // Crear la carpeta de assets si no existe
  const assetsDir = path.join(process.cwd(), './src/assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
    logger.info('Carpeta assets creada');
  }
  
  // Definir las rutas de los archivos
  const catalogPath = path.join(assetsDir, 'catalogo.pdf');
  const qrPath = path.join(assetsDir, 'qr.jpg');
  
  // URLs desde las variables de entorno
  const catalogPdfUrl = process.env.CATALOG_PDF_URL;
  const qrImageUrl = process.env.QR_IMAGE_URL;
  
  // Descargar el catalogo PDF
  try {
    logger.info(`Descargando catalogo desde ${catalogPdfUrl}`);
    const pdfResponse = await axios({
      url: catalogPdfUrl,
      method: 'GET',
      responseType: 'arraybuffer',
    });
    
    fs.writeFileSync(catalogPath, Buffer.from(pdfResponse.data));
    logger.info(`Catalogo PDF guardado correctamente en ${catalogPath}`);
  } catch (error) {
    logger.error('Error al descargar el catalogo PDF:', error);
  }
  
  // Descargar la imagen QR
  try {
    logger.info(`Descargando imagen QR desde ${qrImageUrl}`);
    const qrResponse = await axios({
      url: qrImageUrl,
      method: 'GET',
      responseType: 'arraybuffer',
    });
    
    fs.writeFileSync(qrPath, Buffer.from(qrResponse.data));
    logger.info(`Imagen QR guardada correctamente en ${qrPath}`);
  } catch (error) {
    logger.error('Error al descargar la imagen QR:', error);
  }
  
  logger.info('Descarga de assets completada');
};

/**
 * Inicializa el descargador de assets (solo una vez al iniciar)
 */
export const initAssetsDownloader = () => {
  // Ejecutar la descarga inmediatamente al iniciar el bot
  downloadAssets()
    .then(() => {
      logger.info('Assets descargados exitosamente al iniciar');
    })
    .catch((error) => {
      logger.error('Error al descargar los assets iniciales:', error);
    });
};