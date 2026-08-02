import { useEffect, useState } from 'react';
import { contractAdapter } from '../services/contractAdapter';

export const WALLET_EVENT = 'retraction:wallet';

export function useWalletAccount(): string | null {
  const [account, setAccount] = useState<string | null>(contractAdapter.getConnectedAccount());

  useEffect(() => {
    let active = true;
    const onWallet = (event: Event) => {
      const address = (event as CustomEvent<string>).detail;
      if (active) setAccount(address || null);
    };

    window.addEventListener(WALLET_EVENT, onWallet);
    contractAdapter
      .restoreWallet()
      .then((address) => {
        if (active) setAccount(address);
      })
      .catch(() => {
        if (active) setAccount(null);
      });

    return () => {
      active = false;
      window.removeEventListener(WALLET_EVENT, onWallet);
    };
  }, []);

  return account;
}
