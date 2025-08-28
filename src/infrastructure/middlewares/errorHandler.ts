import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error(`Error en ${req.method} ${req.path}:`, error);

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Error interno del servidor';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.method} ${req.path} no encontrada`
  });
};

export const validationErrorHandler = (errors: any[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        }))
      });
      return;
    }
    next();
  };
};
