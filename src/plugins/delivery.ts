import axios from 'axios';
import fs from 'fs';
import path from 'path';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { logger } from '../utils/logger';
import { log } from 'console';

// Interfaces
interface DireccionRequest {
  direccion: string;
  barrio: string;
  ciudad: string;
}

interface GeocodeResult {
  geometry: {
    location: {
      lat: number;
      lng: number;
    }
  }
}

interface GeocodeResponse {
  results: GeocodeResult[];
  status: string;
}

interface DomicilioResult {
  distancia: number;
  costo: number;
  imagen: string;
}

// Clave de la API de Google (considera moverla a variables de entorno)
const API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// Direccion fija de origen
const fixedAddress = process.env.ADDRESS_INIT || "Carrera 10D #115-53, El pueblo, Barranquilla";

// Puerto para el servidor
const PORT = process.env.API_LOCATION_PORT || 9500;

/**
 * Funcion para obtener geocoding de una direccion
 * @param address Direccion a geocodificar
 * @returns Datos de geocodificacion
 */
async function fetchGeocodeInfo(address: string): Promise<GeocodeResponse> {
  const sanitizedAddress = address.replace('#', '');
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(sanitizedAddress)}&key=${API_KEY}`;
  
  try {
    const response = await axios.get<GeocodeResponse>(url);
    if(response.data.status !== "OK" || !response.data.results.length){
      throw new Error(`No se encontro geocode para: ${address}`);
    }
    return response.data;
  } catch (error) {
    logger.error(`Error en geocodificacion: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Obtiene imagen estatica con marcador en la coordenada
 * @param lat Latitud
 * @param lng Longitud
 * @returns Buffer de la imagen
 */
async function fetchStaticMapImageByCoords(lat: number, lng: number): Promise<Buffer> {
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=${API_KEY}`;
  
  try {
    const response = await axios.get(staticMapUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } catch (error) {
    logger.error(`Error obteniendo mapa estatico: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Calcula distancia entre dos coordenadas (formula Haversine)
 * @param lat1 Latitud punto 1
 * @param lng1 Longitud punto 1
 * @param lat2 Latitud punto 2
 * @param lng2 Longitud punto 2
 * @returns Distancia en kilometros
 */
function calcularDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (valor: number): number => valor * Math.PI / 180;
  const R = 6371; // Radio de la tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calcula el costo total del domicilio
 * @param tarifaBase Tarifa base en pesos
 * @param costoPorKm Costo por kilometro
 * @param distanciaTotal Distancia total en kilometros
 * @param factorDescuento Factor de descuento (0-1)
 * @returns Costo total calculado
 */
function calcularCostoDomicilio(
  tarifaBase: number, 
  costoPorKm: number, 
  distanciaTotal: number, 
  factorDescuento: number
): number {
  return tarifaBase + (costoPorKm * distanciaTotal * (1 - factorDescuento));
}

/**
 * Funcion que realiza el proceso y retorna un objeto con los resultados
 * @param params Parametros de direccion
 * @returns Resultado del calculo de domicilio
 */
async function calculateDomicilio({ direccion, barrio, ciudad }: DireccionRequest): Promise<DomicilioResult> {
  // Se compone la direccion completa
  const secondAddress = `${direccion}, ${barrio}, ${ciudad}`;
  logger.info(`Calculando domicilio para direccion: ${secondAddress}`);

  try {
    // Geocoding para direccion fija
    const dataFixed = await fetchGeocodeInfo(fixedAddress);
    const resultFixed = dataFixed.results[0];
    const fixedLat = resultFixed.geometry.location.lat;
    const fixedLng = resultFixed.geometry.location.lng;
    logger.debug(`Direccion fija - lat: ${fixedLat}, lng: ${fixedLng}`);

    // Geocoding para la segunda direccion
    const dataSecond = await fetchGeocodeInfo(secondAddress);
    const resultSecond = dataSecond.results[0];
    const secondLat = resultSecond.geometry.location.lat;
    const secondLng = resultSecond.geometry.location.lng;
    logger.debug(`Segunda direccion - lat: ${secondLat}, lng: ${secondLng}`);

    // Calcular la distancia
    const distanciaKm = calcularDistancia(fixedLat, fixedLng, secondLat, secondLng);
    logger.info(`Distancia calculada: ${distanciaKm.toFixed(2)} km`);

    // Calcular el costo (usando tarifaBase=3000, costoPorKm=2000 y descuento 10%)
    const tarifaBase = 3000;
    const costoPorKm = 2000;
    const factorDescuento = 0.1;
    const costoTotal = calcularCostoDomicilio(tarifaBase, costoPorKm, distanciaKm, factorDescuento);
    logger.info(`Costo calculado: ${costoTotal.toFixed(2)} COP`);

    // Guardar la imagen en public/images
    const imagesFolder = path.join(process.cwd(), 'public', 'images');
    if (!fs.existsSync(imagesFolder)) {
      fs.mkdirSync(imagesFolder, { recursive: true });
    }
    const imageData = await fetchStaticMapImageByCoords(secondLat, secondLng);
    const imageFileName = `map_${Date.now()}.png`;
    const imagePath = path.join(imagesFolder, imageFileName);
    fs.writeFileSync(imagePath, imageData);
    logger.debug(`Imagen guardada en: ${imagePath}`);

    // Retornar el resultado
    return {
      distancia: parseFloat(distanciaKm.toFixed(2)), // km
      costo: parseFloat(costoTotal.toFixed(2)),      // COP
      imagen: `/images/${imageFileName}`             // ruta pública relativa
    };
  } catch (error) {
    logger.error(`Error en calculo de domicilio: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Inicializa el servidor de API para calculo de domicilios
 */
export const initDomicilioAPI = (): void => {
    const app = express();

    // Middlewares
    app.use(express.json());
    app.use(cors());
    app.use(express.static(path.join(process.cwd(), 'public')));

    // Crear carpetas necesarias
    const publicFolder = path.join(process.cwd(), 'public');
    const imagesFolder = path.join(publicFolder, 'images');

    if (!fs.existsSync(publicFolder)) {
    fs.mkdirSync(publicFolder, { recursive: true });
    }
    if (!fs.existsSync(imagesFolder)) {
    fs.mkdirSync(imagesFolder, { recursive: true });
    }
  
    // Ruta para calcular domicilio
    app.post('/calculate', async (req: Request, res: Response): Promise<void> => {
    try {
        const { direccion, barrio, ciudad } = req.body as DireccionRequest;
        
        if(!direccion || !barrio || !ciudad) {
        res.status(400).json({ error: 'Se requiere direccion, barrio y ciudad.' });
        return;
        }
        
        const result = await calculateDomicilio({ direccion, barrio, ciudad });
        res.json(result);
    } catch (error) {
        logger.error(`Error en endpoint /calculate: ${(error as Error).message}`);
        res.status(500).json({ error: (error as Error).message });
    }
    });

    // Iniciar servidor
    app.listen(PORT, () => {
    logger.info(`------------------------------------------------------------`);
    logger.info(`API de calculo de domicilios iniciada en el puerto: ${PORT}`);
    logger.info(`------------------------------------------------------------`);
    });
};