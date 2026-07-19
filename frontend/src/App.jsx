import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import AiPanel from './components/layout/AiPanel';
import ProgramGuard from './components/ProgramGuard';
import PolicySelectPage from './pages/PolicySelectPage';
import WorkspacePage from './pages/WorkspacePage';
import UploadPage from './pages/UploadPage';
import ExtractionPage from './pages/ExtractionPage';
import DocumentsPage from './pages/DocumentsPage';
import RulesPage from './pages/RulesPage';
import ProfilePage from './pages/ProfilePage';
import PacketPage from './pages/PacketPage';
import { deleteSession } from './api/session';

const COPILOT_QUESTIONS = {
  '/upload': ['What documents are required?', 'What counts as proof of income?'],
  '/extraction': ['Why should I confirm extracted values?', 'How is annualized income calculated?'],
  '/readiness': ['What should I upload next?', 'Explain my open readiness findings'],
  '/documents': ['Which documents have issues?', 'Explain document freshness rules'],
  '/rules': ['Show the official income-limit citation', 'Explain the 40-60 test'],
  '/packet': ['What will this packet contain?', 'Does RealDoor send this packet?'],
};

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [copilotKey, setCopilotKey] = useState(0);
  const [sessionVersion, setSessionVersion] = useState(0);

  const terminateSession = async () => {
    await deleteSession();
    setCopilotKey((current) => current + 1);
    setSessionVersion((current) => current + 1);
    navigate('/', { replace: true });
  };

  const programSelected = () => setSessionVersion((current) => current + 1);

  const protect = (page) => <ProgramGuard refreshKey={sessionVersion}>{page}</ProgramGuard>;

  const questions = COPILOT_QUESTIONS[location.pathname] || [
    'What can RealDoor help me prepare?',
    'What are the FY2026 Albany MTSP limits?',
  ];

  return (
    <div className="app-shell">
      <Sidebar onTerminate={terminateSession} />
      <Routes>
        <Route path="/"           element={<PolicySelectPage onProgramSelected={programSelected} />} />
        <Route path="/readiness"  element={protect(<WorkspacePage />)} />
        <Route path="/profile"    element={protect(<ProfilePage />)} />
        <Route path="/upload"     element={protect(<UploadPage />)} />
        <Route path="/extraction" element={protect(<ExtractionPage />)} />
        <Route path="/documents"  element={protect(<DocumentsPage />)} />
        <Route path="/rules"      element={protect(<RulesPage />)} />
        <Route path="/packet"     element={protect(<PacketPage />)} />
      </Routes>
      <AiPanel
        key={copilotKey}
        title="AI Copilot"
        subtitle="Grounded readiness assistant"
        initialMessages={[{
          role: 'ai',
          text: 'I stay with you throughout the preparation flow. I can explain extracted fields, readiness findings, calculations, and cited LIHTC rules—but I do not make eligibility decisions.',
        }]}
        suggestedQuestions={questions}
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
