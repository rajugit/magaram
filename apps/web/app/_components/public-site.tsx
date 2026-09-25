import Image from 'next/image';
import Link from 'next/link';

import {
  escapeJsonLd,
  formatPublishedDate,
  siteUrl,
  type PublicArticle,
  type PublicNewsPage,
} from '../_lib/public-data';

const categoryLabel = (category: string) => category || 'செய்தி';
const route = (pathPrefix: string, path: string) => `${pathPrefix}${path}`;

function StoryMark({ index }: { index: number }) {
  return (
    <div className={`story-mark story-mark-${index % 4}`} aria-hidden="true">
      <span />
      <i />
    </div>
  );
}

export function PublicHeader({ pathPrefix = '' }: { pathPrefix?: string }) {
  return (
    <>
      <a className="skip-link" href="#content">
        உள்ளடக்கத்திற்குச் செல்லவும்
      </a>
      <header className="public-header">
        <Link className="public-brand" href={pathPrefix || '/'} aria-label="மகரம் மீடியா முகப்பு">
          <Image
            src="/brand/magaram-logo.png"
            alt=""
            width={180}
            height={180}
            priority
            className="public-brand-mark"
          />
          <span>
            <strong>மகரம்</strong>
            <small>MEDIA · மக்களின் குரல்</small>
          </span>
        </Link>
        <nav aria-label="முதன்மை வழிசெலுத்தல்" className="public-nav">
          <Link href={route(pathPrefix, '/news')}>செய்திகள்</Link>
          <Link href={route(pathPrefix, '/trust')}>நம்பிக்கை</Link>
          <Link href="/local">உள்ளூர் நிறுவனங்கள்</Link>
          <Link className="public-login" href="/login">
            செய்தியகம்
          </Link>
        </nav>
      </header>
    </>
  );
}

