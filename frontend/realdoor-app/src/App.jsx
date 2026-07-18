import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import PolicySelectPage from './pages/PolicySelectPage';
import WorkspacePage from './pages/WorkspacePage';
import UploadPage from './pages/UploadPage';
import ExtractionPage from './pages/ExtractionPage';
import DocumentsPage from './pages/DocumentsPage';
import RulesPage from './pages/RulesPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <Routes>
          <Route path="/"           element={<PolicySelectPage />} />
          <Route path="/readiness"  element={<WorkspacePage />} />
          <Route path="/upload"     element={<UploadPage />} />
          <Route path="/extraction" element={<ExtractionPage />} />
          <Route path="/documents"  element={<DocumentsPage />} />
          <Route path="/rules"      element={<RulesPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
