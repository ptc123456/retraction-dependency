import React, { useState } from 'react';
import { NavLink } from '../lib/router';
import { Database, PlusCircle, History, BookOpen, FileText, Wallet, Menu, X } from 'lucide-react';
import { contractAdapter } from '../services/contractAdapter';
import { useWalletAccount } from '../hooks/useWalletAccount';

interface WalletChoice {
  id: string;
  name: string;
  icon?: string;
}

export const SideRailNav: React.FC = () => {
  const account = useWalletAccount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [walletChoices, setWalletChoices] = useState<WalletChoice[]>([]);

  const connectSelectedWallet = async (walletId?: string) => {
    setWalletError(null);
    setConnecting(true);
    try {
      await contractAdapter.connectWallet(walletId);
      setWalletChoices([]);
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Wallet connection failed.');
    } finally {
      setConnecting(false);
    }
  };

  const handleConnect = async () => {
    setWalletError(null);
    setConnecting(true);
    try {
      const wallets = await contractAdapter.getAvailableWallets();
      if (wallets.length === 0) {
        throw new Error('No browser wallet detected. Install or enable an EIP-1193 wallet extension, then reload this page.');
      }
      if (wallets.length === 1) {
        await contractAdapter.connectWallet(wallets[0].id);
      } else {
        setWalletChoices(wallets);
      }
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Wallet discovery failed.');
    } finally {
      setConnecting(false);
    }
  };

  const navItems = [
    { to: '/', label: 'Registry Index', icon: Database },
    { to: '/proposals/new', label: 'New Proposal', icon: PlusCircle },
    { to: '/activity', label: 'Activity Ledger', icon: History },
    { to: '/guide', label: 'Project Guide', icon: FileText },
    { to: '/methodology', label: 'Evidence Policy V1', icon: BookOpen },
  ];

  return (
    <>
      <div className="mobile-nav-toggle">
        <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>
          RetractionDependency
        </span>
        <button
          className="btn btn-secondary"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <aside className={`side-rail ${mobileOpen ? 'mobile-show' : ''}`}>
        <div>
          <div className="brand-block">
            <h1 className="brand-title">RetractionDependency</h1>
            <div className="brand-subtitle">Research Literature Auditor</div>
          </div>

          <nav className="nav-links" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="wallet-box">
          <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)', marginBottom: 4 }}>
            STUDIONET WALLET
          </div>
          {account ? (
            <div style={{ wordBreak: 'break-all', fontWeight: 600, color: 'var(--color-accent)' }}>
              {account.slice(0, 8)}...{account.slice(-6)}
            </div>
          ) : (
            <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.8rem', padding: '6px 10px' }} onClick={handleConnect} disabled={connecting}>
              <Wallet size={14} />
              <span>{connecting ? 'Connecting…' : 'Connect Wallet'}</span>
            </button>
          )}
          {walletError && <div className="wallet-error" role="alert">{walletError}</div>}
        </div>
      </aside>

      {walletChoices.length > 0 && (
        <div className="wallet-dialog-backdrop" role="presentation" onMouseDown={() => setWalletChoices([])}>
          <section
            className="wallet-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="wallet-dialog-heading">
              <div>
                <div className="eyebrow">AVAILABLE PROVIDERS</div>
                <h2 id="wallet-dialog-title">Choose a wallet</h2>
              </div>
              <button className="icon-button" onClick={() => setWalletChoices([])} aria-label="Close wallet chooser">
                <X size={18} />
              </button>
            </div>
            <div className="wallet-choice-list">
              {walletChoices.map((wallet) => (
                <button
                  className="wallet-choice"
                  key={wallet.id}
                  onClick={() => connectSelectedWallet(wallet.id)}
                  disabled={connecting}
                >
                  {wallet.icon ? <img src={wallet.icon} alt="" width="28" height="28" /> : <Wallet size={24} aria-hidden="true" />}
                  <span>{wallet.name}</span>
                </button>
              ))}
            </div>
            {walletError && <div className="wallet-error" role="alert">{walletError}</div>}
            <p className="wallet-dialog-note">Supports installed EIP-6963 and EIP-1193 EVM wallets on GenLayer Studionet.</p>
          </section>
        </div>
      )}
    </>
  );
};
