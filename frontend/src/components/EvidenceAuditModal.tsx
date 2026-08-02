import React, { useEffect, useRef } from 'react';
import { X, ExternalLink, ShieldCheck, AlertOctagon } from 'lucide-react';
import { DependencyHistory } from '../types/schema';

interface Props {
  history: DependencyHistory | null;
  onClose: () => void;
}

export const EvidenceAuditModal: React.FC<Props> = ({ history, onClose }) => {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    closeButton.current?.focus();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!history) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="audit-modal-title">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="audit-modal-title" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>
            Policy V1 Audit Drawer · Dep #{history.dependencyId}
          </h2>
          <button ref={closeButton} className="btn btn-secondary" style={{ padding: 4 }} onClick={onClose} aria-label="Close Audit Modal">
            <X size={18} />
          </button>
        </div>

        {history.acceptedEvaluations.length === 0 && !history.latestRejectedTrigger ? (
          <p style={{ color: 'var(--color-ink-muted)' }}>No audit evaluation records found for this dependency.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {history.latestRejectedTrigger && (
              <div style={{ padding: 'var(--space-sm)', border: '1px solid var(--color-invalid)', borderRadius: 4, backgroundColor: 'oklch(0.98 0.02 25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--color-invalid)', fontSize: '0.85rem' }}>
                  <AlertOctagon size={16} />
                  <span>LATEST REJECTED TRIGGER (Round #{history.latestRejectedTrigger.reviewRound})</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', marginTop: 4 }}>
                  <div>Notice DOI: {history.latestRejectedTrigger.noticeDoi}</div>
                  <div>Rejection Code: <strong>{history.latestRejectedTrigger.rejectionCode}</strong></div>
                </div>
              </div>
            )}

            {history.acceptedEvaluations.map((ev, idx) => (
              <div key={idx} style={{ border: '1px solid var(--color-paper-3)', borderRadius: 6, padding: 'var(--space-sm)', backgroundColor: 'var(--color-paper-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className={`chip chip-${ev.verdict.toLowerCase()}`}>
                    <ShieldCheck size={12} /> {ev.verdict}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                    Round #{ev.reviewRound} · Policy v{ev.policyVersion}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', marginBottom: 8, lineHeight: 1.4 }}>
                  <strong>Reason Summary:</strong> {ev.reasonSummary}
                </div>

                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-ink-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  <div>Update Kind: {ev.updateKind}</div>
                  <div>Binding Status: {ev.bindingStatus}</div>
                  <div>Material Effect: {ev.materialEffect}</div>
                  <div>Reason Code: {ev.reasonCode}</div>
                </div>

                <div className="evidence-links">
                  <a href={`https://doi.org/${ev.originalDoi}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span>Original Paper</span> <ExternalLink size={12} />
                  </a>
                  <a href={`https://doi.org/${ev.noticeDoi}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span>Candidate Notice</span> <ExternalLink size={12} />
                  </a>
                  <a href={`https://api.crossref.org/works/${ev.noticeDoi}`} target="_blank" rel="noreferrer">
                    Crossref record <ExternalLink size={12} />
                  </a>
                  <a href={`https://pubmed.ncbi.nlm.nih.gov/${ev.noticePmid}/`} target="_blank" rel="noreferrer">
                    PubMed notice <ExternalLink size={12} />
                  </a>
                  <a href={`https://www.ebi.ac.uk/europepmc/webservices/rest/${ev.noticePmcid}/fullTextXML`} target="_blank" rel="noreferrer">
                    Europe PMC XML <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
