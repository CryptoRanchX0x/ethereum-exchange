import { Module } from '@nestjs/common';
import { ContractModule } from './contract/contract.module';
import { ContractController } from './contract/contract.controller';
import { ContractService } from './contract/contract.service';

@Module({
  imports: [ContractModule],
  controllers: [ContractController],
  providers: [ContractService],
})
export class AppModule {}
