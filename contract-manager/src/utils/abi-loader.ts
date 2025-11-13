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