import { Injectable } from '@nestjs/common';
import { KMSClient, SignCommand, GetPublicKeyCommand } from '@aws-sdk/client-kms';
import { ethers } from 'ethers';

@Injectable()
export class KmsService {
  private readonly kmsClient: KMSClient;
  private readonly keyId: string;
  private cachedPublicKey: string | null = null;
  private cachedAddress: string | null = null;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    const endpoint = process.env.AWS_ENDPOINT;

    this.kmsClient = new KMSClient({
      region,
      ...(endpoint && { endpoint }),
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
    });

    const keyId = process.env.KMS_KEY_ID;
    if (!keyId) {
      throw new Error('KMS_KEY_ID environment variable is required');
    }
    this.keyId = keyId;
  }

  /**
   * Obtém a chave pública do KMS e calcula o endereço Ethereum
   */
  async getAddress(): Promise<string> {
    if (this.cachedAddress) {
      return this.cachedAddress;
    }

    const publicKey = await this.getPublicKey();
    
    // Remove o prefixo 0x04 (uncompressed public key marker) se presente
    const publicKeyBytes = publicKey.startsWith('04') ? publicKey.slice(2) : publicKey;
    
    // Calcula o hash Keccak256 da chave pública
    const hash = ethers.keccak256('0x' + publicKeyBytes);
    
    // Pega os últimos 20 bytes (40 caracteres hex) como endereço
    this.cachedAddress = ethers.getAddress('0x' + hash.slice(-40));
    
    return this.cachedAddress;
  }

  /**
   * Obtém a chave pública do KMS
   */
  async getPublicKey(): Promise<string> {
    if (this.cachedPublicKey) {
      return this.cachedPublicKey;
    }

    const command = new GetPublicKeyCommand({
      KeyId: this.keyId,
    });

    const response = await this.kmsClient.send(command);
    
    if (!response.PublicKey) {
      throw new Error('Failed to get public key from KMS');
    }

    // Converte a chave pública para hex (remove o header DER)
    const publicKeyBuffer = Buffer.from(response.PublicKey);
    
    // Para chaves ECC_SECG_P256K1, a chave pública está nos últimos 65 bytes
    // (1 byte de prefixo 0x04 + 32 bytes X + 32 bytes Y)
    const publicKeyHex = publicKeyBuffer.slice(-65).toString('hex');
    
    this.cachedPublicKey = publicKeyHex;
    return publicKeyHex;
  }

  /**
   * Assina o hash de uma transação usando KMS
   * @param messageHash - Hash da mensagem a ser assinado (32 bytes)
   * @returns Assinatura no formato {r, s, v}
   */
  async signHash(messageHash: string): Promise<{ r: string; s: string; v: number }> {
    console.log('[KMS] Signing hash:', messageHash);
    
    // Remove o prefixo 0x se presente
    const hashHex = messageHash.startsWith('0x') ? messageHash.slice(2) : messageHash;
    const messageBuffer = Buffer.from(hashHex, 'hex');

    if (messageBuffer.length !== 32) {
      throw new Error('Message hash must be 32 bytes');
    }

    const command = new SignCommand({
      KeyId: this.keyId,
      Message: messageBuffer,
      MessageType: 'DIGEST', // Estamos passando o hash diretamente
      SigningAlgorithm: 'ECDSA_SHA_256', // KMS usa SHA256 com ECDSA para secp256k1
    });

    const response = await this.kmsClient.send(command);

    if (!response.Signature) {
      throw new Error('Failed to sign with KMS');
    }

    // Parse da assinatura DER
    const signature = this.parseDERSignature(Buffer.from(response.Signature));
    console.log('[KMS] Parsed signature - r:', signature.r, 's:', signature.s);

    // Calcula o recovery ID (v) para Ethereum
    const v = await this.calculateRecoveryId(messageHash, signature);

    return {
      r: signature.r,
      s: signature.s,
      v,
    };
  }

  /**
   * Assina uma transação Ethereum usando KMS
   */
  async signTransaction(transaction: ethers.TransactionLike): Promise<string> {
    console.log('[KMS] Received transaction to sign:', {
      to: transaction.to,
      dataLength: transaction.data?.length || 0,
      value: transaction.value,
      nonce: transaction.nonce,
      gasLimit: transaction.gasLimit,
      type: transaction.type
    });

    // Serializa a transação sem a assinatura
    const unsignedTx = ethers.Transaction.from(transaction);
    
    console.log('[KMS] Unsigned transaction created:', {
      to: unsignedTx.to,
      dataLength: unsignedTx.data?.length || 0,
      type: unsignedTx.type
    });

    const txHash = unsignedTx.unsignedHash;

    // Assina o hash
    const signature = await this.signHash(txHash);

    // Aplica a assinatura à transação
    unsignedTx.signature = ethers.Signature.from({
      r: '0x' + signature.r,
      s: '0x' + signature.s,
      v: signature.v,
    });

    console.log('[KMS] Transaction signed, serializing...');
    const serialized = unsignedTx.serialized;
    console.log('[KMS] Serialized length:', serialized.length);

    // Retorna a transação serializada e assinada
    return serialized;
  }

  /**
   * Parse de assinatura DER retornada pelo KMS
   */
  private parseDERSignature(derSignature: Buffer): { r: string; s: string } {
    let offset = 0;

    // Verifica se é uma sequência DER
    if (derSignature[offset++] !== 0x30) {
      throw new Error('Invalid DER signature');
    }

    // Pula o tamanho total
    offset++;

    // Parse R
    if (derSignature[offset++] !== 0x02) {
      throw new Error('Invalid DER signature - R');
    }
    
    let rLength = derSignature[offset++];
    let r = derSignature.slice(offset, offset + rLength);
    offset += rLength;

    // Remove padding zero se presente
    if (r[0] === 0x00) {
      r = r.slice(1);
    }

    // Parse S
    if (derSignature[offset++] !== 0x02) {
      throw new Error('Invalid DER signature - S');
    }
    
    let sLength = derSignature[offset++];
    let s = derSignature.slice(offset, offset + sLength);

    // Remove padding zero se presente
    if (s[0] === 0x00) {
      s = s.slice(1);
    }

    // Garante que R e S tenham 32 bytes (pad com zeros à esquerda se necessário)
    let rHex = r.toString('hex').padStart(64, '0');
    let sHex = s.toString('hex').padStart(64, '0');

    // Normaliza S para garantir que está na metade inferior da curva (low-s)
    // secp256k1 order / 2
    const secp256k1N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
    const secp256k1halfN = secp256k1N / 2n;
    
    let sBigInt = BigInt('0x' + sHex);
    
    // Se s está na metade superior, inverte para a metade inferior
    if (sBigInt > secp256k1halfN) {
      sBigInt = secp256k1N - sBigInt;
      sHex = sBigInt.toString(16).padStart(64, '0');
    }

    return { r: rHex, s: sHex };
  }

  /**
   * Calcula o recovery ID (v) para a assinatura Ethereum
   */
  private async calculateRecoveryId(
    messageHash: string,
    signature: { r: string; s: string },
  ): Promise<number> {
    const address = await this.getAddress();
    
    // Normaliza o hash (adiciona 0x se não tiver)
    const normalizedHash = messageHash.startsWith('0x') ? messageHash : '0x' + messageHash;
    
    // Tenta v = 27 e v = 28
    for (const v of [27, 28]) {
      try {
        const sig = ethers.Signature.from({
          r: '0x' + signature.r,
          s: '0x' + signature.s,
          v,
        });

        const recoveredAddress = ethers.recoverAddress(normalizedHash, sig);

        if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
          console.log(`[KMS] Recovery ID found: v=${v} for address ${address}`);
          return v;
        }
      } catch (error) {
        console.warn(`[KMS] Recovery failed for v=${v}:`, (error as any).message);
        continue;
      }
    }

    console.error('[KMS] Failed to calculate recovery ID');
    console.error('[KMS] Expected address:', address);
    console.error('[KMS] Message hash:', normalizedHash);
    console.error('[KMS] Signature r:', signature.r);
    console.error('[KMS] Signature s:', signature.s);
    
    throw new Error('Failed to calculate recovery ID');
  }
}
