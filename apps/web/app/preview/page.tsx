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
        Contact: magaram.in@gmail.com · Hosting: AWS · Database execution awaiting permission
      </div>
      <div className="phase-grid">
        {phaseNames.map((name, i) => (
          <article className="phase-card" key={name}>
            <span className="number">{String(i).padStart(2, '0')}</span>
            <h2>{name}</h2>
            <span
              className={`status ${i < 2 ? 'status-approved' : i === 2 ? 'status-editor_review' : ''}`}
            >
              {i === 0
                ? 'Complete'
                : i === 1
                  ? 'Built · integration pending'
                  : i === 2
                    ? 'In progress'
                    : 'Planned'}
            </span>
            <p>
              {i === 0
                ? 'Repository audit and architecture plan.'
                : i === 1
                  ? 'Brand, sign-in, sessions, permissions, and governance.'
                  : i === 2
                    ? 'Article editor, review workflow, source verification, revisions and media.'
                    : 'Implementation follows the preceding milestone. This phase is not complete yet.'}
            </p>
            {i === 1 && (
              <Link className="button secondary" href="/login">
                Preview foundation <Icon name="arrow" size={16} />
              </Link>
            )}
            {i === 2 && (
              <Link className="button secondary" href="/login">
                Open newsroom preview <Icon name="arrow" size={16} />
              </Link>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
