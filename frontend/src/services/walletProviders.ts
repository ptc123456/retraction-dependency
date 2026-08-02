import { STUDIONET_CONFIG } from '../config';
import { getAddress } from 'viem';

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
  providers?: Eip1193Provider[];
  isMetaMask?: boolean;
  isRabby?: boolean;
  isCoinbaseWallet?: boolean;
  isBackpack?: boolean;
}

interface Eip6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface Eip6963ProviderDetail {
  info: Eip6963ProviderInfo;
  provider: Eip1193Provider;
}

export interface WalletOption {
  id: string;
  name: string;
  icon?: string;
  rdns?: string;
  provider: Eip1193Provider;
  isMetaMask: boolean;
}

type EthereumWindow = Window & { ethereum?: Eip1193Provider };

const DISCOVERY_WINDOW_MS = 120;
const STUDIONET_WALLET_GAS_PRICE = '0x3b9aca00'; // 1 gwei; RPC currently reports zero.
const STUDIONET_CAPACITY_RETRY_DELAYS_MS = [3_000, 5_000, 8_000, 13_000, 21_000] as const;

function providerErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isStudionetCapacityError(error: unknown): boolean {
  const message = providerErrorMessage(error).toLowerCase();
  return message.includes('server busy')
    && message.includes('execution slots occupied')
    && message.includes('retry later');
}

/** Retry only an explicit pre-acceptance capacity rejection; never retry wallet rejection or an unknown send error. */
export async function retryStudionetCapacity<T>(
  operation: () => Promise<T>,
  retryDelaysMs: readonly number[] = STUDIONET_CAPACITY_RETRY_DELAYS_MS,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isStudionetCapacityError(error) || attempt >= retryDelaysMs.length) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, retryDelaysMs[attempt]));
    }
  }
}

/**
 * GenLayer contract owner indexes are string keyed, so the same EVM address
 * must always be represented consistently across wallets and contract reads.
 */
export function normalizeWalletAddress(address: string): `0x${string}` {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error('Wallet returned an invalid address.');
  return getAddress(address);
}

function providerName(provider: Eip1193Provider): string {
  if (provider.isRabby) return 'Rabby Wallet';
  if (provider.isCoinbaseWallet) return 'Coinbase Wallet';
  if (provider.isBackpack) return 'Backpack';
  if (provider.isMetaMask) return 'MetaMask';
  return 'Browser Wallet';
}

function providerRdns(provider: Eip1193Provider): string | undefined {
  if (provider.isRabby) return 'io.rabby';
  if (provider.isCoinbaseWallet) return 'com.coinbase.wallet';
  if (provider.isBackpack) return 'app.backpack';
  if (provider.isMetaMask) return 'io.metamask';
  return undefined;
}

function identityKey(name: string, rdns?: string): string {
  const normalizedRdns = rdns?.trim().toLowerCase();
  if (normalizedRdns) return `rdns:${normalizedRdns}`;
  return `name:${name.trim().toLowerCase()}`;
}

function isMetaMaskProvider(provider: Eip1193Provider, rdns?: string): boolean {
  if (rdns) return rdns === 'io.metamask';
  return provider.isMetaMask === true && provider.isRabby !== true && provider.isCoinbaseWallet !== true;
}

function errorCode(error: unknown): number | null {
  if (!error || typeof error !== 'object' || !('code' in error)) return null;
  const value = (error as { code?: unknown }).code;
  return typeof value === 'number' ? value : null;
}

function normalizeChainId(chainId: unknown): string {
  return String(chainId).toLowerCase();
}

function isZeroHex(value: unknown): boolean {
  return typeof value === 'string' && /^0x0+$/i.test(value);
}

/**
 * Browser wallets may wait forever when Studionet's RPC reports a zero gas
 * price. Keep RPC reads unchanged except for the wallet-facing fee quote and
 * ensure the legacy transaction sent for signing carries a small non-zero
 * price. The signed transaction still goes through the selected provider.
 */
export function withStudionetWalletCompatibility(provider: Eip1193Provider): Eip1193Provider {
  const requestWithCapacityRetry = (args: Parameters<Eip1193Provider['request']>[0]) =>
    retryStudionetCapacity(() => provider.request(args));

  return {
    request: async (args) => {
      if (args.method === 'eth_gasPrice') {
        const result = await requestWithCapacityRetry(args);
        return isZeroHex(result) ? STUDIONET_WALLET_GAS_PRICE : result;
      }

      if (args.method === 'eth_sendTransaction' && Array.isArray(args.params)) {
        const [first, ...rest] = args.params;
        if (first && typeof first === 'object' && !Array.isArray(first)) {
          const transaction = { ...(first as Record<string, unknown>) };
          if (transaction.gasPrice === undefined || isZeroHex(transaction.gasPrice)) {
            transaction.gasPrice = STUDIONET_WALLET_GAS_PRICE;
          }
          return requestWithCapacityRetry({ ...args, params: [transaction, ...rest] });
        }
      }

      return requestWithCapacityRetry(args);
    },
    on: provider.on?.bind(provider),
    removeListener: provider.removeListener?.bind(provider),
  };
}

