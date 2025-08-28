import { Inventario, InventarioCreation, InventarioUpdate } from '../../domain/inventario';
import { InventarioRepository } from '../interfaces/inventarioRepository';

export class InventarioService {
  constructor(private inventarioRepository: InventarioRepository) {}

  async findAll(): Promise<Inventario[]> {
    return await this.inventarioRepository.findAll();
  }

  async findById(id: number): Promise<Inventario | null> {
    return await this.inventarioRepository.findById(id);
  }

  async findByProducto(productoId: number): Promise<Inventario[]> {
    return await this.inventarioRepository.findByProducto(productoId);
  }

  async findByBodega(bodegaId: number): Promise<Inventario[]> {
    return await this.inventarioRepository.findByBodega(bodegaId);
  }

  async findByProductoAndBodega(productoId: number, bodegaId: number): Promise<Inventario | null> {
    return await this.inventarioRepository.findByProductoAndBodega(productoId, bodegaId);
  }

  async create(inventarioData: InventarioCreation): Promise<Inventario> {
    // Verificar si ya existe inventario para ese producto en esa bodega
    const existing = await this.inventarioRepository.findByProductoAndBodega(
      inventarioData.productoId,
      inventarioData.bodegaId
    );

    if (existing) {
      throw new Error('Ya existe inventario para este producto en esta bodega');
    }

    return await this.inventarioRepository.create(inventarioData);
  }

  async update(id: number, inventarioData: InventarioUpdate): Promise<Inventario | null> {
    return await this.inventarioRepository.update(id, inventarioData);
  }

  async updateCantidad(id: number, cantidad: number): Promise<Inventario | null> {
    if (cantidad < 0) {
      throw new Error('La cantidad no puede ser negativa');
    }

    return await this.inventarioRepository.update(id, { cantidad });
  }

  async reducirStock(productoId: number, bodegaId: number, cantidad: number): Promise<boolean> {
    const inventario = await this.inventarioRepository.findByProductoAndBodega(productoId, bodegaId);
    
    if (!inventario) {
      throw new Error('Inventario no encontrado');
    }

    if (inventario.cantidad < cantidad) {
      throw new Error('Stock insuficiente');
    }

    const nuevaCantidad = inventario.cantidad - cantidad;
    const updated = await this.inventarioRepository.update(inventario.id, { cantidad: nuevaCantidad });
    
    return !!updated;
  }

  async aumentarStock(productoId: number, bodegaId: number, cantidad: number): Promise<boolean> {
    const inventario = await this.inventarioRepository.findByProductoAndBodega(productoId, bodegaId);
    
    if (!inventario) {
      // Si no existe, crear nuevo inventario
      await this.inventarioRepository.create({
        productoId,
        bodegaId,
        cantidad
      });
      return true;
    }

    const nuevaCantidad = inventario.cantidad + cantidad;
    const updated = await this.inventarioRepository.update(inventario.id, { cantidad: nuevaCantidad });
    
    return !!updated;
  }

  async delete(id: number): Promise<boolean> {
    return await this.inventarioRepository.delete(id);
  }

  async getStockTotal(productoId: number): Promise<number> {
    const inventarios = await this.inventarioRepository.findByProducto(productoId);
    return inventarios.reduce((total, inv) => total + inv.cantidad, 0);
  }
}
