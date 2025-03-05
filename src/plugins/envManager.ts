import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';
import cors from 'cors';
import { 
  EnvValueResponse, 
  ApiSuccessResponse, 
  ApiErrorResponse, 
  UpdateValueRequest,
  KeyParam
} from '../interfaces/envManager';

// Constantes
const ENV_FILE_PATH = path.join(process.cwd(), '.env');
const API_PORT = process.env.ENV_MANAGER_PORT || 3000;
const API_KEY = process.env.ENV_MANAGER_API_KEY || 'default_secure_key_change_this';

/**
 * Lee el contenido actual del archivo .env
 * @returns {string} Contenido del archivo .env o string vacío si no existe
 */
const readEnvFile = (): string => {
  try {
    if (fs.existsSync(ENV_FILE_PATH)) {
      return fs.readFileSync(ENV_FILE_PATH, 'utf8');
    }
    return '';
  } catch (error) {
    logger.error('Error leyendo archivo .env:', error);
    return '';
  }
};

/**
 * Escribe contenido en el archivo .env
 * @param {string} content Contenido a escribir
 * @returns {boolean} True si se escribio correctamente
 */
const writeEnvFile = (content: string): boolean => {
  try {
    fs.writeFileSync(ENV_FILE_PATH, content);
    // Recargar variables de entorno
    Object.keys(process.env).forEach((key) => {
      if (!key.startsWith('_') && key !== 'NODE_ENV') {
        delete process.env[key];
      }
    });
    dotenv.config();
    return true;
  } catch (error) {
    logger.error('Error escribiendo archivo .env:', error);
    return false;
  }
};

/**
 * Convierte el contenido del archivo .env a un objeto
 * @param {string} content Contenido del archivo .env
 * @returns {Record<string, string>} Objeto con las variables de entorno
 */
const envToObject = (content: string): Record<string, string> => {
  const result: Record<string, string> = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Ignorar líneas de comentarios y vacías
    if (line.trim().startsWith('#') || line.trim() === '') continue;
    
    // Extraer clave y valor
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Extraer comentarios al final de la línea
      const commentIndex = value.indexOf(' #');
      if (commentIndex !== -1) {
        value = value.substring(0, commentIndex).trim();
      }
      
      // Eliminar comillas si existen
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      result[key] = value;
    }
  }
  
  return result;
};

/**
 * Convierte un objeto a formato de archivo .env
 * @param {Record<string, string>} envObj Objeto con las variables de entorno
 * @returns {string} Contenido formateado para el archivo .env
 */
const objectToEnv = (envObj: Record<string, string>): string => {
  const currentContent = readEnvFile();
  const lines = currentContent.split('\n');
  const result: string[] = [];
  
  // Mantener comentarios y secciones
  for (const line of lines) {
    if (line.trim().startsWith('#') || line.trim() === '') {
      result.push(line);
    } else {
      const match = line.match(/^([^=]+)=/);
      if (match) {
        const key = match[1].trim();
        if (envObj[key] !== undefined) {
          // Preservar el comentario si existe
          const commentMatch = line.match(/ #(.+)$/);
          const comment = commentMatch ? ` #${commentMatch[1]}` : '';
          
          // Determinar si se necesitan comillas
          let value = envObj[key];
          if (value.includes(' ') && !value.startsWith('"') && !value.startsWith("'")) {
            value = `"${value}"`;
          }
          
          result.push(`${key}=${value}${comment}`);
          delete envObj[key]; // Eliminar la clave procesada
        }
      }
    }
  }
  
  // Añadir nuevas variables
  for (const [key, value] of Object.entries(envObj)) {
    let formattedValue = value;
    if (value.includes(' ') && !value.startsWith('"') && !value.startsWith("'")) {
      formattedValue = `"${value}"`;
    }
    result.push(`${key}=${formattedValue}`);
  }
  
  return result.join('\n');
};

/**
 * Middleware para verificar la clave API
 */
const verifyApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== API_KEY) {
    res.status(401).json({ error: 'Clave API no valida' } as ApiErrorResponse);
    return;
  }
  
  next();
};

/**
 * Inicia el servidor para gestionar el archivo .env
 */
