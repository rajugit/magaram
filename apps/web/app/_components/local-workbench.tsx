'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../_lib/api';

type Offer = { id: string; title: string; status: string; startsAt: string; endsAt: string };
type Business = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  location: string;
  phone?: string | null;
  website?: string | null;
  status: string;
  offers: Offer[];
};
type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: string;
  consentAt: string;
  business: { name: string };
};
const sample: Business[] = [
  {
    id: 'sample-business',
    name: 'மாதிரி புத்தக நிலையம்',
    slug: 'sample-bookshop',
    description: 'வடிவமைப்பிற்கான மாதிரி நிறுவனம். உண்மையான வணிகப் பட்டியல் அல்ல.',
    category: 'புத்தகங்கள்',
    location: 'மதுரை',
    status: 'PENDING',
    offers: [],
  },
];

export function LocalWorkbench({ demo }: { demo: boolean }) {
  const [businesses, setBusinesses] = useState<Business[]>(demo ? sample : []);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(!demo);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Business | null>(null);
  const refresh = async () => {
    const [nextBusinesses, nextLeads] = await Promise.all([
      api<Business[]>('/local/manage'),
      api<Lead[]>('/local/leads'),
    ]);
    setBusinesses(nextBusinesses);
    setLeads(nextLeads);
  };
  useEffect(() => {
    if (demo) return;
    let active = true;
    Promise.all([api<Business[]>('/local/manage'), api<Lead[]>('/local/leads')])
      .then(([rows, enquiries]) => {
        if (active) {
          setBusinesses(rows);
          setLeads(enquiries);
        }
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demo]);
  async function mutate(path: string, body: object, method = 'POST'): Promise<boolean> {
    if (demo) {
      setMessage('Sample preview only. Changes are disabled.');
      return false;
    }
    setBusy(true);
    setMessage('');
    try {
      await api(`/local${path}`, { method, body: JSON.stringify(body) });
      setMessage('Saved.');
      try {
        await refresh();
      } catch {
        setMessage('Saved, but the list could not refresh. Reload before making further changes.');
      }
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = Object.fromEntries(
      ['name', 'slug', 'description', 'category', 'location', 'phone', 'website'].map((key) => [
        key,
        data.get(key) || undefined,
      ]),
    );
    if (
      await mutate(
        editing ? `/businesses/${editing.id}` : '/businesses',
        body,
        editing ? 'PUT' : 'POST',
      )
    ) {
      form.reset();
      setEditing(null);
    }
  }
  return (
    <div className="local-workbench">
      <p className="notice">
        Business listings are separate from editorial coverage. Verify identity and contact details,
        record evidence, and review offer terms before activation. Changes to a profile require
        verification again. No automatic email or WhatsApp delivery is connected.
      </p>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {loading ? (
        <p>Loading local workspace…</p>
      ) : (
        <>
          <section className="panel editor-fields">
            <h2>{editing ? 'Edit business' : 'Register a local business'}</h2>
            <form key={editing?.id || 'new'} className="local-form" onSubmit={saveBusiness}>
              <fieldset disabled={busy || demo}>
                <label>
                  Business name · நிறுவனப் பெயர்
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={180}
                    defaultValue={editing?.name}
                  />
                </label>
                <label>
                  URL slug
                  <input
                    name="slug"
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    maxLength={191}
                    defaultValue={editing?.slug}
                  />
                </label>
                <label>
                  Description · விவரம்
                  <textarea
                    name="description"
                    required
                    minLength={10}
                    maxLength={10000}
                    defaultValue={editing?.description}
                  />
                </label>
                <label>
                  Category · வகை
                  <input
                    name="category"
                    required
                    minLength={2}
                    maxLength={100}
                    defaultValue={editing?.category}
                  />
                </label>
                <label>
                  Town / district · ஊர் / மாவட்டம்
                  <input
                    name="location"
                    required
                    minLength={2}
                    maxLength={100}
                    defaultValue={editing?.location}
                  />
                </label>
                <label>
                  Public phone
                  <input
                    name="phone"
                    type="tel"
                    maxLength={40}
                    defaultValue={editing?.phone || ''}
                  />
                </label>
                <label>
                  Public website
                  <input
                    name="website"
                    type="url"
                    maxLength={500}
                    defaultValue={editing?.website || ''}
                    placeholder="https://"
                  />
                </label>
                <button className="button primary" type="submit">
                  Save for verification
                </button>
              </fieldset>
              {editing && (
                <button type="button" className="button secondary" onClick={() => setEditing(null)}>
                  Cancel edit
                </button>
              )}
            </form>
          </section>
          <section>
            <h2>Business review · நிறுவன மதிப்பாய்வு</h2>
            <p>Most recent 200 profiles. Only verified profiles appear in the public directory.</p>
            {!businesses.length && <p>No businesses registered yet.</p>}
            {businesses.map((business) => (
              <article className="panel editor-fields" key={business.id}>
                <h3>{business.name}</h3>
                <p>
                  {business.category} · {business.location} · <strong>{business.status}</strong>
                </p>
                <p>{business.description}</p>
                <button
                  className="button secondary"
                  disabled={busy || demo}
                  type="button"
                  onClick={() => {
                    setEditing(business);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Edit profile
                </button>
                <form
                  className="local-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const evidence = String(new FormData(form).get('evidence'));
                    const action = business.status === 'VERIFIED' ? 'suspend' : 'verify';
                    void mutate(
                      `/businesses/${business.id}/${action}`,
                      action === 'verify' ? { evidence } : { reason: evidence },
                    ).then((saved) => {
                      if (saved) form.reset();
                    });
                  }}
                >
                  <label>
                    {business.status === 'VERIFIED'
                      ? 'Reason for suspension'
                      : 'Verification evidence — document/reference and contact check'}
                    <textarea
                      name="evidence"
                      required
                      minLength={10}
                      maxLength={2000}
                      disabled={busy || demo}
                    />
                  </label>
                  <button type="submit" className="button secondary" disabled={busy || demo}>
                    {business.status === 'VERIFIED'
                      ? 'Suspend listing and pause offers'
                      : 'Verify business'}
                  </button>
                </form>
                <h4>Offers · சலுகைகள்</h4>
                {business.offers.map((offer) => (
                  <div key={offer.id} className="local-offer-row">
                    <span>
                      {offer.title} · {offer.status} ·{' '}
                      {new Date(offer.endsAt).toLocaleDateString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                      })}
                    </span>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={
                        busy ||
                        demo ||
                        (offer.status !== 'ACTIVE' &&
                          (business.status !== 'VERIFIED' ||
                            new Date(offer.endsAt).getTime() <= Date.now()))
                      }
                      onClick={() =>
                        void mutate(`/offers/${offer.id}/status`, {
                          status: offer.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
                        })
                      }
                    >
                      {offer.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                    </button>
                  </div>
                ))}
                <details>
                  <summary>Create an offer</summary>
                  <form
                    className="local-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = event.currentTarget;
                      const data = new FormData(form);
                      const body = {
                        title: data.get('title'),
                        description: data.get('description'),
                        terms: data.get('terms'),
                        startsAt: new Date(String(data.get('startsAt'))).toISOString(),
                        endsAt: new Date(String(data.get('endsAt'))).toISOString(),
                      };
                      void mutate(`/businesses/${business.id}/offers`, body).then((saved) => {
                        if (saved) form.reset();
                      });
                    }}
                  >
                    <fieldset disabled={busy || demo}>
                      <label>
                        Offer title
                        <input name="title" required minLength={2} maxLength={180} />
                      </label>
                      <label>
                        Description
                        <textarea name="description" required minLength={10} maxLength={10000} />
                      </label>
                      <label>
                        Terms, exclusions and availability
                        <textarea name="terms" required minLength={10} maxLength={10000} />
                      </label>
                      <p>
                        Enter dates in your device’s local time. Saving creates a draft; activation
                        is a separate action.
                      </p>
                      <label>
                        Starts
                        <input name="startsAt" type="datetime-local" required />
                      </label>
                      <label>
                        Ends
                        <input name="endsAt" type="datetime-local" required />
                      </label>
                      <button type="submit" className="button secondary">
                        Save draft offer
                      </button>
                    </fieldset>
                  </form>
                </details>
              </article>
            ))}
          </section>
          <section className="panel editor-fields">
            <h2>Consented enquiries · தொடர்பு கோரிக்கைகள்</h2>
            <p>
              Most recent 200 enquiries. Use contact details only to respond to the named business
              enquiry. Do not add them to marketing lists.
            </p>
            {!leads.length && <p>No enquiries received.</p>}
            {leads.map((lead) => (
              <article key={lead.id} className="local-enquiry">
                <h3>
                  {lead.business.name} — {lead.name}
                </h3>
                <p>{lead.message}</p>
                <p>
                  {lead.email}
                  {lead.phone ? ` · ${lead.phone}` : ''}
                </p>
                <p>
                  Consent recorded:{' '}
                  {new Date(lead.consentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}{' '}
                  IST
                </p>
                <label>
                  Status
                  <select
                    value={lead.status}
                    disabled={busy || demo}
                    onChange={(event) =>
                      void mutate(`/leads/${lead.id}/status`, { status: event.target.value })
                    }
                  >
                    <option value="NEW" disabled>
                      New
                    </option>
                    {['CONTACTED', 'QUALIFIED', 'CLOSED', 'SPAM'].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
