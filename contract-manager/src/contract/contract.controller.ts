import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ContractService } from './contract.service';
import { loadAbi } from 'src/utils/abi-loader';

@Controller('contract')
export class ContractController {
  constructor(private readonly contractService: ContractService) { }

  @Post('mint')
  async mint(@Body() body: any) {
    const { contract_address, amount } = body;

    const abi = loadAbi(contract_address);

    const txHash = await this.contractService.mint(abi, contract_address, amount);
    return { contract: contract_address, minted: amount, txHash };
  }

  @Post('burn')
  async burn(@Body() body: any) {
    const { contract_address, amount } = body;

    const abi = loadAbi(contract_address);

    const txHash = await this.contractService.burn(abi, contract_address, amount);
    return { contract: contract_address, burned: amount, txHash };
  }

  @Post('call-function')
  async callFunction(@Body() body: any) {
    const { contract_address, function_name, parameters = [] } = body;

    const abi = loadAbi(contract_address);

    const result = await this.contractService.callFunction(
      abi,
      contract_address,
      function_name,
      parameters,
    );

    return { contract: contract_address, function: function_name, result };
  }
}
