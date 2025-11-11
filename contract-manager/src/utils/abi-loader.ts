import { ethers, id } from 'ethers';
import { AbiService } from '../abi/abi.service';

/**
 * @param contractName Endereço ou nome do contrato
 */
export async function loadAbi(contractName: string): Promise<any> {

  const abiService = new AbiService();
  const items = await abiService.getAbis(contractName);

  if (items && items.length > 0) {
    const first = items[0] as any;
    const abi = typeof first.abi === 'string' ? JSON.parse(first.abi) : first.abi;
    return {id: first.id, abi};
  }
}

/**
 * Retorna um objeto Contract do ethers.js
 * 
 * @param contractAddress Endereço do contrato
 * @param abi ABI do contrato
 * @param signerOrProvider Pode ser um Signer (para transações) ou Provider (apenas leitura)
 */
// `getContract` has been migrated to `ContractService`.
// Keep this file focused on ABI loading only.
