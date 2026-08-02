import React from 'react';
import { BrowserRouter, Routes, Route } from './lib/router';
import { SideRailNav } from './components/SideRailNav';
import { HeaderSpecSheet } from './components/HeaderSpecSheet';
import { UnconfiguredBanner } from './components/UnconfiguredBanner';
import { ProposalsListPage } from './pages/ProposalsListPage';
import { NewProposalPage } from './pages/NewProposalPage';
import { ProposalDetailPage } from './pages/ProposalDetailPage';
import { ActivityPage } from './pages/ActivityPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { ProjectGuidePage } from './pages/ProjectGuidePage';
import { Footer } from './components/Footer';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <UnconfiguredBanner />
      <div className="app-shell">
        <SideRailNav />
        <div className="main-content">
          <HeaderSpecSheet />
          <Routes>
            <Route path="/" element={<ProposalsListPage />} />
            <Route path="/proposals/new" element={<NewProposalPage />} />
            <Route path="/proposals/:id" element={<ProposalDetailPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/guide" element={<ProjectGuidePage />} />
            <Route path="/methodology" element={<MethodologyPage />} />
          </Routes>
          <Footer />
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
