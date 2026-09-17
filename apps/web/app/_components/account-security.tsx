'use client';
import { useState } from 'react';
import { api } from '../_lib/api';

export function AccountSecurity({ demo }: { demo: boolean }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel editor-fields">
      <h2>Account security</h2>
      <p>Changing your password signs out every device and invalidates outstanding reset links.</p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (demo) return;
          const form = event.currentTarget;
          const data = new FormData(form);
          if (data.get('password') !== data.get('confirm')) {
            setMessage('The new passwords do not match.');
            return;
          }
          setBusy(true);
          setMessage('');
          try {
            await api('/auth/password-change', {
              method: 'POST',
              body: JSON.stringify({
                currentPassword: data.get('current'),
                password: data.get('password'),
              }),
            });
            form.reset();
            window.location.assign('/login');
          } catch (error) {
            setMessage((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Current password
          <input
            type="password"
            name="current"
            autoComplete="current-password"
            required
            disabled={demo}
          />
        </label>
        <label>
          New password
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={72}
            required
            disabled={demo}
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            name="confirm"
            autoComplete="new-password"
            minLength={12}
            maxLength={72}
            required
            disabled={demo}
          />
        </label>
        <button className="button primary" disabled={demo || busy}>
          {busy ? 'Updating…' : 'Change password & sign out'}
        </button>
      </form>
      {demo && <p className="fineprint">Sample preview only. No account changes are made.</p>}
      {message && (
        <p role="alert" className="error">
          {message}
        </p>
      )}
    </section>
  );
}
