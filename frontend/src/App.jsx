import { lazy, Suspense, useCallback, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import AiPanel from './components/layout/AiPanel';
import JourneyProgress from './components/layout/JourneyProgress';
import ProgramGuard from './components/ProgramGuard';
import { LoadingState } from './components/ui';
import { deleteSession } from './api/session';
import { getRouteMeta } from './routeConfig';

const PolicySelectPage = lazy(() => import('./pages/PolicySelectPage'));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const ExtractionPage = lazy(() => import('./pages/ExtractionPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const RulesPage = lazy(() => import('./pages/RulesPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const PacketPage = lazy(() => import('./pages/PacketPage'));

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function usePanelResize(width, setWidth, { min, max, direction }) {
  const onPointerDown = useCallback((event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    document.body.classList.add('is-resizing-panel');
    const move = (moveEvent) => setWidth(clamp(startWidth + ((moveEvent.clientX - startX) * direction), min, max));
    const stop = () => {
      document.body.classList.remove('is-resizing-panel');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  }, [direction, max, min, setWidth, width]);

  const onKeyDown = useCallback((event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const delta = (event.key === 'ArrowRight' ? 12 : -12) * direction;
    setWidth((current) => clamp(current + delta, min, max));
  }, [direction, max, min, setWidth]);

  return { onPointerDown, onKeyDown };
}

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [assistantKey, setAssistantKey] = useState(0);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const [assistantCollapsed, setAssistantCollapsed] = useState(false);
  const [navigationWidth, setNavigationWidth] = useState(236);
  const [assistantWidth, setAssistantWidth] = useState(340);
  const route = getRouteMeta(location.pathname);
  const navigationResize = usePanelResize(navigationWidth, setNavigationWidth, { min: 208, max: 320, direction: 1 });
  const assistantResize = usePanelResize(assistantWidth, setAssistantWidth, { min: 300, max: 480, direction: -1 });

  const terminateSession = async () => {
    await deleteSession();
    setAssistantKey((current) => current + 1);
    setSessionVersion((current) => current + 1);
    navigate('/', { replace: true });
  };

  const protect = (page) => <ProgramGuard refreshKey={sessionVersion}>{page}</ProgramGuard>;
  const programSelected = () => setSessionVersion((current) => current + 1);

  return (
    <div
      className={`app-shell${navigationCollapsed ? ' navigation-is-collapsed' : ''}${assistantCollapsed ? ' assistant-is-collapsed' : ''}`}
      style={{
        '--sidebar-width': navigationCollapsed ? '76px' : `${navigationWidth}px`,
        '--assistant-width': assistantCollapsed ? '62px' : `${assistantWidth}px`,
      }}
    >
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Sidebar
        onTerminate={terminateSession}
        collapsed={navigationCollapsed}
        onCollapsedChange={setNavigationCollapsed}
        resizeHandleProps={navigationResize}
      />
      <div className="app-workspace">
        <JourneyProgress currentStep={route.step} />
        <Suspense fallback={<main id="main-content" className="main-content"><LoadingState /></main>}>
          <Routes>
            <Route path="/" element={<PolicySelectPage onProgramSelected={programSelected} />} />
            <Route path="/readiness" element={protect(<WorkspacePage />)} />
            <Route path="/profile" element={protect(<ProfilePage />)} />
            <Route path="/upload" element={protect(<UploadPage />)} />
            <Route path="/extraction" element={protect(<ExtractionPage />)} />
            <Route path="/documents" element={protect(<DocumentsPage />)} />
            <Route path="/rules" element={protect(<RulesPage />)} />
            <Route path="/packet" element={protect(<PacketPage />)} />
          </Routes>
        </Suspense>
      </div>
      <AiPanel
        key={assistantKey}
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        title={route.assistantTitle}
        subtitle={route.assistantSubtitle}
        suggestedQuestions={route.questions}
        collapsed={assistantCollapsed}
        onCollapsedChange={setAssistantCollapsed}
        resizeHandleProps={assistantResize}
        initialMessages={[{
          role: 'ai',
          text: 'I can explain your documents, calculations, readiness findings, and cited LIHTC rules. I will never make an eligibility decision.',
        }]}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppShell />
    </BrowserRouter>
  );
}
