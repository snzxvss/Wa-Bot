export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  password: string;
  permisoId: number;
  fechaCreacion: Date;
  activo: boolean;
}

export interface UsuarioCreation {
  nombre: string;
  email: string;
  password: string;
  permisoId: number;
}

export interface UsuarioUpdate {
  nombre?: string;
  email?: string;
  password?: string;
  permisoId?: number;
  activo?: boolean;
}
