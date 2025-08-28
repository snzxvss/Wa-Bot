import { Producto, ProductoCreation, ProductoUpdate } from '../../domain/producto';

export interface ProductoRepository {
  findAll(): Promise<Producto[]>;
  findById(id: number): Promise<Producto | null>;
  findByNombre(nombre: string): Promise<Producto[]>;
  create(producto: ProductoCreation): Promise<Producto>;
  update(id: number, producto: ProductoUpdate): Promise<Producto | null>;
  delete(id: number): Promise<boolean>;
}
