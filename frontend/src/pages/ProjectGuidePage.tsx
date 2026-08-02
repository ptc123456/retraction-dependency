import React from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  CircleDot,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  RefreshCw,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { Link } from '../lib/router';
import { STUDIONET_CONFIG } from '../config';

const steps = [
  ['Freeze the exact claim', 'Create a proposal with the claim text that will later depend on named literature. The wording becomes the stable context for every review.'],
  ['Register narrow dependencies', 'Add one to five DOI/PMID pairs and describe the exact finding, cutoff, figure, or premise the proposal relies on.'],
  ['Seal the proposal', 'Sealing prevents further edits and opens the initial evidence reviews. Each dependency enters EVIDENCE_HOLD until resolved.'],
  ['Resolve with consensus', 'GenLayer validators independently fetch Crossref and Europe PMC evidence, bind the notice to the original paper, and evaluate material effect.'],
  ['Apply the on-chain consequence', 'USABLE evidence can make a proposal ELIGIBLE. An INVALID_FOR_CLAIM dependency makes it INVALIDATED. Missing or disputed evidence fails safely.'],
  ['Monitor later publication updates', 'After sealing, anyone can request another review using a newly published correction or retraction. The proposal status is recalculated on-chain.'],
];

const statusRows = [
  ['DRAFT', 'Owner may still edit the claim and dependencies.'],
  ['EVIDENCE_HOLD', 'At least one dependency is unresolved or under review.'],
  ['ELIGIBLE', 'Every dependency is usable and the proposal may be activated.'],
  ['ACTIVE', 'The owner activated an eligible proposal.'],
  ['INVALIDATED', 'At least one dependency no longer supports the frozen claim.'],
];

export const ProjectGuidePage: React.FC = () => (
  <div className="page-container docs-page">
    <header className="docs-hero">
      <div className="eyebrow">PROJECT DOCUMENTATION · POLICY V1</div>
      <h1 className="page-title">A practical guide to RetractionDependency</h1>
      <p className="docs-lede">
        RetractionDependency turns publication corrections and retractions into a narrow,
        validator-checked decision about whether a frozen research dependency remains usable.
      </p>
      <div className="docs-actions">
        <Link className="btn btn-primary" to="/proposals/new">
          Create a proposal <ArrowRight size={15} />
        </Link>
        <Link className="btn btn-secondary" to="/methodology">
          Read Evidence Policy V1 <BookOpenCheck size={15} />
        </Link>
      </div>
    </header>

    <dl className="guide-facts" aria-label="Project facts">
      <div><dt>Network</dt><dd>{STUDIONET_CONFIG.name} · {STUDIONET_CONFIG.chainId}</dd></div>
      <div><dt>Evidence</dt><dd>Crossref + Europe PMC</dd></div>
      <div><dt>Decision owner</dt><dd>Intelligent Contract</dd></div>
      <div><dt>Policy</dt><dd>Bounded semantic review V1</dd></div>
    </dl>

    <section className="docs-section docs-split" aria-labelledby="why-title">
      <div>
        <div className="section-marker">01 / PURPOSE</div>
        <h2 id="why-title">The trust problem</h2>
      </div>
      <div className="docs-copy">
        <p>
          Bibliographic APIs can show that a notice is connected to a paper, but they cannot
          decide whether the corrected material changes the exact premise another claim depends
          on. A normal server-side AI would leave that consequence under one operator's control.
        </p>
        <p>
          Here, the Intelligent Contract owns the evidence fetch, binding decision, semantic
          review, validator comparison, and resulting proposal state. Callers provide identifiers;
          they cannot submit the verdict.
        </p>
        <div className="trust-line" aria-label="Decision flow">
          <span><Fingerprint size={16} /> Frozen dependency</span>
          <ArrowRight size={14} aria-hidden="true" />
          <span><FileCheck2 size={16} /> Public evidence</span>
          <ArrowRight size={14} aria-hidden="true" />
          <span><ShieldCheck size={16} /> Validator consensus</span>
          <ArrowRight size={14} aria-hidden="true" />
          <span><Scale size={16} /> On-chain consequence</span>
        </div>
      </div>
    </section>

    <section className="docs-section" aria-labelledby="use-title">
      <div className="section-marker">02 / HOW TO USE IT</div>
      <h2 id="use-title">From claim to consequence</h2>
      <ol className="guide-steps">
        {steps.map(([title, body], index) => (
          <li key={title}>
            <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
            <div><h3>{title}</h3><p>{body}</p></div>
          </li>
        ))}
      </ol>
    </section>

    <section className="docs-section docs-split" aria-labelledby="states-title">
      <div>
        <div className="section-marker">03 / STATE MODEL</div>
        <h2 id="states-title">Read the registry at a glance</h2>
        <p className="section-note">Status is contract-derived and never inferred by the frontend.</p>
      </div>
      <div className="status-glossary">
        {statusRows.map(([status, description]) => (
          <div key={status}>
            <span className={`chip chip-${status.toLowerCase()}`}><CircleDot size={11} /> {status}</span>
            <p>{description}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="docs-section guide-operations" aria-labelledby="operations-title">
      <div>
        <div className="section-marker">04 / OPERATIONS</div>
        <h2 id="operations-title">Full Consensus takes time</h2>
        <p>
          Writes may spend several minutes in consensus. Sign once, keep the page open, and use
          the Activity Ledger if browser polling is interrupted. Reconciliation checks the existing
          hash, execution result, and contract readback; it never resubmits the write.
        </p>
      </div>
      <Link className="operation-link" to="/activity">
        <RefreshCw size={18} />
        <span><strong>Open Activity Ledger</strong><small>Recover finality and readback safely</small></span>
        <ArrowRight size={16} />
      </Link>
    </section>

    <aside className="boundary-note" aria-label="Product boundary">
      <strong>Important boundary.</strong> This project does not determine misconduct, fraud,
      legal liability, or medical truth. It answers whether a named paper remains usable for one
      frozen dependency under Policy V1.
    </aside>

    <p className="docs-source-link">
      Contract evidence is available on the{' '}
      <a href={STUDIONET_CONFIG.explorerUrl} target="_blank" rel="noreferrer">
        Studionet Explorer <ExternalLink size={12} />
      </a>.
    </p>
  </div>
);
