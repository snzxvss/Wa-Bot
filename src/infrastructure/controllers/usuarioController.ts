import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { UsuarioService } from '../../application/services/usuarioService';
import { AuthRequest } from '../middlewares/authMiddleware';

export class UsuarioController {
  constructor(private usuarioService: UsuarioService) {}

  // Validaciones
  static getValidationRules() {
    return {
      create: [
        body('nombre').notEmpty().withMessage('El nombre es requerido'),
        body('email').isEmail().withMessage('Email inválido'),
        body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
        body('permisoId').isInt({ min: 1 }).withMessage('ID de permiso inválido')
      ],
      update: [
        body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
        body('email').optional().isEmail().withMessage('Email inválido'),
        body('password').optional().isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
        body('permisoId').optional().isInt({ min: 1 }).withMessage('ID de permiso inválido')
      ],
      login: [
        body('email').isEmail().withMessage('Email inválido'),
        body('password').notEmpty().withMessage('La contraseña es requerida')
      ]
    };
  }

  findAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const usuarios = await this.usuarioService.findAll();
      res.json({
        success: true,
        data: usuarios
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const usuario = await this.usuarioService.findById(id);

      if (!usuario) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: usuario
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Errores de validación',
          errors: errors.array()
        });
        return;
      }

      const usuario = await this.usuarioService.create(req.body);
      res.status(201).json({
        success: true,
        data: usuario,
        message: 'Usuario creado exitosamente'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Errores de validación',
          errors: errors.array()
        });
        return;
      }

      const id = parseInt(req.params.id);
      const usuario = await this.usuarioService.update(id, req.body);

      if (!usuario) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: usuario,
        message: 'Usuario actualizado exitosamente'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await this.usuarioService.delete(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Errores de validación',
          errors: errors.array()
        });
        return;
      }

      const { email, password } = req.body;
      const result = await this.usuarioService.login(email, password);

      if (!result) {
        res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
        return;
      }

      res.json({
        success: true,
        data: result,
        message: 'Login exitoso'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  };

  getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const usuario = await this.usuarioService.findById(req.user.id);

      if (!usuario) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      const { password, ...usuarioSinPassword } = usuario;

      res.json({
        success: true,
        data: usuarioSinPassword
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  };
}
