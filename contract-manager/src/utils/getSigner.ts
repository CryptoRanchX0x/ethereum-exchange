import { ethers } from 'ethers';

export function getSigner(providerUrl: string): ethers.Wallet {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not defined in .env');
  }

  const provider = new ethers.JsonRpcProvider(providerUrl);
  return new ethers.Wallet(privateKey, provider);
}
