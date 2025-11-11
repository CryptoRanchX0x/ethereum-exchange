import { Body, Controller, Post } from '@nestjs/common';
import { ContractService } from './contract.service';
import { loadAbi } from 'src/utils/abi-loader';

@Controller('contract')
export class ContractController {
  constructor(private readonly contractService: ContractService) { }

  @Post('call-function-read')
  async callFunction(@Body() body: any) {
    const { contract_name, contract_address, function_name, parameters = [] } = body;

    const result = await this.contractService.callFunction(
      contract_name,
      contract_address,
      function_name,
      parameters,
    );

    return { contract: contract_name, function: function_name, result: result.toString() };
  }

  /**
   * Deploy endpoint
   * Body: {
   *   abi_name: string,                // name used to store artifact in DynamoDB (or filename without .json)
   *   constructor_args?: any[],        // constructor parameters (optional)
   *   overrides?: Record<string, any>  // transaction overrides e.g. { gasLimit, value }
   * }
   */
  @Post('deploy')
  async deploy(@Body() body: any) {
    const { abi_name, constructor_args = [], overrides = {} } = body;

    const result = await this.contractService.deployContract(abi_name, constructor_args, overrides);

    return {
      message: `Contract deployed successfully`,
      contractAddress: result.address,
      txHash: result.txHash,
      smartContractId: result.smartContractId,
      receipt: result.receipt,
    };
  }
}