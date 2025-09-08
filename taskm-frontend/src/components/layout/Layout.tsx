import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

// Injects necessary CSS for the light theme background and custom font
const ComponentStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    .grid-background-light {
      background-image: linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
      background-size: 3rem 3rem;
    }
    
    /* Custom scrollbar for the light theme */
    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background-color: #d1d5db; /* gray-300 */
      border-radius: 10px;
      border: 2px solid #f9fafb; /* gray-50 */
    }
     .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background-color: #9ca3af; /* gray-400 */
    }
  `}</style>
);

export const Layout: React.FC = () => {
  return (
    <div 
      className="min-h-screen bg-slate-50 text-slate-800" 
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <ComponentStyles />
      <div className="fixed inset-0 grid-background-light -z-10 opacity-50"></div>
      
      <Sidebar />
      
      {/* Main content area wrapper */}
      <div className="lg:pl-72 flex flex-col h-screen">
        <Header />
        
        {/* The main content area scrolls independently */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};