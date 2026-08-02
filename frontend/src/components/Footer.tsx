import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Link } from '../lib/router';
import { STUDIONET_CONFIG } from '../config';

export const Footer: React.FC = () => (
  <footer className="colophon-footer">
    <div className="colophon-brand">
      <strong>RetractionDependency</strong>
      <span>A narrow research dependency auditor on GenLayer.</span>
    </div>
    <div className="colophon-grid">
      <div><span>Network</span><strong>Studionet · 61999</strong></div>
      <div><span>Evidence</span><strong>Crossref · Europe PMC</strong></div>
      <div><span>Policy</span><strong>Evidence Policy V1</strong></div>
    </div>
    <nav className="colophon-links" aria-label="Documentation links">
      <Link to="/guide">Project Guide</Link>
      <Link to="/methodology">Methodology</Link>
      <a href={STUDIONET_CONFIG.explorerUrl} target="_blank" rel="noreferrer">
        Explorer <ExternalLink size={11} />
      </a>
    </nav>
    <p className="colophon-disclaimer">
      Not a misconduct, legal, or medical truth determination. Studionet persistence is temporary.
    </p>
  </footer>
);
