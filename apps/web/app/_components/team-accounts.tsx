'use client';

import { useEffect, useState } from 'react';
import { api } from '../_lib/api';

type TeamUser = {
  id: string;
  username: string | null;
  email: string;
  displayName: string;
  status: string;
  mustChangePassword: boolean;
  roles: { role: { code: string; name: string } }[];
};

const roles = ['EDITOR', 'REPORTER', 'FACT_CHECKER', 'SOCIAL_MANAGER', 'ADMIN'] as const;

export function TeamAccounts({ demo, canManage }: { demo: boolean; canManage: boolean }) {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    if (!demo && canManage) setUsers((await api<{ items: TeamUser[] }>('/admin/users')).items);
  }
  useEffect(() => { void load().catch((e) => setError(e.message)); }, [demo, canManage]);
  if (!canManage && !demo) return <section className="panel empty-state"><h2>Administrator access required</h2><p>Only a super administrator can manage newsroom accounts.</p></section>;
  return (
    <section className="panel editor-fields">
      <h2>Create newsroom account</h2>
      <p className="muted">New users receive a temporary password and must change it at first sign-in.</p>
      <form onSubmit={async (event) => {
        event.preventDefault(); if (demo) return;
        setBusy(true); setError(''); setMessage('');
        try { const form = new FormData(event.currentTarget); const data = Object.fromEntries(form); await api('/admin/users', { method: 'POST', body: JSON.stringify({ ...data, roles: [data.roles] }) }); event.currentTarget.reset(); setMessage('Account created. Share the temporary password securely.'); await load(); }
        catch (e) { setError((e as Error).message); } finally { setBusy(false); }
      }}>
        <label>Username<input name="username" pattern="[A-Za-z0-9._-]+" required /></label>
        <label>Email<input name="email" type="email" required /></label>
        <label>Display name<input name="displayName" required /></label>
        <label>Temporary password<input name="password" type="password" minLength={12} maxLength={72} required autoComplete="new-password" /></label>
        <label>Role<select name="roles" defaultValue="EDITOR"><option value="EDITOR">Editor</option>{roles.filter((r) => r !== 'EDITOR').map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
        <button className="button primary" disabled={busy || demo}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      {message && <p className="notice">{message}</p>}{error && <p className="error">{error}</p>}
      {!demo && <div className="table-scroll"><table className="article-table"><thead><tr><th>USERNAME</th><th>NAME</th><th>ROLE</th><th>STATUS</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td>{user.username || '—'}</td><td>{user.displayName}<br /><small>{user.email}</small></td><td>{user.roles.map((r) => r.role.code).join(', ')}</td><td>{user.status}{user.mustChangePassword ? ' · TEMP PASSWORD' : ''}</td></tr>)}</tbody></table></div>}
      {demo && <p className="fineprint">Sample preview only. No accounts are changed.</p>}
    </section>
  );
}
