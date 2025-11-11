import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ethers, Transaction } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { loadAbi } from 'src/utils/abi-loader';
import { AbiService } from 'src/abi/abi.service';
import { SmartContractEntity } from 'src/database/entities/smart-contract.entity';

@Injectable()
export class ContractService {
  private readonly provider: ethers.JsonRpcProvider;

  constructor(
    @InjectRepository(SmartContractEntity)
    private readonly smartContractRepository: Repository<SmartContractEntity>,
    private readonly abiService: AbiService,
  ) {
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
    contractName: string,
    contractAddress: string,
    functionName: string,
    parameters: any[] = [],
  ): Promise<any> {
    let contract: ethers.Contract;
    // lookup by name in DB -> get address and abi id, then fetch abi from Dynamo
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

  /**
   * Fetch a deployed contract by its logical `name` stored in MySQL.
   * Returns the ethers.Contract instance along with address and abiId.
   */
  async getContractByName(
    name: string,
    address: string,
    signerOrProvider?: ethers.Signer | ethers.Provider,
  ): Promise<{ contract: ethers.Contract; address: string; abiId: string }> {
    const smart = await this.smartContractRepository.findOne({ where: { name, address } as any });
    if (!smart) {
      throw new NotFoundException(`Smart contract with name "${name}" not found`);
    }

    const abiId = smart.id_abi;

    const abiItem = await this.abiService.getAbiById(abiId);
    if (!abiItem) {
      throw new NotFoundException(`ABI with id "${abiId}" not found in DynamoDB`);
    }

    const abi = abiItem.abi.abi;
    const providerOrSigner = signerOrProvider ?? this.provider;

    const contract = new ethers.Contract(address, abi, providerOrSigner as any);
    return { contract, address, abiId };
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

    console.log('[deploy] artifact keys:', Object.keys(artifact));
    console.log('[deploy] artifact.abi type:', typeof artifact.abi, 'isArray:', Array.isArray(artifact.abi));

    // If artifact is just an ABI array, we cannot deploy (no bytecode)
    if (Array.isArray(artifact.abi)) {
      throw new BadRequestException(
        'Stored ABI is an ABI array without bytecode. For deploy, upload the full compilation artifact that includes "bytecode".'
      );
    }

    // Try to extract abi and bytecode from common artifact shapes:
    //  - Hardhat artifact: { abi: [...], bytecode: "0x...", deployedBytecode: "0x...", ... }
    //  - solc-json output artifact: { abi: [...], evm: { bytecode: { object: "..." } } }
    let abi: any = artifact.abi.abi ?? artifact.abi ?? artifact; // fallback
    let bytecode: string | undefined = artifact.bytecode ?? artifact.abi?.bytecode ?? (artifact.abi?.evm && artifact.abi.evm.bytecode && artifact.abi.evm.bytecode.object);

    console.log('[deploy] extracted abi type:', typeof abi, 'isArray:', Array.isArray(abi));
    console.log('[deploy] extracted bytecode:', bytecode ? `length=${bytecode.length}, starts=${bytecode.slice(0, 20)}...` : 'undefined');

    // If artifact.abi might be a string (if stored differently), parse it
    if (typeof abi === 'string') {
      try {
        abi = JSON.parse(abi);
      } catch {
        // keep as-is if not JSON
      }
    }

    if (!bytecode || bytecode === '0x' || bytecode.length === 0) {
      throw new BadRequestException('No deployable bytecode found in the stored artifact. Make sure you uploaded the full compilation artifact that includes "bytecode".');
    }

    // Create signer and factory
    const signer = this.getSigner();

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

      // Ensure `from` is set so provider estimates use correct sender
      const fromAddress = await signer.getAddress();
      unsignedTx.from = unsignedTx.from ?? fromAddress;

      // Get network chainId and populate transaction fields
      const network = await this.provider.getNetwork();
      unsignedTx.chainId = network.chainId;

      // Estimate gas if not provided
      if (!unsignedTx.gasLimit && !unsignedTx.gas) {
        try {
          const est = await this.provider.estimateGas(unsignedTx);
          // add a small buffer
          unsignedTx.gasLimit = (est * 110n) / 100n;
        } catch (e) {
          console.warn('[deploy] gas estimate failed:', (e as any).message);
        }
      }

      // Fill fee fields if missing (EIP-1559)
      try {
        const feeData = await this.provider.getFeeData();
        if (!unsignedTx.maxFeePerGas && feeData.maxFeePerGas) unsignedTx.maxFeePerGas = feeData.maxFeePerGas;
        if (!unsignedTx.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas) unsignedTx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        if (!unsignedTx.gasPrice && feeData.gasPrice) unsignedTx.gasPrice = feeData.gasPrice;
      } catch (e) {
        console.warn('[deploy] fee data retrieval failed:', (e as any).message);
      }

      // Set nonce if not present
      if (unsignedTx.nonce === undefined) {
        try {
          const nonce = await this.provider.getTransactionCount(fromAddress, 'pending');
          unsignedTx.nonce = nonce;
        } catch (e) {
          console.warn('[deploy] nonce retrieval failed:', (e as any).message);
        }
      }

      // Log unsigned transaction
      //console.log('[deploy] unsignedTx:', JSON.stringify(unsignedTx, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
      //console.log('[deploy] unsignedTx.data length:', unsignedTx.data ? unsignedTx.data.length);


      // Sign the transaction (returns serialized/raw tx)
      const signedTx = await this.getSigner().signTransaction(unsignedTx);
      //console.log('[deploy] signedTx length:', signedTx ? signedTx.length : 'null');

      const tx = Transaction.from(signedTx);

      // Send raw transaction
      const txResponse = await this.getSigner().sendTransaction(tx);
      console.log('[deploy] txHash:', txResponse.hash);

      // Wait for the transaction to be mined
      const receipt = await txResponse.wait();
      console.log('[deploy] receipt:', JSON.stringify(receipt, null, 2));

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
      throw new BadRequestException(`Failed to deploy contract "${abiName}": ${err?.message ?? err}`);
    }
  }
}