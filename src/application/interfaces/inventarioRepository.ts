import { Inventario, InventarioCreation, InventarioUpdate } from '../../domain/inventario';

export interface InventarioRepository {
  findAll(): Promise<Inventario[]>;
  findById(id: number): Promise<Inventario | null>;
  findByProductoAndBodega(productoId: number, bodegaId: number): Promise<Inventario | null>;
  findByProducto(productoId: number): Promise<Inventario[]>;
  findByBodega(bodegaId: number): Promise<Inventario[]>;
  create(inventario: InventarioCreation): Promise<Inventario>;
  update(id: number, inventario: InventarioUpdate): Promise<Inventario | null>;
  delete(id: number): Promise<boolean>;
}
