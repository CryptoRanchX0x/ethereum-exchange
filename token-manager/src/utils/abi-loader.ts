import * as fs from 'fs';
import { ethers } from 'ethers';
import * as path from 'path';

export function loadAbi(contractAddress: string): any {
  // normaliza endereço para minúsculo
  const normalizedAddress = contractAddress;

  // constrói o caminho do arquivo JSON
  const abiPath = path.resolve(
    __dirname,
    `../../src/abi/contract-${normalizedAddress}.json`,
  );

  if (!fs.existsSync(abiPath)) {
    throw new Error(`ABI file not found for contract: ${contractAddress}`);
  }

  // lê e retorna o conteúdo JSON
  const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  return abi;
}

/**
 * Retorna um objeto Contract do ethers.js
 * 
 * @param contractAddress Endereço do contrato
 * @param abi ABI do contrato
 * @param signerOrProvider Pode ser um Signer (para transações) ou Provider (apenas leitura)
 */
export function getContract(
  contractAddress: string,
  abi: any,
  signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
  return new ethers.Contract(contractAddress, abi, signerOrProvider);
}
