import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Lock, AlertCircle } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: { username?: string; password?: string } = {};
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      await login({ username, password });
      navigate('/calendar');
    } catch (err: any) {
      const serverMessage =
        err.response?.data?.message || err.response?.data?.error || 'Invalid credentials or login failed.';
      setErrors({ general: serverMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0F] flex flex-col items-center justify-center p-4">
      {/* Background Subtle Accent Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1A1D2D_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      <div className="relative w-full max-w-md bg-[#11131F] border border-[#272A3D] rounded-md shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-2.5 bg-indigo-600/10 border border-indigo-500/30 rounded-sm mb-1">
            <Calendar className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">EventFlow API</h1>
          <p className="text-xs text-zinc-400">Sign in to access your event calendar</p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-[#090A0F] border border-[#272A3D] rounded-sm text-xs font-semibold">
          <button className="py-2 text-center text-zinc-100 bg-[#161828] border border-[#272A3D] rounded-xs shadow-xs">
            Sign In
          </button>
          <Link
            to="/register"
            className="py-2 text-center text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center"
          >
            Register
          </Link>
        </div>

        {/* General Error Banner */}
        {errors.general && (
          <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xs flex items-start gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errors.general}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Input
              label="Username"
              type="text"
              placeholder="e.g. alex_dev"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={errors.username}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="current-password"
              required
            />
          </div>

          <Button type="submit" variant="primary" size="md" className="w-full mt-2" isLoading={isSubmitting}>
            <Lock className="w-4 h-4 mr-1" />
            Sign In to Dashboard
          </Button>
        </form>

        {/* Footer info */}
        <div className="text-center text-[11px] text-zinc-500 border-t border-[#272A3D] pt-4">
          Spring Boot Backend target: <span className="font-mono text-zinc-400">http://localhost:8080/api</span>
        </div>
      </div>
    </div>
  );
};
