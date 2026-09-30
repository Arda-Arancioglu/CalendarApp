import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#11131F] border-b border-[#272A3D] px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo / App Title */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-600/20 border border-indigo-500/40 rounded-sm">
            <Calendar className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <span className="text-base font-bold text-zinc-100 tracking-tight">EventFlow</span>
            <span className="hidden sm:inline-block ml-2 text-xs text-zinc-500 font-normal">
              Calendar & Event Engine
            </span>
          </div>
        </div>

        {/* User Info & Actions */}
        {user && (
          <div className="flex items-center gap-3">
            {/* Authenticated User Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161828] border border-[#272A3D] rounded-sm">
              <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-200">{user.username}</span>
              <Badge variant="indigo" className="ml-1">
                ID: {user.userId}
              </Badge>
            </div>

            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              title="Logout session"
              className="text-zinc-400 hover:text-red-400 hover:border-red-500/40"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
