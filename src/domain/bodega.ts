export interface Bodega {
  id: number;
  nombre: string;
  ubicacion: string;
  contacto?: string;
  telefono?: string;
  fechaCreacion: Date;
  activo: boolean;
}

export interface BodegaCreation {
  nombre: string;
  ubicacion: string;
  contacto?: string;
  telefono?: string;
}

export interface BodegaUpdate {
  nombre?: string;
  ubicacion?: string;
  contacto?: string;
  telefono?: string;
  activo?: boolean;
}
