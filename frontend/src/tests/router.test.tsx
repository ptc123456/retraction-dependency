import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  useParams,
  useNavigate,
} from '../lib/router';
import { App } from '../App';

const DummyPage: React.FC<{ title: string }> = ({ title }) => {
  const params = useParams<{ id?: string }>();
  return (
    <div>
      <h1>{title}</h1>
      {params.id && <span data-testid="param-id">{params.id}</span>}
    </div>
  );
};

describe('Internal SPA Router unit and boundary tests', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('1. All six public routes render at their direct URL', () => {
    const routes = [
      { path: '/', text: 'Research Proposal Registry Index' },
      { path: '/proposals/new', text: 'Create Research Proposal' },
      { path: '/proposals/1', text: 'Proposal #1' },
      { path: '/activity', text: 'Activity ledger & transaction reconciliation' },
      { path: '/guide', text: 'A practical guide to RetractionDependency' },
      { path: '/methodology', text: 'Evidence Policy V1 Methodology' },
    ];

    for (const route of routes) {
      window.history.replaceState(null, '', route.path);
      const { unmount } = render(<App />);
      expect(screen.getByText(new RegExp(route.text, 'i'))).toBeInTheDocument();
      unmount();
    }
  });

  it('2. Link navigation updates rendered content and browser history', () => {
    window.history.replaceState(null, '', '/');
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DummyPage title="Home Page" />} />
          <Route path="/methodology" element={<DummyPage title="Methodology Page" />} />
        </Routes>
        <Link to="/methodology">Go Methodology</Link>
      </BrowserRouter>
    );

    const link = screen.getByRole('link', { name: 'Go Methodology' });
    fireEvent.click(link);

    expect(window.location.pathname).toBe('/methodology');
    expect(screen.getByText('Methodology Page')).toBeInTheDocument();
  });

  it('3. Back/forward popstate updates the route', () => {
    window.history.replaceState(null, '', '/');
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DummyPage title="Home Page" />} />
          <Route path="/activity" element={<DummyPage title="Activity Page" />} />
        </Routes>
      </BrowserRouter>
    );

    expect(screen.getByText('Home Page')).toBeInTheDocument();

    act(() => {
      window.history.pushState(null, '', '/activity');
      window.dispatchEvent(new Event('popstate'));
    });

    expect(screen.getByText('Activity Page')).toBeInTheDocument();
  });

  it('4. /proposals/:id supplies the expected id parameter', () => {
    window.history.replaceState(null, '', '/proposals/42');
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/proposals/:id" element={<DummyPage title="Detail" />} />
        </Routes>
      </BrowserRouter>
    );

    expect(screen.getByTestId('param-id')).toHaveTextContent('42');
  });

  it('5. Root navigation is active only at /', () => {
    window.history.replaceState(null, '', '/');
    const { unmount } = render(
      <BrowserRouter>
        <NavLink to="/">Root</NavLink>
      </BrowserRouter>
    );

    expect(screen.getByRole('link', { name: 'Root' })).toHaveAttribute('aria-current', 'page');
    unmount();

    window.history.replaceState(null, '', '/activity');
    render(
      <BrowserRouter>
        <NavLink to="/">Root</NavLink>
      </BrowserRouter>
    );

    expect(screen.getByRole('link', { name: 'Root' })).not.toHaveAttribute('aria-current');
  });

  it('6. Nested proposal paths do not activate the root link', () => {
    window.history.replaceState(null, '', '/proposals/99');
    render(
      <BrowserRouter>
        <NavLink to="/">Root</NavLink>
        <NavLink to="/proposals">Proposals</NavLink>
      </BrowserRouter>
    );

    expect(screen.getByRole('link', { name: 'Root' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Proposals' })).toHaveAttribute('aria-current', 'page');
  });

  it('7. Modified clicks or target="_blank" links are not intercepted', () => {
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const preventJsdomNav = (e: Event) => e.preventDefault();
    window.addEventListener('click', preventJsdomNav);

    window.history.replaceState(null, '', '/');
    render(
      <BrowserRouter>
        <Link to="/activity" target="_blank">Blank Target</Link>
        <Link to="/methodology" data-testid="modified-link">Modified Click</Link>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Blank Target'));
    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/');

    fireEvent.click(screen.getByTestId('modified-link'), { metaKey: true });
    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/');

    window.removeEventListener('click', preventJsdomNav);
    pushStateSpy.mockRestore();
  });

  it('8. Prevented link clicks do not navigate', () => {
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    window.history.replaceState(null, '', '/');
    render(
      <BrowserRouter>
        <Link
          to="/activity"
          onClick={(e) => e.preventDefault()}
        >
          Prevented Link
        </Link>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Prevented Link'));
    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/');
    pushStateSpy.mockRestore();
  });

  it('supports programmatic navigate with replace option', () => {
    const TestComponent = () => {
      const navigate = useNavigate();
      return (
        <button onClick={() => navigate('/activity', { replace: true })}>
          Replace Navigate
        </button>
      );
    };

    window.history.replaceState(null, '', '/');
    render(
      <BrowserRouter>
        <TestComponent />
        <Routes>
          <Route path="/activity" element={<DummyPage title="Activity Page" />} />
        </Routes>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Replace Navigate'));
    expect(window.location.pathname).toBe('/activity');
    expect(screen.getByText('Activity Page')).toBeInTheDocument();
  });

  it('reports a reconciliation no-op instead of silently doing nothing', async () => {
    window.history.replaceState(null, '', '/activity');
    render(<App />);

    const button = screen.getByRole('button', { name: /reconciliation current/i });
    fireEvent.click(button);

    expect(await screen.findByRole('status')).toHaveTextContent(
      /all submitted transaction hashes are already readback-confirmed/i,
    );
  });
});
