import React from 'react';
import { ShieldCheck, Database, CheckCircle2, AlertOctagon } from 'lucide-react';

export const MethodologyPage: React.FC = () => {
  return (
    <div className="page-container">
      <h1 className="page-title">Evidence Policy V1 Methodology</h1>
      <p className="page-subtitle">
        Decentralized research literature audit specification governing publication updates, dual relation binding, and consensus-enforced LLM classification on GenLayer.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        <div style={{ border: '1px solid var(--color-paper-3)', padding: 'var(--space-md)', borderRadius: 6, backgroundColor: 'var(--color-paper-2)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0, fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>
            <Database size={20} />
            Dual Binding Requirement
          </h3>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
            A candidate publication update notice is classified as <strong>BOUND</strong> if and only if:
          </p>
          <ul style={{ fontSize: '0.88rem', paddingLeft: 20 }}>
            <li>Crossref REST API (`api.crossref.org`) contains a publisher-deposited update relation with `source == "publisher"`.</li>
            <li>Europe PMC REST API (`ebi.ac.uk/europepmc`) corroborates the candidate relation via `commentCorrectionList`.</li>
            <li>Both sources agree on update kind (`correction` vs `retraction`).</li>
            <li>Open notice XML text is accessible and under 24,000 normalized characters.</li>
          </ul>
        </div>

        <div style={{ border: '1px solid var(--color-paper-3)', padding: 'var(--space-md)', borderRadius: 6, backgroundColor: 'var(--color-paper-2)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0, fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>
            <ShieldCheck size={20} />
            Material Effect Classification
          </h3>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
            Independent leader and validator nodes execute Policy V1 prompts to classify material effect:
          </p>
          <ul style={{ fontSize: '0.88rem', paddingLeft: 20 }}>
            <li><strong>USABLE (CORRECTION_UNRELATED_TO_DEPENDENCY):</strong> Typo, author spelling, affiliation, or unrelated section correction.</li>
            <li><strong>INVALID_FOR_CLAIM (CORRECTION_CHANGES_DEPENDENCY):</strong> Correction modifies exact cutoff, figure, category, or parameter relied upon.</li>
            <li><strong>INVALID_FOR_CLAIM (RETRACTION_REMOVES_SUPPORT):</strong> Full or partial retraction removing evidentiary foundation.</li>
          </ul>
        </div>
      </div>

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: 'var(--space-sm)' }}>
        Locked Literature Fixtures Summary
      </h2>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fixture</th>
              <th>Original Paper</th>
              <th>Candidate Notice</th>
              <th>Statement / Premise</th>
              <th>Outcome Verdict</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>Fixture A</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>10.1371/journal.pntd.0009591 (PMID 34280196)</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>10.1371/journal.pntd.0011024 (PMC9803134)</td>
              <td style={{ fontSize: '0.85rem' }}>Genetic evidence of SARS-CoV-2 P.1 variant in Brazil</td>
              <td><span className="chip chip-usable"><CheckCircle2 size={12} /> USABLE</span></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>Fixture B</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>10.1371/journal.pntd.0009266 (PMID 33690646)</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>10.1371/journal.pntd.0011026 (PMC9803166)</td>
              <td style={{ fontSize: '0.85rem' }}>NIRUDAK model 5 vomiting episodes bucket cutoff</td>
              <td><span className="chip chip-invalid"><AlertOctagon size={12} /> INVALID_FOR_CLAIM</span></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>Fixture C</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>10.1126/sciadv.ade8971 (PMID 36542710)</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>10.1126/sciadv.adv4615 (PMC11691688)</td>
              <td style={{ fontSize: '0.85rem' }}>Bpr4 up-regulates filamentous hemagglutinin</td>
              <td><span className="chip chip-invalid"><AlertOctagon size={12} /> INVALID_FOR_CLAIM</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
