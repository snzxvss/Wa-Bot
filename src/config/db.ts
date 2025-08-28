import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { ProductoEntity } from '../infrastructure/database/entities/Producto';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'wa_bot',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [ProductoEntity],
  migrations: [],
  subscribers: [],
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('Base de datos conectada exitosamente');
  } catch (error) {
    console.error('Error conectando a la base de datos:', error);
    throw error;
  }
};
