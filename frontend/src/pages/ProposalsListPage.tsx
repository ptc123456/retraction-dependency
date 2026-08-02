import React, { useEffect, useState } from 'react';
import { Link } from '../lib/router';
import { Plus, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { contractAdapter } from '../services/contractAdapter';
import { Proposal } from '../types/schema';
import { IS_CONTRACT_CONFIGURED } from '../config';
import { useWalletAccount } from '../hooks/useWalletAccount';

export const ProposalsListPage: React.FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');
  const [ownerOnly, setOwnerOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const account = useWalletAccount();

  const loadData = async () => {
    if (!IS_CONTRACT_CONFIGURED) return;
    setLoading(true);
    setError(null);
    try {
      const res = await contractAdapter.listProposals(0, 20);
      setProposals(res.items);
    } catch (loadError) {
      setProposals([]);
      setError(loadError instanceof Error ? loadError.message : 'Could not read proposal index.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProposals = proposals.filter((p) => {
    if (ownerOnly && (!account || p.owner.toLowerCase() !== account.toLowerCase())) return false;
    return filter === 'ALL' || p.status === filter;
  });

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
        <div>
          <h1 className="page-title">Research Proposal Registry Index</h1>
          <p className="page-subtitle">
            A narrow Policy V1 registry where GenLayer validators bind correction or retraction notices to frozen literature dependencies, then enforce the resulting proposal gate on-chain.
          </p>
          <p className="permission-note">This product does not determine misconduct, fraud, legal liability, or medical truth.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2xs)' }}>
          <button className="btn btn-secondary" onClick={loadData} disabled={loading || !IS_CONTRACT_CONFIGURED}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link to="/proposals/new" className="btn btn-primary">
            <Plus size={16} />
            <span>Create Proposal</span>
          </Link>
        </div>
      </div>

      {error && <div className="form-error notice-panel" role="alert">{error}</div>}

      <div className="fixture-launcher">
        <strong>Real public demo fixtures</strong>
        <span>Open the create form, then choose Fixture A, B, or C. Templates are inputs—not precomputed chain results.</span>
        <Link to="/proposals/new" className="btn btn-secondary">Open fixture launcher</Link>
      </div>

      <div className="filter-row">
        {['ALL', 'DRAFT', 'EVIDENCE_HOLD', 'ELIGIBLE', 'ACTIVE', 'INVALIDATED'].map((status) => (
          <button
            key={status}
            className={`btn ${filter === status ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '4px 10px' }}
            onClick={() => setFilter(status)}
          >
            {status}
          </button>
        ))}
        <label className="owner-filter">
          <input type="checkbox" checked={ownerOnly} onChange={(event) => setOwnerOnly(event.target.checked)} disabled={!account} />
          My proposals
        </label>
      </div>

      <div className="data-table-container">
        {loading ? (
          <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--color-ink-muted)' }}>
            Loading proposals from Studionet contract...
          </div>
        ) : filteredProposals.length === 0 ? (
          <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--color-ink-muted)' }}>
            {IS_CONTRACT_CONFIGURED
              ? 'No proposals found in current registry index.'
              : 'Contract not configured. Displaying empty registry index.'}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Proposal Title</th>
                <th>Status</th>
                <th>Dependencies</th>
                <th>Invalidated</th>
                <th>Owner</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#{p.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.title}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-ink-muted)', maxWidth: '50ch', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.claimText}
                    </div>
                  </td>
                  <td>
                    <span className={`chip chip-${p.status.toLowerCase()}`}>
                      <ShieldCheck size={12} /> {p.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{p.totalDependencies}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: p.invalidDependencies > 0 ? 'var(--color-invalid)' : 'inherit' }}>
                    {p.invalidDependencies}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {p.owner.slice(0, 6)}...{p.owner.slice(-4)}
                  </td>
                  <td>
                    <Link to={`/proposals/${p.id}`} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                      <span>Workspace</span>
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
