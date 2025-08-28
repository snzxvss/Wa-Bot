import { Producto, ProductoCreation, ProductoUpdate } from '../../domain/producto';
import { ProductoRepository } from '../interfaces/productoRepository';

export class ProductoService {
  constructor(private productoRepository: ProductoRepository) {}

  async findAll(): Promise<Producto[]> {
    return await this.productoRepository.findAll();
  }

  async findById(id: number): Promise<Producto | null> {
    return await this.productoRepository.findById(id);
  }

  async findByNombre(nombre: string): Promise<Producto[]> {
    return await this.productoRepository.findByNombre(nombre);
  }

  async create(productoData: ProductoCreation): Promise<Producto> {
    return await this.productoRepository.create(productoData);
  }

  async update(id: number, productoData: ProductoUpdate): Promise<Producto | null> {
    return await this.productoRepository.update(id, productoData);
  }

  async delete(id: number): Promise<boolean> {
    return await this.productoRepository.delete(id);
  }

  async updateImagen(id: number, imagenUrl: string): Promise<Producto | null> {
    return await this.productoRepository.update(id, { imagenUrl });
  }

  async searchProducts(query: string): Promise<Producto[]> {
    const productos = await this.productoRepository.findByNombre(query);
    return productos.filter(p => p.activo);
  }
}
