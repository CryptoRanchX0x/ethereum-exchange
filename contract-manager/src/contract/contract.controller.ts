import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ContractService } from './contract.service';
import { loadAbi } from 'src/utils/abi-loader';

@Controller('contract')
export class ContractController {
  constructor(private readonly contractService: ContractService) { }

  @Post('call-function')
  async callFunction(@Body() body: any) {
    const { contract_address, function_name, parameters = [] } = body;

    const abi = await loadAbi(contract_address);

    const result = await this.contractService.callFunction(
      abi,
      contract_address,
      function_name,
      parameters,
    );

    return { contract: contract_address, function: function_name, result };
  }
}
