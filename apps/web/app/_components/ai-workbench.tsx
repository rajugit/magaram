'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '../_lib/api';
import type { Article } from '../_lib/data';

type AiStatus = {
  generationEnabled: boolean;
  provider: string | null;
  model: string | null;
  message: string;
  usage: { userRequests: number; globalRequests: number };
  limits: { dailyPerUser: number; dailyGlobal: number; maxOutputTokens: number } | null;
};
type AiRun = {
  id: string;
  articleId: string;
  articleVersion: number;
  task: string;
  status: string;
  createdAt: string;
  failureCode: string | null;
  promptVersion: string;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  reviewNote: string | null;
  output: {
    text: string;
    sourceIds: string[];
    warnings: string[];
    claims: { text: string; status: string }[];
    seo?: { title: string; description: string };
  } | null;
};

export function AiWorkbench({ articles, demo }: { articles: Article[]; demo: boolean }) {
  const [selected, setSelected] = useState(articles[0]?.id || '');
  const [task, setTask] = useState('tamil-draft');
  const [result, setResult] = useState<{ system: string; input: string; version: string } | null>(
    null,
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [runs, setRuns] = useState<AiRun[]>([]);
  const [consent, setConsent] = useState(false);
  const [duplicates, setDuplicates] = useState<{
    items: { id: string; title: string; similarity: number }[];
    scanned: number;
    method: string;
  } | null>(null);
  const requestKey = useRef<string | null>(null);
  useEffect(() => {
    if (demo) return;
    let active = true;
    api<AiStatus>('/ai/status')
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    if (selected)
      api<{ items: AiRun[] }>(`/ai/runs?articleId=${encodeURIComponent(selected)}`)
        .then((value) => {
          if (active) setRuns(value.items);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [selected, demo]);
  async function refreshRuns() {
    if (demo || !selected) return;
    setRuns(
      (await api<{ items: AiRun[] }>(`/ai/runs?articleId=${encodeURIComponent(selected)}`)).items,
    );
    setStatus(await api<AiStatus>('/ai/status'));
  }
  async function generate() {
    const article = articles.find((item) => item.id === selected);
    if (!article || demo || !status?.generationEnabled || !consent) return;
    setError('');
    setBusy(true);
    requestKey.current ||= crypto.randomUUID();
    try {
      await api('/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          articleId: article.id,
          version: article.version,
          task,
          requestKey: requestKey.current,
          consentToSend: true,
        }),
      });
      await refreshRuns();
      requestKey.current = null;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel editor-fields">
      <span className="eyebrow">PHASE 3 · AI NEWSROOM</span>
      <h2>Reporting first. Assistance second.</h2>
      <p className="notice">
        {status?.message ||
          'AI generation is inactive. No provider is connected and no reporting leaves this system.'}{' '}
        Email is on hold.
      </p>
      {!demo && status && (
        <p className="fineprint">
          Requests today: {status.usage.userRequests}
          {status.limits
            ? ` / ${status.limits.dailyPerUser} for your account; ${status.usage.globalRequests} / ${status.limits.dailyGlobal} platform-wide. Output cap: ${status.limits.maxOutputTokens} tokens per request.`
            : '. Generation limits are not activated.'}{' '}
          Failed or uncertain provider requests count toward limits.
        </p>
      )}
      {!articles.length && (
        <p className="notice">
          Save a story with reporting sources first.{' '}
          <Link href="/admin/articles/new">Create an article →</Link>
        </p>
      )}
      <p>
        Prepare a source-bound prompt for Tamil drafting, translation, summaries, SEO, social
        captions or claim extraction. Preparation is audited; it never edits or publishes the story.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (demo) return;
          const article = articles.find((item) => item.id === selected);
          if (!article) return;
          setError('');
          setResult(null);
          setBusy(true);
          try {
            setResult(
              await api('/ai/prepare', {
                method: 'POST',
                body: JSON.stringify({ articleId: article.id, version: article.version, task }),
              }),
            );
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Reporting
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setResult(null);
              setDuplicates(null);
              setRuns([]);
              setConsent(false);
              requestKey.current = null;
            }}
          >
            <option value="">Choose a story</option>
            {articles.map((article) => (
              <option key={article.id} value={article.id}>
                {article.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Assistance
          <select
            value={task}
            onChange={(e) => {
              setTask(e.target.value);
              setResult(null);
              setConsent(false);
              requestKey.current = null;
            }}
          >
            {['tamil-draft', 'summary', 'translation', 'seo', 'social', 'claims'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <button className="button primary" disabled={demo || busy || !selected}>
          {busy ? 'Preparing…' : 'Prepare prompt locally'}
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={demo || busy || !selected}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              setDuplicates(await api(`/ai/duplicates?articleId=${encodeURIComponent(selected)}`));
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Check similar reporting locally
        </button>
        {status?.generationEnabled && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I authorize sending this story and its source packet to {status.provider} (
            {status.model}). This may incur usage charges.
          </label>
        )}
        <button
          type="button"
          className="button secondary"
          disabled={demo || busy || !selected || !consent || !status?.generationEnabled}
          onClick={() => void generate()}
        >
          Generate an unverified proposal
        </button>
        {demo && (
          <p className="fineprint">
            Sample preview: prompt preparation requires sign-in and a saved article.
          </p>
        )}
      </form>
      {duplicates && (
        <section>
          <h3>Similar reporting</h3>
          <p className="fineprint">
            Compared with {duplicates.scanned} accessible stories (up to 200). {duplicates.method}
          </p>
          {duplicates.items.length ? (
            <ul>
              {duplicates.items.map((item) => (
                <li key={item.id}>
                  <Link href={`/admin/articles/${item.id}`}>{item.title}</Link> · {item.similarity}%
                  lexical overlap
                </li>
              ))}
            </ul>
          ) : (
            <p>No matches above the comparison threshold. This does not establish originality.</p>
          )}
        </section>
      )}
      <section>
        <h3>Saved proposals & review history</h3>
        {!demo && (
          <button
            type="button"
            className="button secondary"
            disabled={busy || !selected}
            onClick={() => {
              void refreshRuns().catch((e) => setError(e.message));
            }}
          >
            Refresh history
          </button>
        )}
        {!runs.length && (
          <p>
            No saved proposals for this story. No sample AI output is presented as real generation.
          </p>
        )}
        {runs.map((run) => (
          <article key={run.id} className="panel editor-fields">
            <h4>
              {run.task} · {run.status}
            </h4>
            <p className="fineprint">
              Story version {run.articleVersion} · {run.promptVersion} · {run.provider} /{' '}
              {run.model} · {new Date(run.createdAt).toLocaleString()}
            </p>
            {run.failureCode && (
              <p role="status">
                Request did not produce a usable proposal: {run.failureCode}. It was not retried
                automatically.
              </p>
            )}
            {run.status === 'RUNNING' && (
              <p>Generation is running. Refresh history to check its outcome.</p>
            )}
            {run.output && (
              <>
                <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {run.output.text}
                </pre>
                {run.output.seo && (
                  <p>
                    SEO: {run.output.seo.title} — {run.output.seo.description}
                  </p>
                )}
                <ul>
                  {run.output.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                  {run.output.claims.map((claim, index) => (
                    <li key={`claim-${index}`}>
                      {claim.status}: {claim.text}
                    </li>
                  ))}
                </ul>
                <p className="fineprint">
                  Reported usage: {run.inputTokens ?? 'unknown'} input /{' '}
                  {run.outputTokens ?? 'unknown'} output tokens. This is not a billing statement.
                </p>
              </>
            )}
            {run.reviewNote && <p>Review note: {run.reviewNote}</p>}
            {run.status === 'READY' && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  setBusy(true);
                  setError('');
                  try {
                    await api(`/ai/runs/${run.id}/review`, {
                      method: 'POST',
                      body: JSON.stringify({
                        decision: data.get('decision'),
                        reviewNote: data.get('reviewNote'),
                        acknowledgedWarnings: data.get('acknowledged') === 'on',
                      }),
                    });
                    window.location.reload();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <p>
                  Accepting requires a different editor. It never publishes: story changes become an
                  AI draft with verification reset; social copy remains saved only.
                </p>
                <label>
                  Decision
                  <select name="decision">
                    <option value="REJECTED">Reject proposal</option>
                    <option value="ACCEPTED">Accept for further review</option>
                  </select>
                </label>
                <label>
                  Review note
                  <textarea name="reviewNote" required minLength={10} maxLength={3000} />
                </label>
                <label className="checkbox">
                  <input name="acknowledged" type="checkbox" required />I reviewed the proposal,
                  sources and warnings.
                </label>
                <button className="button primary" disabled={busy}>
                  Record decision
                </button>
              </form>
            )}
          </article>
        ))}
      </section>
      <h3>Before any AI-assisted story can publish</h3>
      <ol>
        <li>Reporters supply evidence and attribution.</li>
        <li>AI proposals remain unverified, even when structurally valid.</li>
        <li>Another person checks the claims and sources.</li>
        <li>An independent editor approves publication.</li>
      </ol>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {result && (
        <div>
          <h3>Prompt {result.version} — not generated content</h3>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{result.system}</pre>
          <details>
            <summary>Review source packet</summary>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{result.input}</pre>
          </details>
        </div>
      )}
    </section>
  );
}
