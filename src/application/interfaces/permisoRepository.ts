import { Permiso, PermisoCreation, PermisoUpdate } from '../../domain/permiso';

export interface PermisoRepository {
  findAll(): Promise<Permiso[]>;
  findById(id: number): Promise<Permiso | null>;
  findByNombre(nombre: string): Promise<Permiso | null>;
  create(permiso: PermisoCreation): Promise<Permiso>;
  update(id: number, permiso: PermisoUpdate): Promise<Permiso | null>;
  delete(id: number): Promise<boolean>;
}
