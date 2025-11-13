import { ethers } from 'ethers';
import { KmsService } from '../kms/kms.service';

/**
 * Signer personalizado que usa AWS KMS para assinar transações
 */
export class KmsSigner extends ethers.AbstractSigner {
  private kmsService: KmsService;
  public provider: ethers.Provider;

  constructor(kmsService: KmsService, provider: ethers.Provider) {
    super(provider);
    this.kmsService = kmsService;
    this.provider = provider;
  }

  async getAddress(): Promise<string> {
    return this.kmsService.getAddress();
  }

  async signTransaction(transaction: ethers.TransactionRequest): Promise<string> {
    // Resolve propriedades pendentes
    const resolved = await ethers.resolveProperties(transaction);
    
    // Constrói objeto de transação tipado (sem 'from' - será inferido da assinatura)
    const tx: ethers.TransactionLike = {
      to: resolved.to ? String(resolved.to) : null,
      nonce: resolved.nonce,
      gasLimit: resolved.gasLimit,
      data: resolved.data || '0x',
      value: resolved.value ?? 0n,
      chainId: resolved.chainId,
      type: resolved.type,
    };

    // Adiciona campos de fee conforme o tipo da transação
    if (resolved.type === 2 || resolved.maxFeePerGas !== undefined) {
      tx.maxFeePerGas = resolved.maxFeePerGas;
      tx.maxPriorityFeePerGas = resolved.maxPriorityFeePerGas;
    } else {
      tx.gasPrice = resolved.gasPrice;
    }

    // Assina usando KMS (responsabilidade única: apenas assinar)
    return this.kmsService.signTransaction(tx);
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const messageBytes = typeof message === 'string' 
      ? ethers.toUtf8Bytes(message) 
      : message;
    
    const messageHash = ethers.hashMessage(messageBytes);
    const signature = await this.kmsService.signHash(messageHash);

    return ethers.Signature.from({
      r: '0x' + signature.r,
      s: '0x' + signature.s,
      v: signature.v,
    }).serialized;
  }

  async signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, any>,
  ): Promise<string> {
    const hash = ethers.TypedDataEncoder.hash(domain, types, value);
    const signature = await this.kmsService.signHash(hash);

    return ethers.Signature.from({
      r: '0x' + signature.r,
      s: '0x' + signature.s,
      v: signature.v,
    }).serialized;
  }

  connect(provider: ethers.Provider): KmsSigner {
    return new KmsSigner(this.kmsService, provider);
  }
}


export function getSigner(kmsService: KmsService, provider?: ethers.Provider): ethers.Signer {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    throw new Error('RPC_URL not defined in .env');
  }

  const defaultProvider = provider || new ethers.JsonRpcProvider(rpcUrl);

  return new KmsSigner(kmsService, defaultProvider);
}
