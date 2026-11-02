import { useState, type FormEvent } from 'react';
import { useLogin } from './api';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim() && password) login.mutate({ email: email.trim(), password });
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="brand">
          <span className="brand-mark">💬</span>
          <div>
            <h1>Support Inbox</h1>
            <p className="muted">Operator portal</p>
          </div>
        </div>
        <label>
          Email
          <input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {login.error && <p className="error">{login.error.message}</p>}
        <button type="submit" disabled={login.isPending || !email.trim() || !password}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
