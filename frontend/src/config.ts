// Deployment-owned environment contract address reader
// Section 3: Strictly reads VITE_CONTRACT_ADDRESS. Zero fallback to localStorage or sample literals.

type Address = `0x${string}`;

const rawAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
const normalizedAddress = typeof rawAddress === 'string' ? rawAddress.trim() : '';

export const IS_CONTRACT_CONFIGURED =
  /^0x[0-9a-fA-F]{40}$/.test(normalizedAddress) &&
  normalizedAddress.toLowerCase() !== '0x0000000000000000000000000000000000000000';

export const CONTRACT_ADDRESS: Address | '' = IS_CONTRACT_CONFIGURED ? (normalizedAddress as Address) : '';

export function requireContractAddress(): Address {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract not configured — deployment has not occurred.');
  }
  return CONTRACT_ADDRESS;
}

export const STUDIONET_CONFIG = {
  chainId: 61999,
  chainHex: '0xf22f',
  name: 'GenLayer Studionet',
  rpcUrl: 'https://studio.genlayer.com/api',
  explorerUrl: 'https://explorer-studio.genlayer.com',
};
