import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('productos')
export class ProductoEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  nombre!: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imagenUrl?: string;

  @CreateDateColumn({ type: 'timestamp' })
  fechaCreacion!: Date;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;
}
