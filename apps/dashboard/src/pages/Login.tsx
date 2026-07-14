import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, PlayCircle } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

/*
 * Entry screen. Developers can sign in against the live API, or jump straight
 * into a fully in-browser demo so the whole metering + billing flow is
 * explorable without any backend running.
 */
export function Login() {
  const navigate = useNavigate();
  const { login, enterDemoMode } = useAuth();
  const [email, setEmail] = useState('demo@fibermeter.dev');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message}. Is the API running on ${import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'}?`
          : 'Login failed',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = () => {
    enterDemoMode();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FiberMeter</h1>
          <p className="text-sm text-zinc-500">
            Usage-based billing &amp; prepaid metering for Fiber Network
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-zinc-400">
            <div className="h-px flex-1 bg-zinc-200" />
            OR
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <Button variant="outline" className="w-full" onClick={handleDemo}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Explore in demo mode
          </Button>
          <p className="mt-2 text-center text-xs text-zinc-400">
            Demo mode runs the billing engine in your browser — no backend needed.
          </p>
        </div>

        <p className="text-center text-xs text-zinc-400">
          Seeded developer: <span className="font-mono">demo@fibermeter.dev</span> /{' '}
          <span className="font-mono">password123</span>
        </p>
      </div>
    </div>
  );
}
