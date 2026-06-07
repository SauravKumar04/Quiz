import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Login({ setUser }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload =
        mode === 'login'
          ? { email, password }
          : { name, email, password };

      const { data } = await api.post(endpoint, payload);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser?.(data.user);

      navigate(data.user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">
        <div className="flex items-center justify-center px-6 py-16 lg:px-12">
          <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 shadow-[0_30px_80px_rgba(0,0,0,0.06)]">
            <div className="mb-8">
              <div className="mb-4 inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600">
                TCS Verbal Ability Platform
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Admin and user login use the same page. Role-based access is handled automatically.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Saurav Kumar"
                    className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-950"
                    required
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-950"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-950"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-neutral-500">
              {isLogin ? 'New here? ' : 'Already have an account? '}
              <button
                type="button"
                onClick={() => {
                  setMode(isLogin ? 'register' : 'login');
                  setError('');
                }}
                className="font-medium text-neutral-950 hover:underline"
              >
                {isLogin ? 'Register' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>

        <div className="hidden items-center justify-center bg-neutral-950 px-10 py-16 text-white lg:flex">
          <div className="max-w-lg">
            <p className="mb-4 text-sm uppercase tracking-[0.28em] text-neutral-400">
              Premium exam flow
            </p>
            <h2 className="text-5xl font-semibold tracking-tight">
              One quiz engine.
              <br />
              Three timed phases.
            </h2>
            <p className="mt-6 text-base leading-7 text-neutral-300">
              Build a clean verbal ability practice experience with timed blank filling, timed
              recall, and email writing, plus structured manual review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}