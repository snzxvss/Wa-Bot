import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/db';
import { ProductoEntity } from '../database/entities/Producto';
import { Producto, ProductoCreation, ProductoUpdate } from '../../domain/producto';
import { ProductoRepository } from '../../application/interfaces/productoRepository';

export class MySQLProductoRepository implements ProductoRepository {
  private repository: Repository<ProductoEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(ProductoEntity);
  }

  async findAll(): Promise<Producto[]> {
    const entities = await this.repository.find({
      where: { activo: true },
      order: { fechaCreacion: 'DESC' }
    });
    return entities.map(this.mapEntityToDomain);
  }

  async findById(id: number): Promise<Producto | null> {
    const entity = await this.repository.findOne({
      where: { id, activo: true }
    });
    return entity ? this.mapEntityToDomain(entity) : null;
  }

  async findByNombre(nombre: string): Promise<Producto[]> {
    const entities = await this.repository
      .createQueryBuilder('producto')
      .where('producto.activo = :activo', { activo: true })
      .andWhere(
        '(LOWER(producto.nombre) LIKE LOWER(:nombre) OR LOWER(producto.descripcion) LIKE LOWER(:descripcion))',
        { 
          nombre: `%${nombre}%`, 
          descripcion: `%${nombre}%` 
        }
      )
      .orderBy('producto.fechaCreacion', 'DESC')
      .getMany();

    return entities.map(this.mapEntityToDomain);
  }

  async create(productoData: ProductoCreation): Promise<Producto> {
    const entity = this.repository.create({
      ...productoData,
      activo: true
    });
    
    const savedEntity = await this.repository.save(entity);
    return this.mapEntityToDomain(savedEntity);
  }

  async update(id: number, productoData: ProductoUpdate): Promise<Producto | null> {
    const existingEntity = await this.repository.findOne({
      where: { id, activo: true }
    });

    if (!existingEntity) {
      return null;
    }

    // Actualizar campos
    Object.assign(existingEntity, productoData);
    
    const updatedEntity = await this.repository.save(existingEntity);
    return this.mapEntityToDomain(updatedEntity);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.update(
      { id, activo: true },
      { activo: false }
    );
    
    return result.affected !== undefined && result.affected > 0;
  }

  // Método auxiliar para mapear entidad a dominio
  private mapEntityToDomain(entity: ProductoEntity): Producto {
    return {
      id: entity.id,
      nombre: entity.nombre,
      descripcion: entity.descripcion,
      precio: Number(entity.precio), // Convertir decimal a number
      imagenUrl: entity.imagenUrl,
      fechaCreacion: entity.fechaCreacion,
      activo: entity.activo
    };
  }
}
