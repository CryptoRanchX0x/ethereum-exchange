import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';
import { SmartContractEntity } from 'src/database/entities/smart-contract.entity';
import { TransactionEntity } from 'src/database/entities/transaction.entity';
import { AbiModule } from 'src/abi/abi.module';

@Module({
  imports: [TypeOrmModule.forFeature([SmartContractEntity, TransactionEntity]), AbiModule],
  providers: [ContractService],
  controllers: [ContractController],
})
export class ContractModule {}