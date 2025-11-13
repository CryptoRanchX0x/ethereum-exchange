import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ethers, Transaction } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { loadAbi } from 'src/utils/abi-loader';
import { AbiService } from 'src/abi/abi.service';
import { SmartContractEntity } from 'src/database/entities/smart-contract.entity';
import { TransactionEntity, TransactionStatus } from 'src/database/entities/transaction.entity';
import { KmsService } from 'src/kms/kms.service';
import { getSigner } from 'src/utils/getSigner';
@Injectable()
export class ContractService {
  private readonly provider: ethers.JsonRpcProvider;

  constructor(
    @InjectRepository(SmartContractEntity)
    private readonly smartContractRepository: Repository<SmartContractEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    private readonly abiService: AbiService,
    private readonly kmsService: KmsService,
  ) {
    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) {
      throw new Error('RPC_URL environment variable is required');
    }
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  async callFunction(
    contractName: string,
    contractAddress: string,
    functionName: string,
    parameters: any[] = [],
  ): Promise<any> {
    let contract: ethers.Contract;
    const result = await this.getContractByName(contractName, contractAddress, this.provider);
    contract = result.contract;

    try {
      if (typeof contract[functionName] !== 'function') {
        throw new BadRequestException(`Function ${functionName} does not exist in contract`);
      }

      const txData = contract.interface.encodeFunctionData(functionName, parameters);

      const tx = {
        to: contractAddress,
        data: txData,
        value: 0,
        gasLimit: 100000n,
        gasPrice: ethers.parseUnits("15", "gwei"),
        nonce: 0,
        chainId: (await this.provider.getNetwork()).chainId,
      };

      // Execute an eth_call (read-only) and decode the returned bytes using the contract ABI
      const raw = await this.provider.call(tx);
      try {
        const decoded = contract.interface.decodeFunctionResult(functionName, raw);
        // If single return value, return it directly
        if (decoded.length === 1) return decoded[0];
        return decoded;
      } catch (err: any) {
        // If decoding fails, return raw hex for debugging
        console.warn('[callFunction] decode failed, returning raw hex:', err?.message ?? err);
        return raw;
      }

    } catch (error: any) {
      throw new BadRequestException(`Error calling function ${functionName} and parameters ${JSON.stringify(parameters)}: ${error?.message || error}`);
    }
  }

  async callFunctionWrite(
    contractName: string,
    contractAddress: string,
    functionName: string,
    parameters: any[] = [],
  ): Promise<any> {
    let contract: ethers.Contract;
    const result = await this.getContractByName(contractName, contractAddress, this.provider);
    contract = result.contract;

    const transactionId = uuidv4();

    try {
      if (typeof contract[functionName] !== 'function') {
        throw new BadRequestException(`Function ${functionName} does not exist in contract`);
      }

      const txData = contract.interface.encodeFunctionData(functionName, parameters);

      const unsignedTx = {
        to: contractAddress,
        data: txData,
        value: 0n,
        gasLimit: 300000n,
      };

      const txResponse = await this.signAndBroadcastTransaction(unsignedTx, 'callFunctionWrite');

      // Salvar transação no banco com status ENVIADA
      const txEntity = this.transactionRepository.create({
        id: transactionId,
        id_smart_contract: result.smartContractId,
        tx_hash: txResponse.hash,
        status: TransactionStatus.ENVIADA,
        function_name: functionName,
      });

      await this.transactionRepository.save(txEntity);
      console.log('[callFunctionWrite] Transaction saved to DB:', txEntity.id);

      return { tx_hash: txResponse.hash, transactionId, status: txEntity.status };

    } catch (error: any) {
      throw new BadRequestException(`Error calling function ${functionName} and parameters ${JSON.stringify(parameters)}: ${error?.message || error}`);
    }
  }

  /**
   * Centraliza assinatura e broadcast de transações
   */
  private async signAndBroadcastTransaction(
    unsignedTx: any,
    context: string,
  ): Promise<ethers.TransactionResponse> {
    const signer = getSigner(this.kmsService, this.provider);
    const fromAddress = await signer.getAddress();

    // Preenche campos obrigatórios
    const network = await this.provider.getNetwork();
    unsignedTx.chainId = unsignedTx.chainId ?? network.chainId;
    unsignedTx.nonce = unsignedTx.nonce ?? await this.provider.getTransactionCount(fromAddress, 'pending');

    // Preenche fee data se não fornecido
    if (!unsignedTx.gasPrice && !unsignedTx.maxFeePerGas) {
      try {
        const feeData = await this.provider.getFeeData();
        if (feeData.maxFeePerGas) {
          unsignedTx.maxFeePerGas = feeData.maxFeePerGas;
          unsignedTx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? ethers.parseUnits('2', 'gwei');
          unsignedTx.type = 2; // EIP-1559
        } else {
          unsignedTx.gasPrice = feeData.gasPrice;
          unsignedTx.type = 0; // Legacy
        }
      } catch (e) {
        console.warn(`[${context}] fee data retrieval failed:`, (e as any).message);
        unsignedTx.gasPrice = ethers.parseUnits("15", "gwei");
        unsignedTx.type = 0;
      }
    }

    // Estima gas se não fornecido (apenas para deploy)
    if (!unsignedTx.gasLimit && context === 'deploy') {
      try {
        const est = await this.provider.estimateGas(unsignedTx);
        unsignedTx.gasLimit = (est * 110n) / 100n;
      } catch (e) {
        console.warn(`[${context}] gas estimate failed:`, (e as any).message);
        unsignedTx.gasLimit = 3000000n;
      }
    }

    console.log(`[${context}] Transaction to sign:`, {
      to: unsignedTx.to,
      dataLength: unsignedTx.data?.length || 0,
      gasLimit: unsignedTx.gasLimit?.toString(),
      nonce: unsignedTx.nonce,
    });

    const signedTx = await signer.signTransaction(unsignedTx);
    const txResponse = await this.provider.broadcastTransaction(signedTx);
    
    console.log(`[${context}] txHash:`, txResponse.hash);
    return txResponse;
  }

