import Link from 'next/link';
import { Brand, Icon } from '../_components/brand';
import { phaseNames } from '../_lib/data';
export default function Previews() {
  return (
    <main className="preview-page" lang="en">
      <header>
        <Brand />
        <Link href="/" className="text-link">
          View website <Icon name="arrow" />
        </Link>
      </header>
      <span className="eyebrow">BUILDING MAGARAM, TOGETHER</span>
      <h1>A clear view of every phase.</h1>
      <p className="muted">
        Explore what’s built, what’s in progress, and what needs a live service connection.
      </p>
      <div className="notice" style={{ marginTop: 25 }}>
        Contact: magaram.in@gmail.com · Hosting: AWS preview · Public previews use sample content
        only
      </div>
      <div className="phase-grid">
        {phaseNames.map((name, i) => (
          <article className="phase-card" key={name}>
            <span className="number">{String(i).padStart(2, '0')}</span>
            <h2>{name}</h2>
            <span
              className={`status ${i < 2 ? 'status-approved' : i === 2 || i === 4 ? 'status-editor_review' : ''}`}
            >
              {i === 0
                ? 'Complete'
                : i === 1
                  ? 'Core verified locally'
                  : i === 2
                    ? 'In progress'
                    : i === 3
                      ? 'Preparation built · provider pending'
                      : i === 4
                        ? 'Public experience preview'
                        : i === 13
                          ? 'AWS preview live'
                          : 'Planned'}
            </span>
            <p>
              {i === 0
                ? 'Repository audit and architecture plan.'
                : i === 1
                  ? 'Brand, sign-in, sessions, permissions, and governance.'
                  : i === 2
                    ? 'Article editor, review workflow, source verification, revisions and media.'
                    : i === 3
                      ? 'Source-bound prompts, local preparation, audit trail and proposal validation. No live AI generation.'
                      : i === 4
                        ? 'Tamil-first public news pages, article reading, editorial trust information and responsive layouts.'
                        : 'Implementation follows the preceding milestone. This phase is not complete yet.'}
            </p>
            {i === 1 && (
              <Link className="button secondary" href="/preview/1">
                Preview foundation <Icon name="arrow" size={16} />
              </Link>
            )}
            {i === 2 && (
              <Link className="button secondary" href="/preview/2">
                Open newsroom preview <Icon name="arrow" size={16} />
              </Link>
            )}
            {i === 3 && (
              <Link className="button secondary" href="/preview/3">
                Preview AI safeguards <Icon name="arrow" size={16} />
              </Link>
            )}
            {i === 4 && (
              <Link className="button secondary" href="/preview/4">
                Preview public website <Icon name="arrow" size={16} />
              </Link>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
