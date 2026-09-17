'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Brand, Icon } from '../_components/brand';
import { api } from '../_lib/api';

export default function ResetPasswordPage() {
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const emailedToken = new URLSearchParams(window.location.search).get('token');
    if (emailedToken) {
      setToken(emailedToken);
      setStep('confirm');
    }
  }, []);
  async function submitRequest() {
    setBusy(true);
    setError('');
    try {
      await api('/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage('If the account exists, password-reset instructions have been sent.');
      setStep('confirm');
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submitConfirmation() {
    setBusy(true);
    setError('');
    try {
      await api('/auth/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setMessage('Your password has been reset. You can now sign in.');
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-wrap">
      <section className="login-story">
        <Brand />
        <div>
          <span className="eyebrow">ACCOUNT SECURITY</span>
          <h1>Secure access to the newsroom.</h1>
          <p>Request a one-hour password-reset link, then choose a new password.</p>
        </div>
      </section>
      <section className="login-form">
        <div>
          <span className="eyebrow">PASSWORD RESET</span>
          <h2>{step === 'request' ? 'Request a reset link' : 'Set a new password'}</h2>
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
          {step === 'request' ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submitRequest();
              }}
            >
              <label>
                Email address
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  required
                />
              </label>
              <button className="button primary" disabled={busy}>
                {busy ? 'Requesting…' : 'Send reset instructions'} <Icon name="arrow" />
              </button>
            </form>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submitConfirmation();
              }}
            >
              <label>
                Reset token from your email
                <input
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  minLength={32}
                  required
                />
              </label>
              <label>
                New password
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                />
              </label>
              <button className="button primary" disabled={busy}>
                {busy ? 'Saving…' : 'Reset password'} <Icon name="arrow" />
              </button>
            </form>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <Link href="/login" className="back-link">
            ← Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
