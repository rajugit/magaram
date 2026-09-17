'use client';
import { useEffect, useState } from 'react';
import { api } from '../_lib/api';
import type { Article } from '../_lib/data';

export function EditorialReview({
  article,
  demo,
  onSaved,
}: {
  article: Article;
  demo: boolean;
  onSaved: () => Promise<void>;
}) {
  const [sources, setSources] = useState(article.sources);
  const [claims, setClaims] = useState(article.claims);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [authors, setAuthors] = useState<{ id: string; displayName: string }[]>([]);
  const [revisions, setRevisions] = useState<
    {
      id: string;
      version: number;
      createdAt: string;
      snapshot: { title: string; body: string; status: string };
    }[]
  >([]);
  useEffect(() => {
    if (demo) return;
    let active = true;
    api<typeof authors>('/authors')
      .then((items) => {
        if (active) setAuthors(items);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    api<{ revisions: typeof revisions }>(`/articles/${article.id}`)
      .then((data) => {
        if (active) setRevisions(data.revisions);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [article.id, article.version, demo]);
  async function submit(path: string, data: object) {
    setBusy(true);
    setError('');
    try {
      await api(`/articles/${article.id}/${path}`, {
        method: 'POST',
        body: JSON.stringify({ ...data, version: article.version }),
      });
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel editor-fields">
      <h2>Editorial record</h2>
      <p>
        Version {article.version}. Fact checking and approval require someone other than the author.
        Permissions are checked by the server.
      </p>
      {article.status === 'FACT_CHECK' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit('verify', {
              sources: sources.map(({ id, verified }) => ({ id, verified })),
              claims: claims.map(({ id, status, evidence }) => ({ id, status, evidence })),
            });
          }}
        >
          <h3>Verify evidence</h3>
          {sources.map((s, index) => (
            <label className="checkbox" key={s.id}>
              <input
                type="checkbox"
                checked={s.verified}
                onChange={(e) =>
                  setSources(
                    sources.map((item, i) =>
                      i === index ? { ...item, verified: e.target.checked } : item,
                    ),
                  )
                }
              />
              <span>
                {s.label} ·{' '}
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  Open source
                </a>
              </span>
            </label>
          ))}
          {claims.map((claim, index) => (
            <div key={claim.id}>
              <p>{claim.text}</p>
              <label>
                Finding
                <select
                  value={claim.status}
                  onChange={(e) =>
                    setClaims(
                      claims.map((item, i) =>
                        i === index ? { ...item, status: e.target.value } : item,
                      ),
                    )
                  }
                >
                  {[
                    'UNVERIFIED',
                    'VERIFIED',
                    'PARTIALLY_VERIFIED',
                    'FALSE',
                    'NEEDS_EDITOR_REVIEW',
                  ].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label>
                Evidence and reasoning
                <textarea
                  required
                  minLength={10}
                  maxLength={3000}
                  value={claim.evidence}
                  onChange={(e) =>
                    setClaims(
                      claims.map((item, i) =>
                        i === index ? { ...item, evidence: e.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
            </div>
          ))}
          <button className="button primary" disabled={demo || busy}>
            Save verification
          </button>
        </form>
      )}
      {['PUBLISHED', 'UPDATED'].includes(article.status) && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            void submit('corrections', { body: data.get('body'), reason: data.get('reason') });
          }}
        >
          <h3>Publish a transparent correction</h3>
          <label>
            Corrected story
            <textarea
              name="body"
              required
              minLength={30}
              maxLength={150000}
              defaultValue={article.body}
              rows={6}
            />
          </label>
          <label>
            Public correction note
            <textarea name="reason" required minLength={10} maxLength={2000} />
          </label>
          <button className="button secondary" disabled={demo || busy}>
            Save correction
          </button>
        </form>
      )}
      <h3>Revision history</h3>
      {['DRAFT', 'AI_DRAFT'].includes(article.status) && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit('author', { authorId: new FormData(e.currentTarget).get('authorId') });
          }}
        >
          <label>
            Assign an author (editor only)
            <select name="authorId" defaultValue={article.authorId} required>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.displayName}
                </option>
              ))}
            </select>
          </label>
          <p className="fineprint">
            Reassignment resets verification. A different person must review the new author’s story.
          </p>
          <button className="button secondary" disabled={demo || busy || !authors.length}>
            Assign author
          </button>
        </form>
      )}
      {demo ? (
        <p>Sample mode does not create revisions.</p>
      ) : (
        <ul>
          {revisions.map((revision) => (
            <li key={revision.id}>
              <details>
                <summary>
                  Version {revision.version} · {new Date(revision.createdAt).toLocaleString()}
                </summary>
                <p>
                  {revision.snapshot.status} · {revision.snapshot.title}
                </p>
                <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {revision.snapshot.body}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