function addLegacyProviders(
  options: WalletOption[],
  seenProviders: Set<Eip1193Provider>,
  seenIdentities: Set<string>,
): void {
  if (typeof window === 'undefined') return;
  const injected = (window as EthereumWindow).ethereum;
  if (!injected) return;

  const candidates = Array.isArray(injected.providers) && injected.providers.length > 0
    ? injected.providers
    : [injected];

  candidates.forEach((provider, index) => {
    if (seenProviders.has(provider)) return;
    const name = providerName(provider);
    const rdns = providerRdns(provider);
    const identity = identityKey(name, rdns);
    if (seenIdentities.has(identity)) return;
    seenProviders.add(provider);
    seenIdentities.add(identity);
    options.push({
      id: `legacy:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}:${index}`,
      name,
      rdns,
      provider,
      isMetaMask: isMetaMaskProvider(provider, rdns),
    });
  });
}

/** Discover modern EIP-6963 providers and retain the legacy window.ethereum fallback. */
export async function discoverWalletProviders(timeoutMs = DISCOVERY_WINDOW_MS): Promise<WalletOption[]> {
  if (typeof window === 'undefined') return [];

  const options: WalletOption[] = [];
  const seenProviders = new Set<Eip1193Provider>();
  const seenIdentities = new Set<string>();
  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
    if (!detail?.provider || !detail.info || seenProviders.has(detail.provider)) return;
    const name = detail.info.name || providerName(detail.provider);
    const identity = identityKey(name, detail.info.rdns);
    if (seenIdentities.has(identity)) return;
    seenProviders.add(detail.provider);
    seenIdentities.add(identity);
    options.push({
      id: `eip6963:${detail.info.uuid}`,
      name,
      icon: detail.info.icon,
      rdns: detail.info.rdns,
      provider: detail.provider,
      isMetaMask: isMetaMaskProvider(detail.provider, detail.info.rdns),
    });
  };

  window.addEventListener('eip6963:announceProvider', onAnnounce as EventListener);
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  if (timeoutMs > 0) await new Promise((resolve) => window.setTimeout(resolve, timeoutMs));
  window.removeEventListener('eip6963:announceProvider', onAnnounce as EventListener);
  addLegacyProviders(options, seenProviders, seenIdentities);
  return options;
}

export async function ensureStudionet(provider: Eip1193Provider): Promise<void> {
  let chainId = normalizeChainId(await provider.request({ method: 'eth_chainId' }));
  if (chainId === STUDIONET_CONFIG.chainHex) return;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CONFIG.chainHex }],
    });
  } catch (error) {
    if (errorCode(error) === 4001) throw new Error('Wallet network switch was rejected.');
    if (errorCode(error) !== 4902) {
      throw new Error(`Wallet could not switch to ${STUDIONET_CONFIG.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: STUDIONET_CONFIG.chainHex,
        chainName: STUDIONET_CONFIG.name,
        nativeCurrency: { name: 'GEN Token', symbol: 'GEN', decimals: 18 },
        rpcUrls: [STUDIONET_CONFIG.rpcUrl],
        blockExplorerUrls: [STUDIONET_CONFIG.explorerUrl],
      }],
    });
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CONFIG.chainHex }],
    });
  }

  chainId = normalizeChainId(await provider.request({ method: 'eth_chainId' }));
  if (chainId !== STUDIONET_CONFIG.chainHex) {
    throw new Error(`Wrong wallet chain. Expected Studionet ${STUDIONET_CONFIG.chainHex}, received ${chainId}.`);
  }
}

/** MetaMask needs the GenLayer Snap; other EIP-1193 wallets must not receive MetaMask-only RPCs. */
export async function ensureMetaMaskGenLayerSnap(provider: Eip1193Provider): Promise<void> {
  const snapId = 'npm:genlayer-wallet-plugin';
  const installed = await provider.request({ method: 'wallet_getSnaps' }) as Record<string, { id?: string }>;
  if (Object.values(installed ?? {}).some((snap) => snap.id === snapId)) return;
  await provider.request({
    method: 'wallet_requestSnaps',
    params: { [snapId]: {} },
  });
}
