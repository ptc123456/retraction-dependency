import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { IS_CONTRACT_CONFIGURED } from '../config';

export const UnconfiguredBanner: React.FC = () => {
  if (IS_CONTRACT_CONFIGURED) return null;

  return (
    <div className="unconfigured-banner" role="alert" aria-live="polite">
      <AlertTriangle size={18} />
      <span>
        <strong>Contract not configured — deployment has not occurred.</strong> All read and write contract actions are disabled. Methodology and explanatory UI remain fully functional.
      </span>
    </div>
  );
};
