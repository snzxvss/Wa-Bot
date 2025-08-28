import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ProductoService } from '../../application/services/productoService';
import multer from 'multer';
import path from 'path';

// Configurar multer para subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './src/infrastructure/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'producto-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

export class ProductoController {
  constructor(private productoService: ProductoService) {}

  // Validaciones
  static getValidationRules() {
    return {
      create: [
        body('nombre').notEmpty().withMessage('El nombre es requerido'),
        body('precio').isFloat({ min: 0 }).withMessage('El precio debe ser un número válido'),
        body('descripcion').optional().isString().withMessage('La descripción debe ser texto')
      ],
      update: [
        body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
        body('precio').optional().isFloat({ min: 0 }).withMessage('El precio debe ser un número válido'),
        body('descripcion').optional().isString().withMessage('La descripción debe ser texto')
      ]
    };
  }

  // Middleware para subir imagen
  static getUploadMiddleware() {
    return upload.single('imagen');
  }

  findAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const productos = await this.productoService.findAll();
      res.json({
        success: true,
        data: productos
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
      const producto = await this.productoService.findById(id);

      if (!producto) {
        res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: producto
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  };

  search = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Parámetro de búsqueda requerido'
        });
        return;
      }

      const productos = await this.productoService.searchProducts(q);
      res.json({
        success: true,
        data: productos,
        total: productos.length
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

      // Agregar URL de imagen si se subió
      if (req.file) {
        req.body.imagenUrl = `/uploads/${req.file.filename}`;
      }

      const producto = await this.productoService.create(req.body);
      res.status(201).json({
        success: true,
        data: producto,
        message: 'Producto creado exitosamente'
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

      // Agregar URL de imagen si se subió
      if (req.file) {
        req.body.imagenUrl = `/uploads/${req.file.filename}`;
      }

      const producto = await this.productoService.update(id, req.body);

      if (!producto) {
        res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: producto,
        message: 'Producto actualizado exitosamente'
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
      const deleted = await this.productoService.delete(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Producto eliminado exitosamente'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  };
}