export const initEnvManager = (): void => {
  const app = express();
  
  // Middlewares
  app.use(express.json());
  app.use(cors());
  
// Ruta para obtener todas las variables de entorno
app.get('/env', verifyApiKey, (req: Request, res: Response): void => {
    // Leer el archivo .env directamente
    const content = readEnvFile();
    const envObject = envToObject(content);
    
    // Listado de variables relevantes para el proyecto
    const projectVarPrefixes = [
      'CATALOG_', 'QR_', 'API_', 'SESSION_', 'TEMP_', 
      'SPREADSHEET_', 'PAYMENT_', 'NAME', 'ENV_MANAGER_'
    ];
    
    // Si el objeto está vacío o tiene muy pocas variables, usar process.env pero filtrando
    if (Object.keys(envObject).length <= 1) {
      logger.warn(`Pocas variables encontradas en .env, usando variables filtradas de process.env...`);
      
      // Variables filtradas del entorno
      const processEnvVars: Record<string, string> = {};
      Object.keys(process.env).forEach(key => {
        // Incluir solo variables que coincidan con nuestros prefijos de proyecto
        if (projectVarPrefixes.some(prefix => key.startsWith(prefix)) || 
            ['NAMEBUSINESS', 'PAYMENT_NUMBER', 'SPREADSHEET_URL'].includes(key)) {
          processEnvVars[key] = process.env[key] as string;
        }
      });
      
      logger.info(`Variables de proyecto obtenidas: ${Object.keys(processEnvVars).length}`);
      res.json(processEnvVars as EnvValueResponse);
    } else {
      // Usar las variables del archivo .env
      logger.info(`Variables obtenidas del archivo .env: ${Object.keys(envObject).length}`);
      res.json(envObject as EnvValueResponse);
    }
  });
  
  // Ruta para obtener una variable específica
  app.get('/env/:key', verifyApiKey, (req: Request<{ key: string }>, res: Response): void => {
    const content = readEnvFile();
    const envObject = envToObject(content);
    const { key } = req.params;
    
    if (envObject[key] !== undefined) {
      res.json({ [key]: envObject[key] } as EnvValueResponse);
    } else {
      res.status(404).json({ error: `Variable ${key} no encontrada` } as ApiErrorResponse);
    }
  });
  
  // Ruta para actualizar o crear variables
  app.post('/env', verifyApiKey, (req: Request, res: Response): void => {
    const content = readEnvFile();
    const envObject = envToObject(content);
    const updates = req.body;
    
    // Validar el cuerpo de la solicitud
    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ error: 'Formato invalido. Se espera un objeto con pares clave-valor' } as ApiErrorResponse);
      return;
    }
    
    // Actualizar variables
    Object.assign(envObject, updates);
    
    // Escribir cambios
    const newContent = objectToEnv(envObject);
    if (writeEnvFile(newContent)) {
      res.json({ success: true, message: 'Variables actualizadas correctamente' } as ApiSuccessResponse);
    } else {
      res.status(500).json({ error: 'Error al escribir en el archivo .env' } as ApiErrorResponse);
    }
  });
  
  // Ruta para actualizar una variable específica
  app.put('/env/:key', verifyApiKey, (req: Request<{ key: string }, any, UpdateValueRequest>, res: Response): void => {
    const content = readEnvFile();
    const envObject = envToObject(content);
    const { key } = req.params;
    const { value } = req.body;
    
    // Validar el cuerpo de la solicitud
    if (value === undefined) {
      res.status(400).json({ error: 'Se requiere un valor para la variable' } as ApiErrorResponse);
      return;
    }
    
    // Actualizar variable
    envObject[key] = value.toString();
    
    // Escribir cambios
    const newContent = objectToEnv(envObject);
    if (writeEnvFile(newContent)) {
      res.json({ success: true, message: `Variable ${key} actualizada correctamente` } as ApiSuccessResponse);
    } else {
      res.status(500).json({ error: 'Error al escribir en el archivo .env' } as ApiErrorResponse);
    }
  });
  
  // Ruta para eliminar una variable
  app.delete('/env/:key', verifyApiKey, (req: Request<{ key: string }>, res: Response): void => {
    const content = readEnvFile();
    const envObject = envToObject(content);
    const { key } = req.params;
    
    // Verificar que la variable existe
    if (envObject[key] === undefined) {
      res.status(404).json({ error: `Variable ${key} no encontrada` } as ApiErrorResponse);
      return;
    }
    
    // Eliminar variable
    delete envObject[key];
    
    // Escribir cambios
    const newContent = objectToEnv(envObject);
    if (writeEnvFile(newContent)) {
      res.json({ success: true, message: `Variable ${key} eliminada correctamente` } as ApiSuccessResponse);
    } else {
      res.status(500).json({ error: 'Error al escribir en el archivo .env' } as ApiErrorResponse);
    }
  });
  
  // Iniciar servidor
  app.listen(API_PORT, () => {
    logger.info(`------------------------------------------------------------`);
    logger.info(`API de gestion .env iniciada en puerto ${API_PORT}`);
    logger.info(`------------------------------------------------------------`);
  });
};