  /**
   * Fetch a deployed contract by its logical `name` stored in MySQL.
   * Returns the ethers.Contract instance along with address and abiId.
   */
  async getContractByName(
    name: string,
    address: string,
    signerOrProvider?: ethers.Signer | ethers.Provider,
  ): Promise<{ contract: ethers.Contract; address: string; abiId: string; smartContractId: string }> {
    const contractData = await this.smartContractRepository.findOne({ where: { name, address } as any });
    if (!contractData) {
      throw new NotFoundException(`Smart contract with name "${name}" and address "${address}" not found`);
    }

    const abiId = contractData.id_abi;

    const abiItem = await this.abiService.getAbiById(abiId);
    if (!abiItem) {
      throw new NotFoundException(`ABI with id "${abiId}" not found in DynamoDB`);
    }

    const abi = abiItem.abi.abi;
    const providerOrSigner = signerOrProvider ?? this.provider;

    const contract = new ethers.Contract(address, abi, providerOrSigner as any);
    return { contract, address, abiId, smartContractId: contractData.id };
  }

  /**
   * Deploy a contract using an ABI/artifact saved in DynamoDB.
   *
   * @param abiName The name used to store the artifact in DynamoDB (e.g. "IUSD" or artifact filename without extension)
   * @param constructorArgs Array of constructor arguments for the contract
   * @param overrides Optional transaction overrides (gasLimit, gasPrice, value, etc.)
   */
  async deployContract(
    abiName: string,
    constructorArgs: any[] = [],
    overrides: Record<string, any> = {},
  ): Promise<{ address: string; txHash: string; receipt: any; smartContractId: string }> {
    if (!abiName) {
      throw new BadRequestException('abiName is required');
    }

    // loadAbi returns the parsed content saved in DynamoDB. Expect an artifact object (with bytecode) or an ABI-only array.
    const artifact = await loadAbi(abiName);

    if (!artifact) {
      throw new BadRequestException(`No ABI/artifact found for "${abiName}"`);
    }

    // If artifact is just an ABI array, we cannot deploy (no bytecode)
    if (Array.isArray(artifact.abi)) {
      throw new BadRequestException(
        'Stored ABI is an ABI array without bytecode. For deploy, upload the full compilation artifact that includes "bytecode".'
      );
    }


    let abi: any = artifact.abi.abi;
    let bytecode: string | undefined = artifact.abi?.bytecode;
    if (typeof abi === 'string') {
      abi = JSON.parse(abi);
    }

    if (!bytecode || bytecode === '0x' || bytecode.length === 0) {
      throw new BadRequestException('No deployable bytecode found in the stored artifact. Make sure you uploaded the full compilation artifact that includes "bytecode".');
    }

    const signer = getSigner(this.kmsService, this.provider);

    try {
      const factory = new ethers.ContractFactory(abi, bytecode, signer as any);

      // Prepare deploy arguments
      const deployArgs = constructorArgs.slice();
      const includeOverrides = overrides && Object.keys(overrides).length > 0;
      if (includeOverrides) {
        deployArgs.push(overrides);
      }

      // Build unsigned transaction for deployment
      // getDeployTransaction returns a TransactionRequest-like object with `data` and `value`
      const unsignedTx: any = await factory.getDeployTransaction(...deployArgs);

      // Use centralized method for signing and broadcasting
      const txResponse = await this.signAndBroadcastTransaction(unsignedTx, 'deploy');

      const receipt = await txResponse.wait();

      const address = receipt?.contractAddress!!;

      // Save contract to MySQL database
      const smartContractId = uuidv4();
      const abiId = artifact.id;

      const smartContractData: Partial<SmartContractEntity> = {
        id: smartContractId,
        name: abiName,
        address: address!!,
        tx_hash: txResponse.hash,
        id_abi: abiId,
        ativo: true,
      };

      const smartContract = this.smartContractRepository.create(smartContractData as any);

      const savedContract = await this.smartContractRepository.save(smartContract);
      console.log('[deploy] Smart contract saved to MySQL:', savedContract);

      return {
        smartContractId,
        address,
        txHash: txResponse.hash,
        receipt,
      };
    } catch (err: any) {
      console.error(`Failed to deploy contract "${abiName}":`, err);
      throw new BadRequestException(`Failed to deploy contract "${abiName}": ${err?.message ?? err}`);
    }
  }
}