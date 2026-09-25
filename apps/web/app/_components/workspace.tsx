'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Brand, Icon } from './brand';
import { api } from '../_lib/api';
import { demoArticles, navGroups, contactEmail } from '../_lib/data';
import type { Article, ArticleStatus } from '../_lib/data';
import { LocalWorkbench } from './local-workbench';
import { AccountSecurity } from './account-security';
import { EditorialReview } from './editorial-review';
import { AiWorkbench } from './ai-workbench';
import { Taxonomy } from './taxonomy';
import type { TaxonomyItem } from './taxonomy';

const labels: Record<string, string> = {
  DRAFT: 'Draft',
  AI_DRAFT: 'AI draft',
  EDITOR_REVIEW: 'Editor review',
  FACT_CHECK: 'Fact check',
  APPROVED: 'Approved',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  UPDATED: 'Updated',
  ARCHIVED: 'Archived',
};
export function Status({ status }: { status: string }) {
  return (
    <span className={`status status-${status.toLowerCase()}`}>
      <i />
      {labels[status] || status}
    </span>
  );
}
export function Workspace({
  path,
  initialPreview = false,
}: {
  path: string[];
  initialPreview?: boolean;
}) {
  const page = path[0] || 'overview';
  const articleId = page === 'articles' && path[1] !== 'new' ? path[1] : undefined;
  const router = useRouter();
  const [demo, setDemo] = useState(initialPreview);
  const [ready, setReady] = useState(initialPreview);
  const [user, setUser] = useState(initialPreview ? 'Preview editor' : '');
  const [articles, setArticles] = useState<Article[]>(initialPreview ? demoArticles : []);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [notice, setNotice] = useState('');
  const [menu, setMenu] = useState(false);
  const [aux, setAux] = useState<unknown[]>([]);
  useEffect(() => {
    let active = true;
    const preview = initialPreview || sessionStorage.getItem('magaram-preview') === 'true';
    if (initialPreview) sessionStorage.setItem('magaram-preview', 'true');
    setDemo(preview);
    setError('');
    setReady(false);
    if (preview) {
      setArticles(demoArticles);
      setUser('Preview editor');
      setReady(true);
      return;
    }
    api<{ user: { displayName: string; permissions: string[] } }>('/me')
      .then(async (me) => {
        if (!active) return;
        setUser(me.user.displayName);
        if (
          !me.user.permissions.some((p) =>
            ['*', 'articles:draft', 'articles:review', 'articles:fact-check'].includes(p),
          )
        ) {
          setArticles([]);
          return;
        }
        const data = await api<{ items: Article[] }>('/articles?limit=100');
        if (articleId && !data.items.some((article) => article.id === articleId))
          data.items.push(await api<Article>(`/articles/${articleId}`));
        if (active) setArticles(data.items);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [page, articleId, initialPreview]);
  useEffect(() => {
    if (demo || !ready) return;
    if (page === 'audit')
      api<{ items: unknown[] }>('/audit-logs')
        .then((d) => setAux(d.items))
        .catch((e) => setError(e.message));
    if (page === 'settings')
      api<{ settings: unknown[] }>('/settings')
        .then((d) => setAux(d.settings))
        .catch((e) => setError(e.message));
  }, [page, demo, ready]);
  const refresh = async () => {
    if (!demo) setArticles((await api<{ items: Article[] }>('/articles?limit=100')).items);
  };
  const selected = articles.find((a) => a.id === path[1]);
  const filtered = articles.filter(
    (a) =>
      (page !== 'review' || ['EDITOR_REVIEW', 'FACT_CHECK'].includes(a.status)) &&
      (filter === 'ALL' || a.status === filter) &&
      `${a.title} ${a.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  const title =
    navGroups
      .flatMap((g) => g.items)
      .find((n) => n[1] === `/admin${page === 'overview' ? '' : `/${page}`}`)?.[0] ||
    'Article editor';
  const editorView = page === 'articles' && (path[1] === 'new' || !!selected);
  return (
    <div className="workspace" lang="en">
      <aside className={`sidebar ${menu ? 'is-open' : ''}`}>
        <Brand />
        <div className="workspace-label">
          <span className="workspace-avatar">M</span>
          <div>
            <b>Magaram Media</b>
            <small>Editorial workspace</small>
          </div>
          <span className="workspace-plan">TEAM</span>
        </div>
        <nav>
          {navGroups.map((g) => (
            <div className="nav-group" key={g.label}>
              <p>{g.label}</p>
              {g.items.map(([label, href, icon]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenu(false)}
                  className={`nav-item ${href === `/admin${page === 'overview' ? '' : `/${page}`}` ? 'active' : ''}`}
                >
                  <Icon name={icon} />
                  {label}
                  {label === 'Review queue' && (
                    <span className="nav-count">
                      {
                        articles.filter((a) => ['EDITOR_REVIEW', 'FACT_CHECK'].includes(a.status))
                          .length
                      }
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="avatar">{user?.[0] || 'M'}</span>
          <div>
            <b>{user || 'Your workspace'}</b>
            <small>{demo ? 'Sample session' : 'Editorial team'}</small>
            <Link href="/admin/account">Account security</Link>
          </div>
          <button
            className="icon-button"
            aria-label="Sign out"
            onClick={async () => {
              if (!demo) await api('/auth/logout', { method: 'POST' }).catch(() => {});
              sessionStorage.removeItem('magaram-preview');
              router.push('/login');
            }}
          >
            <Icon name="logout" />
          </button>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-top">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenu(!menu)}
            >
              <Icon name="menu" />
            </button>
            <span>Workspace</span>
            <span>/</span>
            <b>{title}</b>
          </div>
          <div className="top-actions">
            <span className="environment">
              <i />
              {demo ? 'SAMPLE WORKSPACE' : 'LIVE WORKSPACE'}
            </span>
            <Link href="/" className="text-link">
              <Icon name="globe" />
              View website <span>↗</span>
            </Link>
          </div>
        </header>
        {demo && (
          <div className="preview-strip">
            <Icon name="shield" size={15} />
            Design preview · All articles and counts below are sample data. Publishing is disabled.
            <Link href="/login">Connect live workspace →</Link>
          </div>
        )}
        <main className="workspace-content">
          {!ready ? (
            <div className="empty-state">Loading your workspace…</div>
          ) : error ? (
            <div className="empty-state">
              <Icon name="shield" size={36} />
              <h2>Workspace connection needed</h2>
              <p>{error}</p>
              <Link className="button primary" href="/login">
                Sign in or open sample preview
              </Link>
            </div>
          ) : (
            <>
              {notice && (
                <div className="notice" role="status">
                  {notice}
                  <button
                    className="icon-button"
                    onClick={() => setNotice('')}
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
              )}
              {!editorView && (
                <div className="page-heading">
                  <div>
                    <span className="eyebrow">
                      {page === 'overview' ? 'YOUR NEWSROOM, AT A GLANCE' : 'MAGARAM WORKSPACE'}
                    </span>
                    <h1>{page === 'overview' ? 'Good stories start here.' : title}</h1>
                    <p className="muted">
                      {page === 'overview'
                        ? 'A clear view of your stories, your team, and what’s next.'
                        : page === 'articles'
                          ? 'From the first draft to the final word.'
                          : page === 'review'
                            ? 'Accuracy first. Every story earns your audience’s trust.'
                            : 'Manage your platform with a clear record of every action.'}
                    </p>
                  </div>
                  {['overview', 'articles', 'review'].includes(page) && (
                    <Link href="/admin/articles/new" className="button primary">
                      <Icon name="plus" size={18} />
                      New article
                    </Link>
                  )}
                </div>
              )}
              {page === 'overview' && (
                <>
                  <div className="stat-grid">
                    {[
                      ['All articles', articles.length, 'Your editorial library', 'news'],
                      [
                        'Published',
                        articles.filter((a) => ['PUBLISHED', 'UPDATED'].includes(a.status)).length,
                        'Available to readers',
                        'globe',
                      ],
                      [
                        'Awaiting review',
                        articles.filter((a) => ['EDITOR_REVIEW', 'FACT_CHECK'].includes(a.status))
                          .length,
                        'Ready for a second pair of eyes',
                        'check',
                      ],
                      [
                        'In progress',
                        articles.filter((a) => ['DRAFT', 'AI_DRAFT'].includes(a.status)).length,
                        'The next stories taking shape',
                        'clock',
                      ],
                    ].map(([label, value, caption, icon]) => (
                      <div className="stat-card" key={label}>
                        <div>
                          <span>{label}</span>
                          <Icon name={String(icon)} />
                        </div>
                        <strong>{value}</strong>
                        <small>{caption}</small>
                      </div>
                    ))}
                  </div>
                  <div className="overview-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Recent stories</h2>
                          <p>Your newsroom’s latest work</p>
                        </div>
                        <Link className="text-link" href="/admin/articles">
                          View all <Icon name="arrow" size={16} />
                        </Link>
                      </div>
                      <ArticleRows articles={articles.slice(0, 5)} />
                    </section>
                    <div className="overview-side">
                      <section className="editorial-note">
                        <span className="eyebrow">THE MAGARAM STANDARD</span>
                        <Icon name="shield" size={32} />
                        <h2>
                          Trust is our
                          <br />
                          first headline.
                        </h2>
                        <p>
                          Every source checked.
                          <br />
                          Every voice respected.
                          <br />
                          Every correction visible.
                        </p>
                        <Link href="/admin/review">
                          Open review queue <Icon name="arrow" size={18} />
                        </Link>
                      </section>
                      <section className="panel checklist">
                        <h3>Before you publish</h3>
                        {[
                          'Confirm your sources',
                          'Verify names and numbers',
                          'Add image credits',
                          'Get independent approval',
                        ].map((x) => (
                          <p key={x}>
                            <span className="check-circle">
                              <Icon name="check" size={12} />
                            </span>
                            {x}
                          </p>
                        ))}
                      </section>
                    </div>
                  </div>
                  <section className="quick-links">
                    <Link href="/admin/media">
                      <Icon name="image" />
                      <div>
                        <b>Media library</b>
                        <small>A home for every visual story</small>
                      </div>
                      <Icon name="arrow" />
                    </Link>
                    <Link href="/admin/ai">
                      <Icon name="spark" />
                      <div>
                        <b>Your editorial assistant</b>
                        <small>AI assistance, human judgment</small>
                      </div>
                      <Icon name="arrow" />
                    </Link>
                    <Link href="/preview">
                      <Icon name="grid" />
                      <div>
                        <b>Project milestones</b>
                        <small>Explore the phase previews</small>
                      </div>
                      <Icon name="arrow" />
                    </Link>
                  </section>
                </>
              )}
              {['articles', 'review'].includes(page) && !editorView && (
                <section className="panel">
                  <div className="table-toolbar">
                    <div className="search-field">
                      <Icon name="search" size={18} />
                      <input
                        aria-label="Search articles"
                        placeholder="Search stories…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <select
                      aria-label="Filter by status"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="ALL">All statuses</option>
                      {Object.entries(labels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <span className="muted">{filtered.length} stories</span>
                  </div>
                  <ArticleRows articles={filtered} />
                </section>
              )}
              {editorView && (
                <ArticleEditor
                  article={selected}
                  demo={demo}
                  onSaved={async () => {
                    await refresh();
                    setNotice('Article saved.');
                    router.push('/admin/articles');
                  }}
                />
              )}
              {page === 'media' && <MediaLibrary demo={demo} />}
              {page === 'settings' && (
                <section className="panel settings-panel">
                  <h2>Publication identity</h2>
                  <label>
                    Tamil name
                    <input value="மகரம் மீடியா" readOnly />
                  </label>
                  <label>
                    Contact email
                    <input value={contactEmail} readOnly />
                  </label>
                  <p className="muted">Brand: Orange · Coral · Burgundy</p>
                  {!demo && <pre>{JSON.stringify(aux, null, 2)}</pre>}
                </section>
              )}
              {['settings', 'account'].includes(page) && <AccountSecurity demo={demo} />}
              {page === 'audit' && (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Audit trail</h2>
                    <span className="muted">Most recent actions</span>
                  </div>
                  {demo ? (
                    <div className="empty-state">
                      <Icon name="shield" size={32} />
                      <h3>No real actions in sample mode</h3>
                      <p>Authenticated changes are recorded here in the live workspace.</p>
                    </div>
                  ) : (
                    <pre className="data-view">{JSON.stringify(aux, null, 2)}</pre>
                  )}
                </section>
              )}
              {page === 'ai' && <AiWorkbench articles={articles} demo={demo} />}
              {page === 'businesses' && <LocalWorkbench demo={demo} />}
              {page === 'taxonomy' && <Taxonomy demo={demo} />}
              {![
                'overview',
                'articles',
                'review',
                'media',
                'settings',
                'audit',
                'ai',
                'account',
                'taxonomy',
                'businesses',
              ].includes(page) && (
                <section className="panel empty-state">
                  <Icon name={page === 'ai' ? 'spark' : 'clock'} size={40} />
                  <span className="eyebrow">UPCOMING PHASE</span>
                  <h2>{title}</h2>
                  <p>
                    This module is being built in the next project milestone. No provider is
                    connected yet.
                  </p>
                  <Link href="/preview" className="button secondary">
                    See phase progress <Icon name="arrow" />
                  </Link>
                </section>
              )}
            </>
          )}
        </main>
        <footer className="workspace-footer">
          <span>மகரம் மீடியா</span>
          <span>Independent journalism. Connected communities.</span>
          <Link href="/preview">Project progress ↗</Link>
        </footer>
      </div>
    </div>
  );
}
function ArticleRows({ articles }: { articles: Article[] }) {
  return (
    <div className="table-scroll">
      <table className="article-table">
        <thead>
          <tr>
            <th>STORY</th>
            <th>STATUS</th>
            <th>AUTHOR</th>
            <th>LOCATION</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {articles.map((a, i) => (
            <tr key={a.id}>
              <td>
                <Link className="story-cell" href={`/admin/articles/${a.id}`}>
                  <div className={`story-thumb tint-${i % 4}`}>
                    <Icon name="news" size={22} />
                  </div>
                  <span>
                    <small>
                      {a.category}
                      {a.isDemo ? ' · SAMPLE' : ''}
                    </small>
                    <b lang="ta">{a.title}</b>
                  </span>
                </Link>
              </td>
              <td>
                <Status status={a.status} />
              </td>
              <td>
                <div className="author-cell">
                  <span className="avatar small">ம</span>
                  <span lang="ta">{a.author.displayName}</span>
                </div>
              </td>
              <td>
                <span className="location-cell" lang="ta">
                  {a.location}
                </span>
              </td>
              <td>
                <Link href={`/admin/articles/${a.id}`} aria-label={`Edit ${a.title}`}>
                  <Icon name="chevron" size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!articles.length && (
        <div className="empty-state">
          <h3>No stories found</h3>
          <p>Create an article or change your filters.</p>
        </div>
      )}
    </div>
  );
}
function ArticleEditor({
  article,
  demo,
  onSaved,
}: {
  article?: Article;
  demo: boolean;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sources, setSources] = useState(
    article?.sources.map(({ label, url }) => ({ label, url })) || [{ label: '', url: '' }],
  );
  const [claims, setClaims] = useState(
    article?.claims.map(({ text }) => ({ text })) || [{ text: '' }],
  );
  const [scheduledAt, setScheduledAt] = useState('');
  const editable = !article || ['DRAFT', 'AI_DRAFT'].includes(article.status);
  const [taxonomy, setTaxonomy] = useState<TaxonomyItem[]>([]);
  const [media, setMedia] = useState<{ id: string; alt: string; credit: string }[]>([]);
  useEffect(() => {
    if (demo) return;
    let active = true;
    api<TaxonomyItem[]>('/taxonomy')
      .then((items) => {
        if (active) setTaxonomy(items);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    if (editable)
      api<typeof media>('/media')
        .then((items) => {
          if (active) setMedia(items);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [demo, editable]);
  const transitions: Partial<Record<ArticleStatus, ArticleStatus[]>> = {
    DRAFT: ['EDITOR_REVIEW'],
    AI_DRAFT: ['EDITOR_REVIEW'],
    EDITOR_REVIEW: ['DRAFT', 'FACT_CHECK'],
    FACT_CHECK: ['DRAFT', 'APPROVED'],
    APPROVED: ['SCHEDULED', 'PUBLISHED', 'DRAFT'],
    SCHEDULED: ['DRAFT'],
    PUBLISHED: ['ARCHIVED'],
    UPDATED: ['ARCHIVED'],
  };
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (demo) {
      setMessage('Sample draft validated locally. Sign in to a connected workspace to save it.');
      setBusy(false);
      return;
    }
    try {
      await api(article ? `/articles/${article.id}` : '/articles', {
        method: article ? 'PUT' : 'POST',
        body: JSON.stringify({
          ...f,
          sensitive: f.sensitive === 'on',
          sponsored: f.sponsored === 'on',
          sources: sources.filter((source) => source.url.trim()),
          claims: claims.filter((claim) => claim.text.trim()),
          tags: String(f.tags || '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          imageId: f.imageId || null,
          ...(article ? { version: article.version } : {}),
        }),
      });
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <Link href="/admin/articles" className="back-link">
            ← All articles
          </Link>
          <h1>{article ? 'Edit story' : 'A new story begins.'}</h1>
        </div>
        {article && <Status status={article.status} />}
      </div>
      <form className="editor-grid" onSubmit={save}>
        <section className="panel editor-fields">
          <label>
            Headline <span lang="ta">தலைப்பு</span>
            <input
              name="title"
              lang="ta"
              required
              minLength={5}
              maxLength={250}
              defaultValue={article?.title}
              placeholder="உங்கள் செய்தியின் தலைப்பு…"
              className="headline-input"
            />
          </label>
          <label>
            URL slug
            <input
              name="slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={191}
              defaultValue={article?.slug}
              placeholder="your-story-slug"
            />
          </label>
          <label>
            Summary
            <textarea
              name="summary"
              required
              minLength={10}
              maxLength={1000}
              rows={3}
              defaultValue={article?.summary}
              placeholder="The story in a few clear sentences…"
            />
          </label>
          <label>
            Story
            <textarea
              name="body"
              required
              minLength={30}
              rows={14}
              defaultValue={article?.body}
              placeholder="Start with what you know. Build on what you can verify."
            />
          </label>
          <p className="fineprint">
            Plain text is rendered safely. Paragraphs are separated by a blank line.
          </p>
        </section>
        <aside className="editor-aside">
          <section className="panel editor-fields">
            <h3>Story details</h3>
            <label>
              SEO title
              <input name="seoTitle" maxLength={250} defaultValue={article?.seoTitle || ''} />
            </label>
            <label>
              SEO description
              <textarea
                name="seoDescription"
                maxLength={320}
                defaultValue={article?.seoDescription || ''}
              />
            </label>
            <label>
              Story image
              <select name="imageId" defaultValue={article?.image?.id || ''}>
                <option value="">No image</option>
                {article?.image && !media.some((item) => item.id === article.image!.id) && (
                  <option value={article.image.id}>{article.image.alt}</option>
                )}
                {media.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.alt} · {item.credit}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tags (comma-separated)
              <input name="tags" defaultValue={article?.tags.join(', ')} />
            </label>
            <label>
              Category
              <select name="category" defaultValue={article?.category || 'உள்ளூர்'}>
                {[
                  ...new Set([
                    article?.category || 'உள்ளூர்',
                    ...(demo
                      ? ['உள்ளூர்', 'தமிழ்நாடு', 'வணிகம்', 'கல்வி', 'வாழ்க்கை', 'கலை', 'அரசியல்']
                      : taxonomy
                          .filter((item) => item.kind === 'category')
                          .map((item) => item.name)),
                  ]),
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Location
              <input
                name="location"
                list="registered-locations"
                required
                defaultValue={article?.location || 'சென்னை'}
                maxLength={100}
              />
              <datalist id="registered-locations">
                {taxonomy
                  .filter((item) => item.kind === 'location')
                  .map((item) => (
                    <option key={item.id} value={item.name} />
                  ))}
              </datalist>
            </label>
            <label>
              Story type
              <select name="type" defaultValue={article?.type || 'NEWS'}>
                {[
                  'NEWS',
                  'BREAKING',
                  'OPINION',
                  'ANALYSIS',
                  'INTERVIEW',
                  'PRESS_RELEASE',
                  'PHOTO_STORY',
                  'VIDEO',
                  'LIVE',
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="checkbox">
              <input type="checkbox" name="sensitive" defaultChecked={article?.sensitive} />
              Sensitive subject
            </label>
            <label className="checkbox">
              <input type="checkbox" name="sponsored" defaultChecked={article?.sponsored} />
              Sponsored content
            </label>
          </section>
          <section className="panel editor-fields">
            <h3>Sources & verification</h3>
            {sources.map((source, index) => (
              <div key={index}>
                <label>
                  Source name
                  <input
                    value={source.label}
                    minLength={2}
                    maxLength={250}
                    onChange={(e) =>
                      setSources(
                        sources.map((s, i) => (i === index ? { ...s, label: e.target.value } : s)),
                      )
                    }
                  />
                </label>
                <label>
                  Source URL
                  <input
                    type="url"
                    value={source.url}
                    onChange={(e) =>
                      setSources(
                        sources.map((s, i) => (i === index ? { ...s, url: e.target.value } : s)),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setSources(sources.filter((_, i) => i !== index))}
                >
                  Remove source
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button secondary"
              disabled={sources.length >= 30}
              onClick={() => setSources([...sources, { label: '', url: '' }])}
            >
              Add source
            </button>
            {claims.map((claim, index) => (
              <label key={index}>
                Claim to verify
                <textarea
                  rows={3}
                  value={claim.text}
                  onChange={(e) =>
                    setClaims(claims.map((c, i) => (i === index ? { text: e.target.value } : c)))
                  }
                />
              </label>
            ))}
            <button
              type="button"
              className="button secondary"
              disabled={claims.length >= 30}
              onClick={() => setClaims([...claims, { text: '' }])}
            >
              Add claim
            </button>
            <p className="fineprint">
              Another editor must verify your sources and approve publication.
            </p>
          </section>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
          {!editable && (
            <p className="notice">
              Return this story to Draft before editing. Published stories use the correction form
              below.
            </p>
          )}
          <button className="button primary full" disabled={busy || !editable}>
            {busy ? 'Saving…' : demo ? 'Validate sample draft' : 'Save draft'}
            <Icon name="check" size={18} />
          </button>
          {article?.status === 'APPROVED' && (
            <label>
              Schedule in your local time
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </label>
          )}
          {article &&
            (transitions[article.status] || []).map((target) => (
              <button
                key={target}
                type="button"
                className="button secondary full"
                disabled={demo || busy || (target === 'SCHEDULED' && !scheduledAt)}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await api(`/articles/${article.id}/transition`, {
                      method: 'POST',
                      body: JSON.stringify({
                        status: target,
                        version: article.version,
                        ...(target === 'SCHEDULED'
                          ? { scheduledAt: new Date(scheduledAt).toISOString() }
                          : {}),
                      }),
                    });
                    await onSaved();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Move to {labels[target]}
              </button>
            ))}
        </aside>
      </form>
      {article && (
        <EditorialReview
          key={`${article.id}-${article.version}`}
          article={article}
          demo={demo}
          onSaved={onSaved}
        />
      )}
      {!!article?.corrections.length && (
        <section className="panel editor-fields">
          <h3>Corrections</h3>
          {article.corrections.map((c) => (
            <p key={c.id}>{c.reason}</p>
          ))}
        </section>
      )}
    </>
  );
}
function MediaLibrary({ demo }: { demo: boolean }) {
  const [items, setItems] = useState<{ id: string; alt: string; credit: string }[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!demo)
      api<typeof items>('/media')
        .then(setItems)
        .catch((e) => setError(e.message));
  }, [demo]);
  return (
    <section className="panel editor-fields">
      <h2>Every image needs a story.</h2>
      <p className="muted">
        Upload a PNG, JPEG, or WebP image, up to 8 MB. Credit and alternative text are required.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          if (demo) {
            setError('Uploads are disabled in sample mode.');
            return;
          }
          const f = new FormData(e.currentTarget);
          const file = f.get('file') as File;
          try {
            const item = await api<{ id: string; alt: string; credit: string }>('/media', {
              method: 'POST',
              body: file,
              headers: {
                'Content-Type': file.type,
                'x-media-alt': encodeURIComponent(String(f.get('alt'))),
                'x-media-credit': encodeURIComponent(String(f.get('credit'))),
              },
            });
            setItems([item, ...items]);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <label>
          Image
          <input type="file" name="file" accept="image/png,image/jpeg,image/webp" required />
        </label>
        <label>
          Alternative text
          <input name="alt" required minLength={3} maxLength={300} />
        </label>
        <label>
          Credit / rights holder
          <input name="credit" required minLength={3} maxLength={300} />
        </label>
        <button className="button primary">Upload image</button>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="media-grid">
        {items.map((i) => (
          <div key={i.id}>
            <span>{i.alt}</span>
            <small>{i.credit}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
