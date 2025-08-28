export interface Cliente {
  id: number;
  nombre: string;
  email?: string;
  telefono: string;
  direccion?: string;
  fechaCreacion: Date;
  activo: boolean;
}

export interface ClienteCreation {
  nombre: string;
  email?: string;
  telefono: string;
  direccion?: string;
}

export interface ClienteUpdate {
  nombre?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  activo?: boolean;
}
