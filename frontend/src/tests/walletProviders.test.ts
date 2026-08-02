import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  discoverWalletProviders,
  Eip1193Provider,
  ensureMetaMaskGenLayerSnap,
  ensureStudionet,
  normalizeWalletAddress,
  retryStudionetCapacity,
  withStudionetWalletCompatibility,
} from '../services/walletProviders';

function providerWith(request: Eip1193Provider['request']): Eip1193Provider {
  return { request };
}

describe('multi-wallet provider integration', () => {
  afterEach(() => {
    delete (window as Window & { ethereum?: Eip1193Provider }).ethereum;
    vi.restoreAllMocks();
  });

  it('normalizes lowercase wallet accounts to the EIP-55 form used by owner indexes', () => {
    expect(normalizeWalletAddress('0x5d598f10a428fb2039edbc3ace83351650b286e0'))
      .toBe('0x5D598f10a428fB2039edbC3aCE83351650B286E0');
  });

  it('rejects malformed wallet accounts before contract reads or writes', () => {
    expect(() => normalizeWalletAddress('0x1234')).toThrow(/invalid address/i);
  });

  it('discovers an EIP-6963 provider with its announced identity', async () => {
    const provider = providerWith(vi.fn());
    const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: {
        info: {
          uuid: 'rabby-uuid',
          name: 'Rabby Wallet',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
          rdns: 'io.rabby',
        },
        provider,
      },
    }));
    window.addEventListener('eip6963:requestProvider', announce, { once: true });

    const wallets = await discoverWalletProviders(0);

    expect(wallets).toHaveLength(1);
    expect(wallets[0]).toMatchObject({ id: 'eip6963:rabby-uuid', name: 'Rabby Wallet', rdns: 'io.rabby' });
    expect(wallets[0].provider).toBe(provider);
  });

  it('falls back to and deduplicates legacy injected providers', async () => {
    const metamask = Object.assign(providerWith(vi.fn()), { isMetaMask: true });
    const rabby = Object.assign(providerWith(vi.fn()), { isRabby: true });
    (window as Window & { ethereum?: Eip1193Provider }).ethereum = Object.assign(metamask, {
      providers: [metamask, rabby, metamask],
    });

    const wallets = await discoverWalletProviders(0);

    expect(wallets.map((wallet) => wallet.name)).toEqual(['MetaMask', 'Rabby Wallet']);
  });

  it('deduplicates repeated EIP-6963 announcements and the legacy wrapper by wallet identity', async () => {
    const backpackOne = Object.assign(providerWith(vi.fn()), { isBackpack: true });
    const backpackTwo = Object.assign(providerWith(vi.fn()), { isBackpack: true });
    const metamaskEip = Object.assign(providerWith(vi.fn()), { isMetaMask: true });
    const metamaskLegacy = Object.assign(providerWith(vi.fn()), { isMetaMask: true });
    (window as Window & { ethereum?: Eip1193Provider }).ethereum = metamaskLegacy;

    const announce = () => {
      [
        { uuid: 'backpack-1', name: 'Backpack', rdns: 'app.backpack', provider: backpackOne },
        { uuid: 'backpack-2', name: 'Backpack', rdns: 'app.backpack', provider: backpackTwo },
        { uuid: 'metamask-1', name: 'MetaMask', rdns: 'io.metamask', provider: metamaskEip },
      ].forEach(({ provider, ...info }) => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
        detail: { info: { ...info, icon: '' }, provider },
      })));
    };
    window.addEventListener('eip6963:requestProvider', announce, { once: true });

    const wallets = await discoverWalletProviders(0);

    expect(wallets.map((wallet) => wallet.name)).toEqual(['Backpack', 'MetaMask']);
    expect(wallets.map((wallet) => wallet.id)).toEqual(['eip6963:backpack-1', 'eip6963:metamask-1']);
  });

  it('does not issue network mutation requests when already on Studionet', async () => {
    const request = vi.fn().mockResolvedValue('0xf22f');

    await ensureStudionet(providerWith(request));

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith({ method: 'eth_chainId' });
  });

  it('adds Studionet after an unknown-chain response and verifies the final chain', async () => {
    let chainId = '0x1';
    const methods: string[] = [];
    const request = vi.fn(async ({ method }: { method: string }) => {
      methods.push(method);
      if (method === 'eth_chainId') return chainId;
      if (method === 'wallet_switchEthereumChain' && chainId !== '0xf22f') {
        const error = new Error('Unknown chain') as Error & { code: number };
        error.code = 4902;
        throw error;
      }
      if (method === 'wallet_addEthereumChain') {
        chainId = '0xf22f';
        return null;
      }
      return null;
    });

    await ensureStudionet(providerWith(request));

    expect(methods).toEqual([
      'eth_chainId',
      'wallet_switchEthereumChain',
      'wallet_addEthereumChain',
      'wallet_switchEthereumChain',
      'eth_chainId',
    ]);
  });

  it('surfaces an explicit error when the user rejects a network switch', async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'eth_chainId') return '0x1';
      const error = new Error('Rejected') as Error & { code: number };
      error.code = 4001;
      throw error;
    });

    await expect(ensureStudionet(providerWith(request))).rejects.toThrow(/network switch was rejected/i);
  });

  it('requests the GenLayer Snap only when MetaMask does not already have it', async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'wallet_getSnaps') return {};
      return null;
    });

    await ensureMetaMaskGenLayerSnap(providerWith(request));

    expect(request).toHaveBeenCalledWith({
      method: 'wallet_requestSnaps',
      params: { 'npm:genlayer-wallet-plugin': {} },
    });
  });

  it('replaces Studionet zero gas price for wallet-facing fee estimation', async () => {
    const request = vi.fn().mockResolvedValue('0x0');
    const compatible = withStudionetWalletCompatibility(providerWith(request));

    await expect(compatible.request({ method: 'eth_gasPrice' })).resolves.toBe('0x3b9aca00');
  });

  it('adds a non-zero legacy gas price before requesting an EIP-1193 signature', async () => {
    const request = vi.fn().mockResolvedValue('0xhash');
    const compatible = withStudionetWalletCompatibility(providerWith(request));

    await compatible.request({
      method: 'eth_sendTransaction',
      params: [{ from: '0xabc', gasPrice: '0x0', type: '0x0' }],
    });

    expect(request).toHaveBeenCalledWith({
      method: 'eth_sendTransaction',
      params: [{ from: '0xabc', gasPrice: '0x3b9aca00', type: '0x0' }],
    });
  });

  it('retries only an explicit Studionet execution-slot capacity rejection', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Version of JSON-RPC protocol is not supported. Details: Server busy: all 8 execution slots occupied, retry later'))
      .mockResolvedValue('0xhash');

    await expect(retryStudionetCapacity(operation, [0])).resolves.toBe('0xhash');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry wallet rejection or unknown send failures', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('User denied request signature'));

    await expect(retryStudionetCapacity(operation, [0, 0])).rejects.toThrow('User denied');
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
