export interface Inventario {
  id: number;
  productoId: number;
  bodegaId: number;
  cantidad: number;
  fechaActualizacion: Date;
}

export interface InventarioCreation {
  productoId: number;
  bodegaId: number;
  cantidad: number;
}

export interface InventarioUpdate {
  cantidad: number;
}
