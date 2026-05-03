import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Import from './pages/Import';
import Courses from './pages/Courses';

const pageTitles = {
  '/': 'Dashboard',
  '/students': 'Students',
  '/import': 'Batch Import',
  '/courses': 'Courses',
};

function Layout({ children, path }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <h2>{pageTitles[path] || 'EduTrack'}</h2>
          <div className="topbar-right">
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1d24',
            color: '#e8eaf0',
            border: '1px solid #252830',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#6ee7b7', secondary: '#0a2a1f' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#4a1e1e' } },
        }}
      />
      <Routes>
        <Route path="/" element={<Layout path="/"><Dashboard /></Layout>} />
        <Route path="/students" element={<Layout path="/students"><Students /></Layout>} />
        <Route path="/import" element={<Layout path="/import"><Import /></Layout>} />
        <Route path="/courses" element={<Layout path="/courses"><Courses /></Layout>} />
      </Routes>
    </Router>
  );
}
