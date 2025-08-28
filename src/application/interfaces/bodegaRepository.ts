import { Bodega, BodegaCreation, BodegaUpdate } from '../../domain/bodega';

export interface BodegaRepository {
  findAll(): Promise<Bodega[]>;
  findById(id: number): Promise<Bodega | null>;
  create(bodega: BodegaCreation): Promise<Bodega>;
  update(id: number, bodega: BodegaUpdate): Promise<Bodega | null>;
  delete(id: number): Promise<boolean>;
}
