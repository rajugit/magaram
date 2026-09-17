'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brand, Icon } from '../_components/brand';
import { api } from '../_lib/api';
import { contactEmail } from '../_lib/data';

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <main className="login-wrap">
      <section className="login-story">
        <Brand />
        <div>
          <span className="eyebrow">THE MAGARAM NEWSROOM</span>
          <h1>
            நம் ஊரின் கதைகள்.
            <br />
            நம் மக்களின் குரல்.
          </h1>
          <p>Independent Tamil journalism begins with a thoughtful newsroom.</p>
        </div>
        <small>மகரம் மீடியா · Original reporting. Local perspective.</small>
      </section>
      <section className="login-form">
        <div>
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Your newsroom awaits.</h2>
          <p className="muted">Sign in to create, collaborate, and publish.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              const f = new FormData(e.currentTarget);
              try {
                await api('/auth/login', {
                  method: 'POST',
                  body: JSON.stringify(Object.fromEntries(f)),
                });
                sessionStorage.removeItem('magaram-preview');
                router.push('/admin');
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Email address
              <input
                name="email"
                type="email"
                defaultValue={contactEmail}
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={12}
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in to workspace'}
              <Icon name="arrow" />
            </button>
          </form>
          <Link href="/reset-password" className="back-link">
            Forgot your password?
          </Link>
          <div className="divider">or explore the design</div>
          <button
            className="button secondary full"
            onClick={() => {
              sessionStorage.setItem('magaram-preview', 'true');
              router.push('/admin');
            }}
          >
            Open sample newsroom <Icon name="arrow" />
          </button>
          <p className="fineprint">
            Sample mode uses labelled demonstration content. It cannot publish articles, send
            messages, or process payments.
          </p>
          <Link href="/" className="back-link">
            ← Back to மகரம்
          </Link>
        </div>
      </section>
    </main>
  );
}
