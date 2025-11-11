import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmartContractEntity } from './entities/smart-contract.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USERNAME || 'app_user',
      password: process.env.DB_PASSWORD || 'app_password',
      database: process.env.DB_DATABASE || 'ethereum_exchange',
      entities: [SmartContractEntity],
      synchronize: false, // não sincroniza automaticamente (use migrations)
      logging: process.env.DB_LOGGING === 'true',
      timezone: 'Z',
    }),
    TypeOrmModule.forFeature([SmartContractEntity]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
