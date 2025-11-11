import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';
import { SmartContractEntity } from 'src/database/entities/smart-contract.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SmartContractEntity])],
  providers: [ContractService],
  controllers: [ContractController],
})
export class ContractModule {}