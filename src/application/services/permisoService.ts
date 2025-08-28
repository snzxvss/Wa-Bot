import { Permiso, PermisoCreation, PermisoUpdate } from '../../domain/permiso';
import { PermisoRepository } from '../interfaces/permisoRepository';

export class PermisoService {
  constructor(private permisoRepository: PermisoRepository) {}

  async findAll(): Promise<Permiso[]> {
    return await this.permisoRepository.findAll();
  }

  async findById(id: number): Promise<Permiso | null> {
    return await this.permisoRepository.findById(id);
  }

  async findByNombre(nombre: string): Promise<Permiso | null> {
    return await this.permisoRepository.findByNombre(nombre);
  }

  async create(permisoData: PermisoCreation): Promise<Permiso> {
    // Verificar que no exista un permiso con el mismo nombre
    const existingPermiso = await this.permisoRepository.findByNombre(permisoData.nombre);
    if (existingPermiso) {
      throw new Error('Ya existe un permiso con ese nombre');
    }

    return await this.permisoRepository.create(permisoData);
  }

  async update(id: number, permisoData: PermisoUpdate): Promise<Permiso | null> {
    // Si se está actualizando el nombre, verificar que no exista otro con el mismo nombre
    if (permisoData.nombre) {
      const existingPermiso = await this.permisoRepository.findByNombre(permisoData.nombre);
      if (existingPermiso && existingPermiso.id !== id) {
        throw new Error('Ya existe un permiso con ese nombre');
      }
    }

    return await this.permisoRepository.update(id, permisoData);
  }

  async delete(id: number): Promise<boolean> {
    return await this.permisoRepository.delete(id);
  }
}
