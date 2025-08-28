export interface Permiso {
  id: number;
  nombre: string;
  descripcion?: string;
  fechaCreacion: Date;
  activo: boolean;
}

export interface PermisoCreation {
  nombre: string;
  descripcion?: string;
}

export interface PermisoUpdate {
  nombre?: string;
  descripcion?: string;
  activo?: boolean;
}
