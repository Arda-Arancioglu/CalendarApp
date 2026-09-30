import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090A0F] flex flex-col items-center justify-center gap-3 text-zinc-400">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-wider uppercase">Loading...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/calendar" replace />;
  }

  return <>{children}</>;
};
