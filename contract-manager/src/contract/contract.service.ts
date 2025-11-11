import { BadRequestException, Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { getContract } from 'src/utils/abi-loader';

@Injectable()
export class ContractService {
  private readonly provider: ethers.JsonRpcProvider;

  constructor() {
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    if (!rpcUrl) {
      throw new Error('SEPOLIA_RPC_URL environment variable is required');
    }
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

  }

  getSigner(): ethers.Wallet {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY not defined in .env');
    }

    return new ethers.Wallet(privateKey, this.provider);
  }

  async callFunction(
    abi: any,
    contractAddress: string,
    functionName: string,
    parameters: any[] = [],
  ): Promise<any> {
    const contract = getContract(contractAddress, abi, this.provider);

    try {
      if (typeof contract[functionName] !== 'function') {
        throw new BadRequestException(`Function ${functionName} does not exist in contract`);
      }

      return await contract[functionName](...parameters);
    } catch (error) {
      throw new BadRequestException(`Error calling function ${functionName} and parameters ${JSON.stringify(parameters)}: ${error.message}`);
    }

  }
}
