import React, { useEffect, useState } from 'react';
import { contractAdapter } from '../services/contractAdapter';
import { Counts } from '../types/schema';
import { STUDIONET_CONFIG, IS_CONTRACT_CONFIGURED } from '../config';

export const HeaderSpecSheet: React.FC = () => {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    if (!IS_CONTRACT_CONFIGURED) return;

    let active = true;
    const refreshCounts = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const next = await contractAdapter.getCounts();
        if (active) setCounts(next);
      } catch {
        // Preserve the last confirmed snapshot. A later focus, successful chain
        // read, or the bounded interval will recover without showing fake data.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshCounts();
    };
    const intervalId = window.setInterval(() => void refreshCounts(), 30_000);

    void refreshCounts();
    window.addEventListener('focus', refreshCounts);
    window.addEventListener('retraction:chain-state', refreshCounts);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshCounts);
      window.removeEventListener('retraction:chain-state', refreshCounts);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return (
    <header className="spec-header">
      <div className="spec-grid">
        <div className="spec-cell">
          <span className="spec-label">Network / Chain ID</span>
          <span className="spec-val">{STUDIONET_CONFIG.name} ({STUDIONET_CONFIG.chainId})</span>
        </div>
        <div className="spec-cell">
          <span className="spec-label">Registered Proposals</span>
          <span className="spec-val">{counts?.proposals ?? '—'}</span>
        </div>
        <div className="spec-cell">
          <span className="spec-label">Registered Dependencies</span>
          <span className="spec-val">{counts?.dependencies ?? '—'}</span>
        </div>
        <div className="spec-cell">
          <span className="spec-label">Consensus Protocol</span>
          <span className="spec-val">GenVM Policy V1</span>
        </div>
      </div>
    </header>
  );
};
