import { Module } from '@nestjs/common';
import { ContractModule } from './contract/contract.module';
import { AbiModule } from './abi/abi.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [DatabaseModule, ContractModule, AbiModule],
})
export class AppModule {}
