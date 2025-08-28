import { Bodega, BodegaCreation, BodegaUpdate } from '../../domain/bodega';
import { BodegaRepository } from '../interfaces/bodegaRepository';

export class BodegaService {
  constructor(private bodegaRepository: BodegaRepository) {}

  async findAll(): Promise<Bodega[]> {
    return await this.bodegaRepository.findAll();
  }

  async findById(id: number): Promise<Bodega | null> {
    return await this.bodegaRepository.findById(id);
  }

  async create(bodegaData: BodegaCreation): Promise<Bodega> {
    return await this.bodegaRepository.create(bodegaData);
  }

  async update(id: number, bodegaData: BodegaUpdate): Promise<Bodega | null> {
    return await this.bodegaRepository.update(id, bodegaData);
  }

  async delete(id: number): Promise<boolean> {
    return await this.bodegaRepository.delete(id);
  }
}
