import { AppDataSource } from '../config/db';
import { ProductoEntity } from '../infrastructure/database/entities/Producto';
import { logger } from '../utils/logger';

export const seedProductos = async (): Promise<void> => {
  try {
    const productoRepository = AppDataSource.getRepository(ProductoEntity);
    
    // Verificar si ya existen productos
    const existingProducts = await productoRepository.count();
    
    if (existingProducts > 0) {
      logger.info(`🔄 Ya existen ${existingProducts} productos en la base de datos`);
      return;
    }

    logger.info('🌱 Sembrando productos de prueba en la base de datos...');

    const productosIniciales = [
      {
        nombre: 'Camiseta Básica',
        descripcion: 'Camiseta de algodón 100% disponible en varios colores',
        precio: 25000,
        imagenUrl: undefined,
        activo: true
      },
      {
        nombre: 'Pantalón Jean',
        descripcion: 'Pantalón jean clásico, cómodo y duradero',
        precio: 45000,
        imagenUrl: undefined,
        activo: true
      },
      {
        nombre: 'Zapatos Deportivos',
        descripcion: 'Zapatos deportivos para uso diario, muy cómodos',
        precio: 80000,
        imagenUrl: undefined,
        activo: true
      },
      {
        nombre: 'Chaqueta de Cuero',
        descripcion: 'Chaqueta de cuero genuino, perfecta para el invierno',
        precio: 120000,
        imagenUrl: undefined,
        activo: true
      },
      {
        nombre: 'Reloj Digital',
        descripcion: 'Reloj digital resistente al agua con múltiples funciones',
        precio: 65000,
        imagenUrl: undefined,
        activo: true
      },
      {
        nombre: 'Gorra Deportiva',
        descripcion: 'Gorra ajustable para deportes y uso casual',
        precio: 18000,
        imagenUrl: undefined,
        activo: true
      },
      {
        nombre: 'Mochila Escolar',
        descripcion: 'Mochila resistente con múltiples compartimientos',
        precio: 55000,
        imagenUrl: undefined,
        activo: true
      },
      {
        nombre: 'Audífonos Bluetooth',
        descripcion: 'Audífonos inalámbricos con excelente calidad de sonido',
        precio: 95000,
        imagenUrl: undefined,
        activo: true
      }
    ];

    // Crear productos
    const productos = productoRepository.create(productosIniciales);
    await productoRepository.save(productos);

    logger.info(`✅ Se han creado ${productos.length} productos exitosamente`);
    
  } catch (error) {
    logger.error('❌ Error al sembrar productos:', error);
    throw error;
  }
};
