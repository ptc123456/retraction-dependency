import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from '../lib/router';
import {
  AlertOctagon,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  History,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { EvidenceAuditModal } from '../components/EvidenceAuditModal';
import { IS_CONTRACT_CONFIGURED } from '../config';
import { useWalletAccount } from '../hooks/useWalletAccount';
import { contractAdapter } from '../services/contractAdapter';
import {
  Dependency,
  DependencyFormSchema,
  DependencyHistory,
  Proposal,
  RequestReviewFormSchema,
} from '../types/schema';

type DependencyDraft = {
  originalDoi: string;
  originalPmid: string;
  dependencyStatement: string;
  noticeDoi: string;
  noticePmid: string;
};

const emptyDependency: DependencyDraft = {
  originalDoi: '',
  originalPmid: '',
  dependencyStatement: '',
  noticeDoi: '',
  noticePmid: '',
};

export const ProposalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const proposalId = Number(id);
  const account = useWalletAccount();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditHistory, setAuditHistory] = useState<DependencyHistory | null>(null);

  const [proposalEditOpen, setProposalEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editClaim, setEditClaim] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<DependencyDraft>(emptyDependency);
  const [editingDependency, setEditingDependency] = useState<number | null>(null);
  const [dependencyDraft, setDependencyDraft] = useState<DependencyDraft>(emptyDependency);
  const [reviewingDependency, setReviewingDependency] = useState<number | null>(null);
  const [reviewDoi, setReviewDoi] = useState('');
  const [reviewPmid, setReviewPmid] = useState('');

  const isOwner = Boolean(
    proposal && account && proposal.owner.toLowerCase() === account.toLowerCase(),
  );

  const loadData = useCallback(async () => {
    if (!IS_CONTRACT_CONFIGURED || !Number.isInteger(proposalId) || proposalId < 1) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextProposal, nextDependencies] = await Promise.all([
        contractAdapter.getProposal(proposalId),
        contractAdapter.listProposalDependencies(proposalId),
      ]);
      setProposal(nextProposal);
      setDependencies(nextDependencies);
      window.dispatchEvent(new Event('retraction:chain-state'));
    } catch (loadError) {
      setProposal(null);
      setDependencies([]);
      setError(loadError instanceof Error ? loadError.message : 'Could not read proposal state.');
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const runAction = async (successMessage: string, action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      await loadData();
      setMessage(successMessage);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Transaction failed.');
    } finally {
      setBusy(false);
    }
  };

  const openProposalEdit = () => {
    if (!proposal) return;
    setEditTitle(proposal.title);
    setEditClaim(proposal.claimText);
    setProposalEditOpen(true);
  };

  const submitProposalEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    await runAction('Proposal edit finalized and confirmed by contract readback.', () =>
      contractAdapter.editProposal(proposalId, editTitle, editClaim),
    );
    setProposalEditOpen(false);
  };

  const submitAddDependency = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = DependencyFormSchema.safeParse(addDraft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid dependency input.');
      return;
    }
    await runAction('Dependency creation finalized and confirmed by contract readback.', () =>
      contractAdapter.addDependency(
        proposalId,
        addDraft.originalDoi,
        addDraft.originalPmid,
        addDraft.dependencyStatement,
        addDraft.noticeDoi,
        addDraft.noticePmid,
      ),
    );
    setAddDraft(emptyDependency);
    setAddOpen(false);
  };

  const openDependencyEdit = (dependency: Dependency) => {
    setEditingDependency(dependency.id);
    setDependencyDraft({
      originalDoi: dependency.originalDoi,
      originalPmid: dependency.originalPmid,
      dependencyStatement: dependency.dependencyStatement,
      noticeDoi: dependency.pendingNoticeDoi,
      noticePmid: dependency.pendingNoticePmid,
    });
  };

  const submitDependencyEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingDependency) return;
    const parsed = DependencyFormSchema.safeParse(dependencyDraft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid dependency input.');
      return;
    }
    await runAction('Dependency edit finalized and confirmed by contract readback.', () =>
      contractAdapter.editDependency(
        editingDependency,
        dependencyDraft.originalDoi,
        dependencyDraft.originalPmid,
        dependencyDraft.dependencyStatement,
        dependencyDraft.noticeDoi,
        dependencyDraft.noticePmid,
      ),
    );
    setEditingDependency(null);
  };

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reviewingDependency) return;
    const parsed = RequestReviewFormSchema.safeParse({ noticeDoi: reviewDoi, noticePmid: reviewPmid });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid notice identifiers.');
      return;
    }
    await runAction('Review request finalized and pending state confirmed.', () =>
      contractAdapter.requestReview(reviewingDependency, reviewDoi, reviewPmid),
    );
    setReviewingDependency(null);
    setReviewDoi('');
    setReviewPmid('');
  };

  const inspectAudit = async (dependencyId: number) => {
    setError(null);
    try {
      setAuditHistory(await contractAdapter.getDependencyHistory(dependencyId));
    } catch (auditError) {
      setError(auditError instanceof Error ? auditError.message : 'Could not read evaluation history.');
    }
  };

  if (loading) {
    return (
      <div className="page-container" aria-live="polite">
        <p>Loading proposal data from Studionet…</p>
        <p className="page-subtitle">Slow RPC attempts stop automatically; this page will expose a retry control instead of loading indefinitely.</p>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="page-container">
        <div className="page-toolbar">
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Back to registry
          </button>
          {IS_CONTRACT_CONFIGURED && (
            <button className="btn btn-secondary" onClick={() => void loadData()}>
              <RefreshCw size={16} /> Retry chain read
            </button>
          )}
        </div>
        <h1 className="page-title">Proposal #{Number.isFinite(proposalId) ? proposalId : '?'}</h1>
        {error && <div className="form-error notice-panel" role="alert">{error}</div>}
        <p className="page-subtitle">
          {IS_CONTRACT_CONFIGURED
            ? 'The proposal was not found or the contract read failed.'
            : 'Contract not configured — deployment has not occurred. This route is read-only until a real Studionet address is supplied at deployment time.'}
        </p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-toolbar">
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Back to registry
        </button>
        <button className="btn btn-secondary" onClick={() => void loadData()} disabled={busy}>
          <RefreshCw size={16} /> Refresh chain state
        </button>
      </div>

      {error && <div className="form-error notice-panel" role="alert">{error}</div>}
      {message && <div className="success-panel" role="status">{message}</div>}

      <section className="record-card" aria-labelledby="proposal-title">
        <div className="record-heading">
          <div>
            <span className={`chip chip-${proposal.status.toLowerCase()}`}>{proposal.status}</span>
            <h1 id="proposal-title" className="page-title">#{proposal.id} · {proposal.title}</h1>
          </div>
          <div className="action-row">
            {!proposal.sealed && isOwner && (
              <>
                <button className="btn btn-secondary" onClick={openProposalEdit} disabled={busy}>
                  <Edit3 size={15} /> Edit proposal
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    void runAction('Proposal sealed; all initial reviews are pending on-chain.', () =>
                      contractAdapter.sealProposal(proposalId),
                    )
                  }
                  disabled={busy || dependencies.length < 1}
                >
                  <Lock size={15} /> Seal proposal
                </button>
              </>
            )}
            {proposal.status === 'ELIGIBLE' && isOwner && (
              <button
                className="btn btn-primary"
                onClick={() =>
                  void runAction('Proposal activation finalized and ACTIVE readback confirmed.', () =>
                    contractAdapter.activateProposal(proposalId),
                  )
                }
                disabled={busy}
              >
                <CheckCircle2 size={15} /> Activate
              </button>
            )}
          </div>
        </div>
        <p>{proposal.claimText}</p>
        <dl className="spec-list">
          <div><dt>Owner</dt><dd className="breakable">{proposal.owner}</dd></div>
          <div><dt>Revision</dt><dd>#{proposal.revision}</dd></div>
          <div><dt>Sealed</dt><dd>{proposal.sealed ? 'Yes' : 'No'}</dd></div>
          <div><dt>Pending review</dt><dd>{dependencies.some((item) => item.reviewStatus === 'PENDING') ? 'Yes' : 'No'}</dd></div>
        </dl>
        {!account && <p className="permission-note">Connect a Studionet wallet to submit writes. Reads remain public.</p>}
        {account && !isOwner && !proposal.sealed && (
          <p className="permission-note">Draft mutation controls are available only to the proposal owner.</p>
        )}
      </section>

      {proposalEditOpen && (
        <form className="editor-panel" onSubmit={(event) => void submitProposalEdit(event)}>
          <h2>Edit draft proposal</h2>
          <label htmlFor="edit-title">Title <span>{editTitle.length}/120</span></label>
          <input id="edit-title" className="form-input" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} minLength={3} maxLength={120} required />
          <label htmlFor="edit-claim">Claim <span>{editClaim.length}/2000</span></label>
          <textarea id="edit-claim" className="form-textarea" value={editClaim} onChange={(event) => setEditClaim(event.target.value)} minLength={20} maxLength={2000} required rows={5} />
          <div className="action-row">
            <button type="submit" className="btn btn-primary" disabled={busy}>Save through contract</button>
            <button type="button" className="btn btn-secondary" onClick={() => setProposalEditOpen(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="section-heading">
        <div>
          <h2>Registered dependencies ({dependencies.length})</h2>
          <p>Verdicts and proposal consequences below are read directly from the contract.</p>
        </div>
        {!proposal.sealed && isOwner && dependencies.length < 5 && (
          <button className="btn btn-secondary" onClick={() => setAddOpen((open) => !open)} disabled={busy}>
            <Plus size={15} /> Add dependency
          </button>
        )}
      </div>

      {addOpen && (
        <DependencyEditor
          idPrefix="add"
          title="Add draft dependency"
          value={addDraft}
          onChange={setAddDraft}
          onSubmit={submitAddDependency}
          onCancel={() => setAddOpen(false)}
          busy={busy}
        />
      )}

      <div className="dependency-stack">
        {dependencies.map((dependency) => (
          <article className="dependency-card" key={dependency.id}>
            <div className="record-heading">
              <div>
                <h3>Dependency #{dependency.id}</h3>
                <span className={`chip chip-${dependency.verdict.toLowerCase()}`}>{dependency.verdict}</span>
              </div>
              <div className="action-row">
                <button className="btn btn-secondary compact" onClick={() => void inspectAudit(dependency.id)}>
                  <Eye size={13} /> Audit
                </button>
                {!proposal.sealed && isOwner && (
                  <>
                    <button className="btn btn-secondary compact" onClick={() => openDependencyEdit(dependency)} disabled={busy}>
                      <Edit3 size={13} /> Edit
                    </button>
                    <button
                      className="btn btn-secondary compact"
                      onClick={() =>
                        void runAction('Dependency removal finalized and absence confirmed.', () =>
                          contractAdapter.removeDependency(dependency.id, proposalId),
                        )
                      }
                      disabled={busy}
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </>
                )}
                {proposal.sealed && dependency.reviewStatus === 'IDLE' && (
                  <button className="btn btn-secondary compact" onClick={() => setReviewingDependency(dependency.id)} disabled={busy || !account}>
                    <Plus size={13} /> Request review
                  </button>
                )}
                {dependency.reviewStatus === 'PENDING' && (
                  <button
                    className="btn btn-primary compact"
                    onClick={() =>
                      void runAction('Review resolution finalized and chain readback confirmed.', () =>
                        contractAdapter.resolveReview(dependency.id),
                      )
                    }
                    disabled={busy || !account}
                  >
                    <AlertOctagon size={13} /> Resolve
                  </button>
                )}
              </div>
            </div>

            <p>{dependency.dependencyStatement}</p>
            <dl className="spec-list">
              <div><dt>Original DOI</dt><dd className="breakable"><a href={`https://doi.org/${dependency.originalDoi}`} target="_blank" rel="noreferrer">{dependency.originalDoi} <ExternalLink size={11} /></a></dd></div>
              <div><dt>Original PMID</dt><dd><a href={`https://pubmed.ncbi.nlm.nih.gov/${dependency.originalPmid}/`} target="_blank" rel="noreferrer">{dependency.originalPmid}</a></dd></div>
              <div><dt>Review</dt><dd>{dependency.reviewStatus} · round {dependency.reviewRound}</dd></div>
              <div><dt>Accepted notices</dt><dd>{dependency.acceptedNoticeCount}/3</dd></div>
            </dl>
            {dependency.pendingNoticeDoi && (
              <div className="evidence-links">
                <a href={`https://api.crossref.org/works/${dependency.pendingNoticeDoi}`} target="_blank" rel="noreferrer">Crossref notice <ExternalLink size={11} /></a>
                <a href={`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:%22${dependency.pendingNoticeDoi}%22&format=json&resultType=core`} target="_blank" rel="noreferrer">Europe PMC notice <ExternalLink size={11} /></a>
              </div>
            )}

            {editingDependency === dependency.id && (
              <DependencyEditor
                idPrefix={`edit-${dependency.id}`}
                title={`Edit dependency #${dependency.id}`}
                value={dependencyDraft}
                onChange={setDependencyDraft}
                onSubmit={submitDependencyEdit}
                onCancel={() => setEditingDependency(null)}
                busy={busy}
              />
            )}

            {reviewingDependency === dependency.id && (
              <form className="editor-panel nested" onSubmit={(event) => void submitReview(event)}>
                <h4>Open permissionless review</h4>
                <label htmlFor={`review-doi-${dependency.id}`}>Candidate notice DOI</label>
                <input id={`review-doi-${dependency.id}`} className="form-input" value={reviewDoi} onChange={(event) => setReviewDoi(event.target.value)} required />
                <label htmlFor={`review-pmid-${dependency.id}`}>Candidate notice PMID</label>
                <input id={`review-pmid-${dependency.id}`} className="form-input" value={reviewPmid} onChange={(event) => setReviewPmid(event.target.value)} inputMode="numeric" required />
                <div className="action-row">
                  <button className="btn btn-primary" type="submit" disabled={busy}>Submit request</button>
                  <button className="btn btn-secondary" type="button" onClick={() => setReviewingDependency(null)}>Cancel</button>
                </div>
              </form>
            )}
          </article>
        ))}
        {dependencies.length === 0 && <p className="empty-state">No dependencies are registered.</p>}
      </div>

      <button className="btn btn-secondary activity-link" onClick={() => navigate('/activity')}>
        <History size={15} /> Open transaction lifecycle ledger
      </button>

      {auditHistory && <EvidenceAuditModal history={auditHistory} onClose={() => setAuditHistory(null)} />}
    </div>
  );
};

interface DependencyEditorProps {
  idPrefix: string;
  title: string;
  value: DependencyDraft;
  onChange(value: DependencyDraft): void;
  onSubmit(event: React.FormEvent): void;
  onCancel(): void;
  busy: boolean;
}

const DependencyEditor: React.FC<DependencyEditorProps> = ({
  idPrefix,
  title,
  value,
  onChange,
  onSubmit,
  onCancel,
  busy,
}) => {
  const field = (name: keyof DependencyDraft, nextValue: string) => onChange({ ...value, [name]: nextValue });
  return (
    <form className="editor-panel nested" onSubmit={onSubmit}>
      <h3>{title}</h3>
      <div className="field-grid">
        <div>
          <label htmlFor={`${idPrefix}-original-doi`}>Original DOI</label>
          <input id={`${idPrefix}-original-doi`} className="form-input" value={value.originalDoi} onChange={(event) => field('originalDoi', event.target.value)} required />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-original-pmid`}>Original PMID</label>
          <input id={`${idPrefix}-original-pmid`} className="form-input" value={value.originalPmid} onChange={(event) => field('originalPmid', event.target.value)} inputMode="numeric" required />
        </div>
      </div>
      <label htmlFor={`${idPrefix}-statement`}>Frozen dependency statement <span>{value.dependencyStatement.length}/1000</span></label>
      <textarea id={`${idPrefix}-statement`} className="form-textarea" value={value.dependencyStatement} onChange={(event) => field('dependencyStatement', event.target.value)} minLength={20} maxLength={1000} required rows={4} />
      <div className="field-grid">
        <div>
          <label htmlFor={`${idPrefix}-notice-doi`}>Initial notice DOI</label>
          <input id={`${idPrefix}-notice-doi`} className="form-input" value={value.noticeDoi} onChange={(event) => field('noticeDoi', event.target.value)} required />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-notice-pmid`}>Initial notice PMID</label>
          <input id={`${idPrefix}-notice-pmid`} className="form-input" value={value.noticePmid} onChange={(event) => field('noticePmid', event.target.value)} inputMode="numeric" required />
        </div>
      </div>
      <p className="permission-note">Both notice identifiers are required before the proposal can be sealed.</p>
      <div className="action-row">
        <button type="submit" className="btn btn-primary" disabled={busy}>Submit through contract</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};
