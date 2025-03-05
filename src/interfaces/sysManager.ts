import { Request } from 'express';

/**
 * Interfaz para respuestas con valores de variables de entorno
 */
export interface EnvValueResponse {
  [key: string]: string;
}

/**
 * Interfaz para respuestas exitosas de la API
 */
export interface ApiSuccessResponse {
  success: boolean;
  message: string;
}

/**
 * Interfaz para respuestas de error de la API
 */
export interface ApiErrorResponse {
  error: string;
}

/**
 * Interfaz para solicitudes de actualización de valores
 */
export interface UpdateValueRequest {
  value: string;
}

/**
 * Interfaz para parámetros con clave en la URL
 */
export interface KeyParam {
  key: string;
}