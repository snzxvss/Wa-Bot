import { Producto, ProductoCreation, ProductoUpdate } from '../../domain/producto';
import { ProductoRepository } from '../../application/interfaces/productoRepository';

// Implementación mock temporal - reemplazar con MySQL cuando esté listo
export class MockProductoRepository implements ProductoRepository {
  private productos: Producto[] = [
    {
      id: 1,
      nombre: 'Camiseta Básica',
      descripcion: 'Camiseta de algodón 100% disponible en varios colores',
      precio: 25000,
      imagenUrl: undefined,
      fechaCreacion: new Date(),
      activo: true
    },
    {
      id: 2,
      nombre: 'Pantalón Jean',
      descripcion: 'Pantalón jean clásico, cómodo y duradero',
      precio: 45000,
      imagenUrl: undefined,
      fechaCreacion: new Date(),
      activo: true
    },
    {
      id: 3,
      nombre: 'Zapatos Deportivos',
      descripcion: 'Zapatos deportivos para uso diario, muy cómodos',
      precio: 80000,
      imagenUrl: undefined,
      fechaCreacion: new Date(),
      activo: true
    },
    {
      id: 4,
      nombre: 'Chaqueta de Cuero',
      descripcion: 'Chaqueta de cuero genuino, perfecta para el invierno',
      precio: 120000,
      imagenUrl: undefined,
      fechaCreacion: new Date(),
      activo: true
    },
    {
      id: 5,
      nombre: 'Reloj Digital',
      descripcion: 'Reloj digital resistente al agua con múltiples funciones',
      precio: 65000,
      imagenUrl: undefined,
      fechaCreacion: new Date(),
      activo: true
    },
    {
      id: 6,
      nombre: 'Gorra Deportiva',
      descripcion: 'Gorra ajustable para deportes y uso casual',
      precio: 18000,
      imagenUrl: undefined,
      fechaCreacion: new Date(),
      activo: true
    },
    {
      id: 7,
      nombre: 'Mochila Escolar',
      descripcion: 'Mochila resistente con múltiples compartimientos',
      precio: 55000,
      imagenUrl: undefined,
      fechaCreacion: new Date(),
      activo: true
    },
    {
      id: 8,
      nombre: 'Audífonos Bluetooth',
      descripcion: 'Audífonos inalámbricos con excelente calidad de sonido',
      precio: 95000,
      imagenUrl: undefined,
      fechaCreacion: new Date(),
      activo: true
    }
  ];
  private nextId = 9;

  async findAll(): Promise<Producto[]> {
    return this.productos.filter(p => p.activo);
  }

  async findById(id: number): Promise<Producto | null> {
    return this.productos.find(p => p.id === id && p.activo) || null;
  }

  async findByNombre(nombre: string): Promise<Producto[]> {
    const searchTerm = nombre.toLowerCase();
    return this.productos.filter(p => 
      p.activo && 
      (p.nombre.toLowerCase().includes(searchTerm) || 
       p.descripcion?.toLowerCase().includes(searchTerm))
    );
  }

  async create(producto: ProductoCreation): Promise<Producto> {
    const newProducto: Producto = {
      id: this.nextId++,
      ...producto,
      fechaCreacion: new Date(),
      activo: true
    };
    
    this.productos.push(newProducto);
    return newProducto;
  }

  async update(id: number, producto: ProductoUpdate): Promise<Producto | null> {
    const index = this.productos.findIndex(p => p.id === id);
    if (index === -1) return null;

    this.productos[index] = { ...this.productos[index], ...producto };
    return this.productos[index];
  }

  async delete(id: number): Promise<boolean> {
    const index = this.productos.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.productos[index].activo = false;
    return true;
  }
}
