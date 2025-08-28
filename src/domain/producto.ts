export interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagenUrl?: string;
  fechaCreacion: Date;
  activo: boolean;
}

export interface ProductoCreation {
  nombre: string;
  descripcion?: string;
  precio: number;
  imagenUrl?: string;
}

export interface ProductoUpdate {
  nombre?: string;
  descripcion?: string;
  precio?: number;
  imagenUrl?: string;
  activo?: boolean;
}
