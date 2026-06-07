import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Spinner } from '../components/Loader';

export default function Login({ setUser }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login' ? { email, password } : { name, email, password };
      const { data } = await api.post(endpoint, payload);
      
      if (!data || !data.user || !data.token) throw new Error("Server is waking up. Please wait 30 seconds.");
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser?.(data.user);
      navigate(data.user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950 font-sans">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">
        <div className="flex items-center justify-center px-6 py-16 lg:px-12">
          <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
            <div className="mb-8">
              <div className="mb-4 inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold text-neutral-600 tracking-wide uppercase">Verbal Ability Platform</div>
              <h1 className="text-3xl font-semibold tracking-tight">{isLogin ? 'Welcome back' : 'Create an account'}</h1>
              <p className="mt-2 text-sm leading-6 text-neutral-500">Sign in securely to access your assessments and results.</p>
            </div>

            {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Full name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900" required />
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900" required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900" required />
              </div>
              
              {/* Premium Button with Loader */}
              <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-80 shadow-sm">
                {loading ? <><Spinner /> Authenticating...</> : (isLogin ? 'Sign in' : 'Create account')}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-neutral-500">
              {isLogin ? 'New here? ' : 'Already have an account? '}
              <button type="button" onClick={() => { setMode(isLogin ? 'register' : 'login'); setError(''); }} className="font-semibold text-neutral-900 hover:underline">
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>

        <div className="hidden items-center justify-center bg-neutral-950 px-10 py-16 text-white lg:flex">
          <div className="max-w-lg">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-neutral-400">Secure Environment</p>
            <h2 className="text-4xl font-semibold tracking-tight leading-tight">Focus on the exam.<br/>We handle the rest.</h2>
            <p className="mt-6 text-base leading-relaxed text-neutral-400">Strict timed phases, split-screen reading, and automated syncing ensure your progress is always safe.</p>
          </div>
        </div>
      </div>
    </div>
  );
}