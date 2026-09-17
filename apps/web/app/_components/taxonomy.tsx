'use client';
import { useEffect, useState } from 'react';
import { api } from '../_lib/api';
export type TaxonomyItem = { id: string; kind: string; name: string; slug: string };
export function Taxonomy({ demo }: { demo: boolean }) {
  const [items, setItems] = useState<TaxonomyItem[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!demo)
      api<TaxonomyItem[]>('/taxonomy')
        .then(setItems)
        .catch((e) => setError(e.message));
  }, [demo]);
  return (
    <section className="panel editor-fields">
      <h2>Categories, locations & tags</h2>
      <p>
        Editors register shared classifications here. Existing article names remain stable; renaming
        or deleting used classifications is not enabled.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (demo) return;
          const form = e.currentTarget;
          setError('');
          setBusy(true);
          try {
            await api('/taxonomy', {
              method: 'POST',
              body: JSON.stringify(Object.fromEntries(new FormData(form))),
            });
            setItems(await api('/taxonomy'));
            form.reset();
          } catch (error) {
            setError((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Kind
          <select name="kind">
            <option value="category">Category</option>
            <option value="location">Location</option>
            <option value="tag">Tag</option>
          </select>
        </label>
        <label>
          Tamil display name
          <input name="name" required maxLength={100} />
        </label>
        <label>
          Stable URL name
          <input
            name="slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={100}
            placeholder="chennai"
          />
        </label>
        <button className="button primary" disabled={demo || busy}>
          Add classification
        </button>
      </form>
      {demo && (
        <p className="notice">Sample mode. Sign in as an editor to manage real classifications.</p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.kind} · {item.name} · {item.slug}
          </li>
        ))}
      </ul>
    </section>
  );
}
