import { Module } from '@nestjs/common';
import { AbiController } from './abi.controller';
import { AbiService } from './abi.service';

@Module({
  controllers: [AbiController],
  providers: [AbiService],
  exports: [AbiService],
})
export class AbiModule {}
