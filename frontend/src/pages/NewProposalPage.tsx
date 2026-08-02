import React, { useState } from 'react';
import { useNavigate } from '../lib/router';
import { Plus, Trash2, ArrowLeft, Send } from 'lucide-react';
import { contractAdapter } from '../services/contractAdapter';
import { CreateProposalFormSchema } from '../types/schema';
import { IS_CONTRACT_CONFIGURED } from '../config';
import { useWalletAccount } from '../hooks/useWalletAccount';

export const NewProposalPage: React.FC = () => {
  const navigate = useNavigate();
  const account = useWalletAccount();
  const [title, setTitle] = useState('');
  const [claimText, setClaimText] = useState('');
  const [deps, setDeps] = useState<Array<{ originalDoi: string; originalPmid: string; dependencyStatement: string; noticeDoi: string; noticePmid: string }>>([
    { originalDoi: '', originalPmid: '', dependencyStatement: '', noticeDoi: '', noticePmid: '' },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<string[]>([]);

  const populateFixture = (fixtureType: 'A' | 'B' | 'C') => {
    if (fixtureType === 'A') {
      setTitle('SARS-CoV-2 P.1 Genomic Variant Survey');
      setClaimText('Targeted genetic surveillance confirms circulation of P.1 lineage in Northeast Brazil without altered mutation rates.');
      setDeps([
        {
          originalDoi: '10.1371/journal.pntd.0009591',
          originalPmid: '34280196',
          dependencyStatement: 'The study reports genetic evidence that SARS-CoV-2 P.1 variant was circulating in Northeast Brazil.',
          noticeDoi: '10.1371/journal.pntd.0011024',
          noticePmid: '36584006',
        },
      ]);
    } else if (fixtureType === 'B') {
      setTitle('NIRUDAK Clinical Dehydration Scoring Metric');
      setClaimText('The simplified NIRUDAK model accurately stratifies pediatric cholera dehydration severity using non-invasive clinical indicators.');
      setDeps([
        {
          originalDoi: '10.1371/journal.pntd.0009266',
          originalPmid: '33690646',
          dependencyStatement: 'In the simplified NIRUDAK model, five vomiting episodes in 24 hours belongs to the lowest non-reference vomiting bucket.',
          noticeDoi: '10.1371/journal.pntd.0011026',
          noticePmid: '36584025',
        },
      ]);
    } else if (fixtureType === 'C') {
      setTitle('Bpr4 Virulence Regulation Mechanisms');
      setClaimText('Bpr4 transcript factor modulates filamentous hemagglutinin expression during acute Bordetella pertussis pathogenesis.');
      setDeps([
        {
          originalDoi: '10.1126/sciadv.ade8971',
          originalPmid: '36542710',
          dependencyStatement: 'Bpr4 up-regulates filamentous hemagglutinin and contributes to Bordetella pertussis infection.',
          noticeDoi: '10.1126/sciadv.adv4615',
          noticePmid: '39742501',
        },
      ]);
    }
  };

  const handleAddDepSlot = () => {
    if (deps.length >= 5) return;
    setDeps([...deps, { originalDoi: '', originalPmid: '', dependencyStatement: '', noticeDoi: '', noticePmid: '' }]);
  };

  const handleRemoveDepSlot = (idx: number) => {
    if (deps.length <= 1) return;
    setDeps(deps.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validation = CreateProposalFormSchema.safeParse({ title, claimText, dependencies: deps });
    if (!validation.success) {
      setErrorMsg(validation.error.errors[0]?.message || 'Validation error');
      return;
    }

    if (!IS_CONTRACT_CONFIGURED) {
      setErrorMsg('Contract not configured — deployment has not occurred. Writes are disabled.');
      return;
    }
    if (!account) {
      setErrorMsg('Connect a Studionet wallet before submitting the proposal.');
      return;
    }

    setSubmitting(true);
    setProgress([]);
    try {
      await contractAdapter.createProposal(title, claimText);
      setProgress(['Proposal transaction: readback confirmed']);
      const newProposal = await contractAdapter.getLatestOwnerProposal(account);
      if (!newProposal) throw new Error('Proposal finalized, but owner readback did not return the new proposal.');
      const proposalId = newProposal.id;

      for (const [index, d] of deps.entries()) {
        await contractAdapter.addDependency(proposalId, d.originalDoi, d.originalPmid, d.dependencyStatement, d.noticeDoi, d.noticePmid);
        setProgress((items) => [...items, `Dependency ${index + 1}/${deps.length}: readback confirmed`]);
      }

      navigate(`/proposals/${proposalId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Multi-step proposal creation failed';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <button className="btn btn-secondary" style={{ marginBottom: 12 }} onClick={() => navigate('/')}>
          <ArrowLeft size={16} />
          <span>Back to Index</span>
        </button>
        <h1 className="page-title">Create Research Proposal</h1>
        <p className="page-subtitle">
          Submit a new research claim and register underlying publication dependencies for automated verification.
        </p>
      </div>

      <div style={{ padding: 'var(--space-sm)', backgroundColor: 'var(--color-paper-2)', border: '1px solid var(--color-paper-3)', borderRadius: 6, marginBottom: 'var(--space-md)' }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 6 }}>Pre-populate Form Template with Locked Literature Fixtures:</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 8px' }} onClick={() => populateFixture('A')}>
            Fixture A (Usable Correction)
          </button>
          <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 8px' }} onClick={() => populateFixture('B')}>
            Fixture B (Invalidating Correction)
          </button>
          <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 8px' }} onClick={() => populateFixture('C')}>
            Fixture C (Retraction)
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="form-error" style={{ padding: 12, backgroundColor: 'oklch(0.98 0.02 25)', border: '1px solid var(--color-invalid)', borderRadius: 4, marginBottom: 16 }}>
          {errorMsg}
        </div>
      )}
      {progress.length > 0 && (
        <div className="success-panel" role="status" aria-live="polite">
          <strong>Transaction progress</strong>
          <ol>{progress.map((item) => <li key={item}>{item}</li>)}</ol>
          {errorMsg && <p>The confirmed proposal remains a recoverable DRAFT; retry only the missing dependency write.</p>}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="prop-title">Proposal Title *</label>
          <input
            id="prop-title"
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter concise research proposal title (3–120 chars)"
            minLength={3}
            maxLength={120}
            required
          />
          <small>{title.length}/120 characters</small>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="prop-claim">Claim Statement *</label>
          <textarea
            id="prop-claim"
            className="form-textarea"
            rows={3}
            value={claimText}
            onChange={(e) => setClaimText(e.target.value)}
            placeholder="State the core scientific assertion being made (20–2000 chars)"
            minLength={20}
            maxLength={2000}
            required
          />
          <small>{claimText.length}/2000 characters</small>
        </div>

        <div style={{ margin: 'var(--space-lg) 0 var(--space-md) 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', margin: 0 }}>
            Registered Literature Dependencies ({deps.length}/5)
          </h2>
          <button type="button" className="btn btn-secondary" onClick={handleAddDepSlot} disabled={deps.length >= 5}>
            <Plus size={14} />
            <span>Add Dependency Slot</span>
          </button>
        </div>

        {deps.map((d, idx) => (
          <div key={idx} style={{ border: '1px solid var(--color-paper-3)', padding: 'var(--space-md)', borderRadius: 6, marginBottom: 'var(--space-md)', backgroundColor: 'var(--color-paper-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                Dependency #{idx + 1}
              </span>
              {deps.length > 1 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '2px 6px', color: 'var(--color-invalid)' }}
                  onClick={() => handleRemoveDepSlot(idx)}
                  aria-label={`Remove dependency ${idx + 1}`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor={`dependency-${idx}-original-doi`}>Original Paper DOI *</label>
                <input
                  id={`dependency-${idx}-original-doi`}
                  type="text"
                  className="form-input"
                  value={d.originalDoi}
                  onChange={(e) => {
                    const newDeps = [...deps];
                    newDeps[idx].originalDoi = e.target.value;
                    setDeps(newDeps);
                  }}
                  placeholder="e.g. 10.1371/journal.pntd.0009591"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor={`dependency-${idx}-original-pmid`}>Original Paper PMID *</label>
                <input
                  id={`dependency-${idx}-original-pmid`}
                  type="text"
                  className="form-input"
                  value={d.originalPmid}
                  onChange={(e) => {
                    const newDeps = [...deps];
                    newDeps[idx].originalPmid = e.target.value;
                    setDeps(newDeps);
                  }}
                  placeholder="e.g. 34280196"
                  inputMode="numeric"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor={`dependency-${idx}-statement`}>Dependency Statement *</label>
              <textarea
                id={`dependency-${idx}-statement`}
                className="form-textarea"
                rows={2}
                value={d.dependencyStatement}
                onChange={(e) => {
                  const newDeps = [...deps];
                  newDeps[idx].dependencyStatement = e.target.value;
                  setDeps(newDeps);
                }}
                placeholder="Exact claim or finding from this literature dependency relied upon"
                minLength={20}
                maxLength={1000}
                required
              />
              <small>{d.dependencyStatement.length}/1000 characters</small>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor={`dependency-${idx}-notice-doi`}>Initial Notice DOI *</label>
                <input
                  id={`dependency-${idx}-notice-doi`}
                  type="text"
                  className="form-input"
                  value={d.noticeDoi}
                  onChange={(e) => {
                    const newDeps = [...deps];
                    newDeps[idx].noticeDoi = e.target.value;
                    setDeps(newDeps);
                  }}
                  placeholder="e.g. 10.1371/journal.pntd.0011024"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor={`dependency-${idx}-notice-pmid`}>Initial Notice PMID *</label>
                <input
                  id={`dependency-${idx}-notice-pmid`}
                  type="text"
                  className="form-input"
                  value={d.noticePmid}
                  onChange={(e) => {
                    const newDeps = [...deps];
                    newDeps[idx].noticePmid = e.target.value;
                    setDeps(newDeps);
                  }}
                  placeholder="e.g. 36584006"
                  inputMode="numeric"
                  required
                />
              </div>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 'var(--space-lg)' }}>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={submitting || !IS_CONTRACT_CONFIGURED || !account}>
            <Send size={16} />
            <span>{submitting ? 'Submitting Transactions to Studionet...' : 'Submit Proposal & Dependencies'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