function StoryCard({
  article,
  index,
  pathPrefix = '',
}: {
  article: PublicArticle;
  index: number;
  pathPrefix?: string;
}) {
  return (
    <article className="story-card">
      <StoryMark index={index} />
      <div className="story-card-body">
        <div className="story-meta">
          <span>{categoryLabel(article.category)}</span>
          <span>{article.location}</span>
        </div>
        <h3>
          <Link href={route(pathPrefix, `/news/${article.slug}`)}>{article.title}</Link>
        </h3>
        <p>{article.summary}</p>
        <div className="story-footer">
          <time dateTime={article.publishedAt || article.updatedAt}>
            {formatPublishedDate(article.publishedAt || article.updatedAt)}
          </time>
          <Link
            href={route(pathPrefix, `/news/${article.slug}`)}
            aria-label={`${article.title} படிக்கவும்`}
          >
            படிக்கவும் <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

function NoPublishedStories({ preview }: { preview?: boolean }) {
  return (
    <section className="news-empty" aria-live="polite">
      <span className="section-kicker">மகரம் செய்திகள்</span>
      <h2>{preview ? 'மாதிரி செய்தி இடம்' : 'சரிபார்க்கப்பட்ட செய்திகள் விரைவில் வரும்.'}</h2>
      <p>
        {preview
          ? 'இந்த முன்னோட்டத்தில் காண்பிக்கப்படும் உள்ளடக்கம் மாதிரிக்காக மட்டுமே.'
          : 'செய்தியகத்தின் தனிப்பட்ட சரிபார்ப்பு மற்றும் ஆசிரியர் ஒப்புதலுக்குப் பிறகே செய்திகள் இங்கே வெளியிடப்படும்.'}
      </p>
    </section>
  );
}

export function PublicHome({
  news,
  locations = [],
  preview = false,
  pathPrefix = '',
}: {
  news: PublicNewsPage;
  locations?: string[];
  preview?: boolean;
  pathPrefix?: string;
}) {
  const [lead, ...rest] = news.items;
  const categories = [...new Set(news.items.map((article) => article.category))].slice(0, 5);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'மகரம் மீடியா',
    alternateName: 'Magaram Media',
    url: siteUrl,
    inLanguage: 'ta-IN',
  };
  return (
    <div className="public-shell">
      <PublicHeader pathPrefix={pathPrefix} />
      <main id="content" className="public-main">
        {preview && (
          <p className="preview-ribbon">PHASE 4 DESIGN PREVIEW · மாதிரி உள்ளடக்கம் மட்டும்</p>
        )}
        <section className="public-hero" aria-labelledby="public-hero-title">
          <div>
            <p className="section-kicker">மகரம் மீடியா</p>
            <h1 id="public-hero-title">நம் ஊரின் கதைகள். நம்பிக்கையுடன்.</h1>
            <p>
              மனிதர்களை மையமாகக் கொண்ட தமிழ் செய்திகளையும் உள்ளூர் பார்வைகளையும் பொறுப்புடன்
              வெளியிடும் முயற்சி.
            </p>
            <div className="hero-actions">
              <Link className="public-button" href={route(pathPrefix, '/news')}>
                சமீபத்திய செய்திகள் <span aria-hidden="true">→</span>
              </Link>
              <Link className="public-text-link" href={route(pathPrefix, '/trust')}>
                எங்கள் ஆசிரியர் உறுதி
              </Link>
            </div>
          </div>
          <aside className="hero-principles" aria-label="ஆசிரியர் உறுதிமொழி">
            <span>01</span>
            <p>ஆதாரங்களும் சுயாதீன ஆசிரியர் மதிப்பாய்வும் இல்லாமல் செய்தி வெளியிடப்படாது.</p>
            <div />
            <span>02</span>
            <p>பிழைகள் கண்டறியப்பட்டால், திருத்தங்கள் வெளிப்படையாகக் குறிக்கப்படும்.</p>
          </aside>
        </section>

        {lead ? (
          <>
            <section className="lead-story" aria-labelledby="lead-story-title">
              <StoryMark index={0} />
              <div className="lead-story-body">
                <div className="story-meta">
                  <span>{categoryLabel(lead.category)}</span>
                  <span>{lead.location}</span>
                  {lead.sponsored && <span className="sponsored-label">ஆதரவு உள்ளடக்கம்</span>}
                </div>
                <h2 id="lead-story-title">
                  <Link href={route(pathPrefix, `/news/${lead.slug}`)}>{lead.title}</Link>
                </h2>
                <p>{lead.summary}</p>
                <div className="lead-byline">
                  <span>{lead.author.displayName}</span>
                  <time dateTime={lead.publishedAt || lead.updatedAt}>
                    {formatPublishedDate(lead.publishedAt || lead.updatedAt)}
                  </time>
                </div>
                <Link className="public-text-link" href={route(pathPrefix, `/news/${lead.slug}`)}>
                  முழு செய்தியைப் படிக்கவும் <span aria-hidden="true">→</span>
                </Link>
              </div>
            </section>

            <section className="news-section" aria-labelledby="latest-heading">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">செய்திகள்</p>
                  <h2 id="latest-heading">சமீபத்திய பார்வைகள்</h2>
                </div>
                <Link href={route(pathPrefix, '/news')} className="public-text-link">
                  அனைத்தையும் பார்க்கவும் <span aria-hidden="true">→</span>
                </Link>
              </div>
              <div className="story-grid">
                {rest.slice(0, 6).map((article, index) => (
                  <StoryCard
                    article={article}
                    index={index + 1}
                    key={article.id}
                    pathPrefix={pathPrefix}
                  />
                ))}
              </div>
            </section>
          </>
        ) : (
          <NoPublishedStories preview={preview} />
        )}

        <section className="discovery-strip" aria-labelledby="discover-heading">
          <div>
            <p className="section-kicker">தொடர்ந்து பாருங்கள்</p>
            <h2 id="discover-heading">உங்கள் ஊரிலிருந்து தொடங்கும் உரையாடல்கள்.</h2>
          </div>
          <div className="category-links" aria-label="செய்தி வகைகள் மற்றும் இடங்கள்">
            {(categories.length ? categories : ['உள்ளூர்', 'வாழ்க்கை', 'கல்வி']).map((category) => (
              <Link
                href={route(pathPrefix, `/news/category/${encodeURIComponent(category)}`)}
                key={`category-${category}`}
              >
                {category}
              </Link>
            ))}
            {locations.slice(0, 5).map((location) => (
              <Link
                href={route(pathPrefix, `/news/location/${encodeURIComponent(location)}`)}
                key={`location-${location}`}
              >
                {location}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter pathPrefix={pathPrefix} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(jsonLd) }}
      />
    </div>
  );
}

export function NewsIndex({
  news,
  category,
  location,
  q,
  pathPrefix = '',
  basePath = '/news',
}: {
  news: PublicNewsPage;
  category?: string;
  location?: string;
  q?: string;
  pathPrefix?: string;
  basePath?: string;
}) {
  const query = new URLSearchParams();
  if (category) query.set('category', category);
  if (location) query.set('location', location);
  if (q) query.set('q', q);
  const queryString = query.toString();
  return (
    <div className="public-shell">
      <PublicHeader pathPrefix={pathPrefix} />
      <main id="content" className="public-main news-index">
        <header className="section-intro">
          <p className="section-kicker">செய்திகள்</p>
          <h1>
            {category
              ? `${category} செய்திகள்`
              : location
                ? `${location} செய்திகள்`
                : 'சமீபத்திய செய்திகள்'}
          </h1>
          <p>வெளியிடப்பட்ட செய்திகளும் கட்டுரைகளும் மட்டும் இங்கே காட்டப்படுகின்றன.</p>
          <form method="get" className="news-filter" role="search" aria-label="செய்தி தேடல்">
            {category && <input type="hidden" name="category" value={category} />}
            {location && <input type="hidden" name="location" value={location} />}
            <label htmlFor="news-query">செய்திகளைத் தேடுங்கள்</label>
            <div>
              <input
                id="news-query"
                name="q"
                type="search"
                defaultValue={q}
                maxLength={200}
                placeholder="தலைப்பு அல்லது வகை"
              />
              <button type="submit">தேடுங்கள்</button>
            </div>
          </form>
        </header>
        {news.items.length ? (
          <div className="story-grid story-grid-expanded">
            {news.items.map((article, index) => (
              <StoryCard article={article} index={index} key={article.id} pathPrefix={pathPrefix} />
            ))}
          </div>
        ) : (
          <NoPublishedStories />
        )}
        <nav className="pagination" aria-label="செய்திப் பக்கங்கள்">
          {news.page > 1 && (
            <Link
              href={route(
                pathPrefix,
                `${basePath}?page=${news.page - 1}${queryString ? `&${queryString}` : ''}`,
              )}
            >
              ← முந்தையது
            </Link>
          )}
          {news.page * news.limit < news.total && (
            <Link
              href={route(
                pathPrefix,
                `${basePath}?page=${news.page + 1}${queryString ? `&${queryString}` : ''}`,
              )}
            >
              அடுத்தது →
            </Link>
          )}
        </nav>
      </main>
      <PublicFooter pathPrefix={pathPrefix} />
    </div>
  );
}

export function PublicArticlePage({
  article,
  pathPrefix = '',
}: {
  article: PublicArticle;
  pathPrefix?: string;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.seoTitle || article.title,
    description: article.seoDescription || article.summary,
    datePublished: article.publishedAt || article.updatedAt,
    dateModified: article.updatedAt,
    inLanguage: 'ta-IN',
    mainEntityOfPage: `${siteUrl}/news/${article.slug}`,
    author: { '@type': 'Person', name: article.author.displayName },
    publisher: {
      '@type': 'Organization',
      name: 'மகரம் மீடியா',
      url: siteUrl,
    },
  };
  return (
    <div className="public-shell">
      <PublicHeader pathPrefix={pathPrefix} />
      <main id="content" className="public-main article-page">
        <nav className="breadcrumbs" aria-label="வழித்தடம்">
          <Link href={pathPrefix || '/'}>முகப்பு</Link>
          <span aria-hidden="true">/</span>
          <Link href={route(pathPrefix, '/news')}>செய்திகள்</Link>
          <span aria-hidden="true">/</span>
          <span>{article.category}</span>
        </nav>
        <article className="article-layout">
          <header className="article-header">
            <div className="story-meta">
              <span>{categoryLabel(article.category)}</span>
              <span>{article.location}</span>
              {article.sponsored && <span className="sponsored-label">ஆதரவு உள்ளடக்கம்</span>}
            </div>
            <h1>{article.title}</h1>
            <p className="article-summary">{article.summary}</p>
            <div className="article-byline">
              <span>{article.author.displayName}</span>
              <time dateTime={article.publishedAt || article.updatedAt}>
                {formatPublishedDate(article.publishedAt || article.updatedAt)}
              </time>
            </div>
          </header>
          <StoryMark index={2} />
          <div className="article-content">
            {article.body
              .replace(/\r/g, '')
              .split(/\n{2,}/)
              .filter(Boolean)
              .map((paragraph, index) => (
                <p key={`${article.id}-${index}`}>{paragraph}</p>
              ))}
          </div>
          {article.corrections.length > 0 && (
            <aside className="corrections-note" aria-labelledby="corrections-heading">
              <p className="section-kicker">திருத்தங்கள்</p>
              <h2 id="corrections-heading">இந்தக் கட்டுரையில் செய்யப்பட்ட திருத்தங்கள்</h2>
              <ul>
                {article.corrections.map((correction) => (
                  <li key={correction.id}>
                    <span>{correction.reason}</span>
                    <time dateTime={correction.createdAt}>
                      {formatPublishedDate(correction.createdAt)}
                    </time>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </article>
      </main>
      <PublicFooter pathPrefix={pathPrefix} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(jsonLd) }}
      />
    </div>
  );
}

export function TrustPage({ pathPrefix = '' }: { pathPrefix?: string }) {
  return (
    <div className="public-shell">
      <PublicHeader pathPrefix={pathPrefix} />
      <main id="content" className="public-main trust-page">
        <header className="section-intro">
          <p className="section-kicker">நம்பிக்கை</p>
          <h1>செய்திக்கு முன் பொறுப்பு.</h1>
          <p>
            மகரம் மீடியா வெளியிடும் ஒவ்வொரு செய்திக்கும் மனிதர்களின் வாழ்க்கையும் பொதுநலனும்
            முக்கியம்.
          </p>
        </header>
        <div className="trust-grid">
          <section>
            <span>01</span>
            <h2>ஆதாரங்களை மதிப்போம்</h2>
            <p>
              செய்தியகத்தில் ஆதாரங்களும் கோரிக்கைகளும் தனித்தனியாகப் பதிவு செய்து
              சரிபார்க்கப்படுகின்றன.
            </p>
          </section>
          <section>
            <span>02</span>
            <h2>சுயாதீன ஒப்புதல்</h2>
            <p>
              ஒரு கட்டுரையை எழுதிய நபர் அதனைத் தனியாக ஒப்புதல் அளிக்க முடியாது. வெளியீட்டிற்கு
              ஆசிரியர் மதிப்பாய்வு தேவை.
            </p>
          </section>
          <section>
            <span>03</span>
            <h2>திருத்தம் வெளிப்படையாக</h2>
            <p>
              பிழை கண்டறியப்பட்டால் அதன் காரணமும் திருத்த தேதியும் கட்டுரையுடன் தெளிவாகக்
              காட்டப்படும்.
            </p>
          </section>
        </div>
        <section className="trust-contact">
          <div>
            <p className="section-kicker">தொடர்புக்கு</p>
            <h2>பிழை, திருத்தம் அல்லது செய்திக் குறிப்பு தெரிவிக்க விரும்புகிறீர்களா?</h2>
          </div>
          <a href="mailto:magaram.in@gmail.com?subject=Magaram%20Media%20correction%20or%20news%20tip">
            magaram.in@gmail.com
          </a>
        </section>
      </main>
      <PublicFooter pathPrefix={pathPrefix} />
    </div>
  );
}

export function PublicFooter({ pathPrefix = '' }: { pathPrefix?: string }) {
  return (
    <footer className="public-footer">
      <div>
        <strong>மகரம் மீடியா</strong>
        <p>நம் ஊரின் குரல்களுக்கும் நம்பகமான செய்திகளுக்கும்.</p>
      </div>
      <nav aria-label="அடிக்குறிப்பு வழிசெலுத்தல்">
        <Link href={route(pathPrefix, '/news')}>செய்திகள்</Link>
        <Link href={route(pathPrefix, '/trust')}>நம்பிக்கை</Link>
        <a href="mailto:magaram.in@gmail.com">தொடர்பு</a>
      </nav>
    </footer>
  );
}
