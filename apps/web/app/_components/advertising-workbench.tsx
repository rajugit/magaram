'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../_lib/api';

type Placement = {
  id: string;
  key: string;
  name: string;
  enabled: boolean;
  dailyRatePaise: number | null;
  version: number;
};
type Profile = {
  id: string;
  name: string;
  contactEmail: string;
  billingAddress: string;
  ownerId: string;
  updatedAt?: string;
};
type Campaign = {
  id: string;
  headline: string;
  body: string;
  destinationUrl: string;
  rightsEvidence: string;
  disclosure: string;
  startsAt: string;
  endsAt: string;
  status: string;
  version: number;
  placementId: string;
  submittedBy: string | null;
  lastEditedBy: string;
  reviewNote: string | null;
  advertiser: Profile;
  placement: Placement;
  invoice: null | {
    id: string;
    currency: string;
    amountPaise: number;
    dailyRatePaise: number;
    days: number;
    status: string;
  };
};
type Status = {
  paymentEnabled: boolean;
  deliveryEnabled: boolean;
  canManage: boolean;
  canReview: boolean;
  canCreate: boolean;
};
const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount / 100);
const date = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
const inputDate = (value?: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const samplePlacement: Placement = {
  id: 'sample-slot',
  key: 'news-banner',
  name: 'செய்திப் பக்க விளம்பரம்',
  enabled: true,
  dailyRatePaise: 10000,
  version: 1,
};
const sampleProfile: Profile = {
  id: 'sample-profile',
  name: 'மாதிரி புத்தக நிலையம்',
  ownerId: 'sample-owner',
  contactEmail: 'sample@example.test',
  billingAddress: 'Sample address, Madurai — demonstration only',
};
const sampleCampaign: Campaign = {
  id: 'sample-campaign',
  headline: 'மாதிரி தமிழ் நூல் கண்காட்சி',
  body: 'தமிழ் வாசிப்பைக் கொண்டாடும் புத்தகக் கண்காட்சி. இது வடிவமைப்பிற்கான மாதிரி விளம்பரம் மட்டுமே.',
  destinationUrl: 'https://example.test',
  rightsEvidence: 'Sample rights review reference — not a real advertiser.',
  disclosure: 'விளம்பரம்',
  startsAt: '2026-12-01T00:00:00Z',
  endsAt: '2026-12-04T00:00:00Z',
  status: 'SUBMITTED',
  version: 2,
  placementId: samplePlacement.id,
  submittedBy: 'sample-owner',
  lastEditedBy: 'sample-owner',
  reviewNote: null,
  advertiser: sampleProfile,
  placement: samplePlacement,
  invoice: null,
};

export function AdvertisingWorkbench({ demo }: { demo: boolean }) {
  const [placements, setPlacements] = useState<Placement[]>(demo ? [samplePlacement] : []);
  const [profile, setProfile] = useState<Profile | null>(demo ? sampleProfile : null);
  const [campaigns, setCampaigns] = useState<Campaign[]>(demo ? [sampleCampaign] : []);
  const [status, setStatus] = useState<Status>({
    paymentEnabled: false,
    deliveryEnabled: false,
    canManage: demo,
    canReview: demo,
    canCreate: demo,
  });
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(demo ? 1 : 0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(!demo);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  async function load() {
    return Promise.all([
      api<Status>('/ads/status'),
      api<{ items: Placement[] }>('/ads/placements'),
      api<Profile | null>('/ads/profile'),
      api<{ items: Campaign[]; total: number }>(`/ads/campaigns?page=${page}`),
      api<{ user: { id: string } }>('/me'),
    ]);
  }
  function apply(data: Awaited<ReturnType<typeof load>>) {
    setStatus(data[0]);
    setPlacements(data[1].items);
    setProfile(data[2]);
    setCampaigns(data[3].items);
    setTotal(data[3].total);
    setUserId(data[4].user.id);
  }
  useEffect(() => {
    if (demo) return;
    let active = true;
    setLoading(true);
    load()
      .then((data) => {
        if (active) apply(data);
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
    // load uses the page selected above; no external mutable input.
    // eslint does not require memoizing request functions in this workspace.
  }, [demo, page]);
  async function mutate(path: string, body: object, method = 'POST') {
    if (demo || busy) return false;
    setBusy(true);
    setMessage('');
    try {
      await api(`/ads${path}`, { method, body: JSON.stringify(body) });
      setMessage('Saved.');
      try {
        apply(await load());
      } catch {
        setMessage('Saved, but refresh failed. Reload before making another change.');
      }
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const body = {
      placementId: fields.get('placementId'),
      headline: fields.get('headline'),
      body: fields.get('body'),
      destinationUrl: fields.get('destinationUrl'),
      rightsEvidence: fields.get('rightsEvidence'),
      startsAt: new Date(String(fields.get('startsAt'))).toISOString(),
      endsAt: new Date(String(fields.get('endsAt'))).toISOString(),
      ...(editing ? { version: editing.version } : {}),
    };
    if (
      await mutate(
        editing ? `/campaigns/${editing.id}` : '/campaigns',
        body,
        editing ? 'PUT' : 'POST',
      )
    ) {
      form.reset();
      setEditing(null);
    }
  }
  return (
    <div className="local-workbench advertising-workbench">
      <div className="notice">
        <strong>Campaign planning and review</strong>
        <p>
          Payments and ad delivery are unavailable. Approval reserves a placement and creates a pro
          forma quote; it does not charge anyone or publish an advertisement. Editorial coverage is
          separate.
        </p>
        {demo && <p>Sample content and sample rates only. All changes are disabled.</p>}
      </div>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {loading ? (
        <p>Loading advertising workspace…</p>
      ) : (
        <>
          <section className="panel editor-fields">
            <h2>1. Placements and rates</h2>
            <p>
              Each placement reserves one campaign at a time. Rates apply per started 24-hour
              period. Changing a rate does not change an existing quote.
            </p>
            {!placements.length && <p>No advertising placements have been configured.</p>}
            {placements.map((placement) => (
              <div key={placement.id} className="ad-placement">
                <h3>{placement.name}</h3>
                <p>
                  {placement.enabled ? 'Open for submissions' : 'Unavailable'} ·{' '}
                  {placement.dailyRatePaise
                    ? `${money(placement.dailyRatePaise)} per day`
                    : 'Rate not configured'}
                </p>
                {status.canManage && (
                  <form
                    key={`${placement.id}-${placement.version}`}
                    className="local-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const data = new FormData(event.currentTarget);
                      void mutate(
                        `/placements/${placement.id}`,
                        {
                          version: placement.version,
                          enabled: data.get('enabled') === 'on',
                          dailyRatePaise: Math.round(Number(data.get('rate')) * 100),
                        },
                        'PUT',
                      );
                    }}
                  >
                    <fieldset disabled={busy || demo}>
                      <label>
                        Daily rate in rupees
                        <input
                          name="rate"
                          type="number"
                          min={1}
                          max={100000}
                          step="0.01"
                          required
                          defaultValue={
                            placement.dailyRatePaise ? placement.dailyRatePaise / 100 : ''
                          }
                        />
                      </label>
                      <label className="checkbox">
                        <input name="enabled" type="checkbox" defaultChecked={placement.enabled} />{' '}
                        Accept campaign submissions
                      </label>
                      <button type="submit" className="button secondary">
                        Save placement
                      </button>
                    </fieldset>
                  </form>
                )}
              </div>
            ))}
          </section>
          {status.canCreate && (
            <section className="panel editor-fields">
              <h2>2. Your advertiser profile</h2>
              <form
                key={profile?.updatedAt || 'profile'}
                className="local-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void mutate(
                    '/profile',
                    Object.fromEntries(new FormData(event.currentTarget)),
                    'PUT',
                  );
                }}
              >
                <fieldset disabled={busy || demo}>
                  <label>
                    Business name
                    <input
                      name="name"
                      required
                      minLength={2}
                      maxLength={180}
                      defaultValue={profile?.name}
                    />
                  </label>
                  <label>
                    Contact email
                    <input
                      name="contactEmail"
                      type="email"
                      required
                      maxLength={320}
                      defaultValue={profile?.contactEmail}
                    />
                  </label>
                  <label>
                    Billing address
                    <textarea
                      name="billingAddress"
                      required
                      minLength={10}
                      maxLength={1000}
                      defaultValue={profile?.billingAddress}
                    />
                  </label>
                  <button className="button primary" type="submit">
                    Save advertiser profile
                  </button>
                </fieldset>
              </form>
            </section>
          )}
          {status.canCreate && (
            <section className="panel editor-fields">
              <h2>3. {editing ? 'Edit campaign' : 'Create campaign'}</h2>
              <p>
                Save your profile first. Choose an available placement, provide rights evidence, and
                submit the draft for another person to review. Dates below use your device’s local
                time.
              </p>
              <form key={editing?.id || 'new'} className="local-form" onSubmit={saveCampaign}>
                <fieldset disabled={busy || demo || !profile}>
                  <label>
                    Placement
                    <select name="placementId" required defaultValue={editing?.placementId || ''}>
                      <option value="" disabled>
                        Select a placement
                      </option>
                      {placements
                        .filter(
                          (placement) =>
                            (placement.enabled && placement.dailyRatePaise) ||
                            placement.id === editing?.placementId,
                        )
                        .map((placement) => (
                          <option key={placement.id} value={placement.id}>
                            {placement.name} · {money(placement.dailyRatePaise || 0)}/day
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Headline · தலைப்பு
                    <input
                      name="headline"
                      required
                      minLength={5}
                      maxLength={180}
                      defaultValue={editing?.headline}
                      lang="ta"
                    />
                  </label>
                  <label>
                    Ad text · விளம்பர வாசகம்
                    <textarea
                      name="body"
                      required
                      minLength={10}
                      maxLength={5000}
                      defaultValue={editing?.body}
                      lang="ta"
                    />
                  </label>
                  <label>
                    Destination website (HTTPS)
                    <input
                      name="destinationUrl"
                      type="url"
                      pattern="https://.*"
                      required
                      maxLength={1000}
                      defaultValue={editing?.destinationUrl}
                    />
                  </label>
                  <label>
                    Rights evidence and reference
                    <textarea
                      name="rightsEvidence"
                      required
                      minLength={10}
                      maxLength={2000}
                      defaultValue={editing?.rightsEvidence}
                    />
                  </label>
                  <label>
                    Starts
                    <input
                      name="startsAt"
                      type="datetime-local"
                      required
                      defaultValue={inputDate(editing?.startsAt)}
                    />
                  </label>
                  <label>
                    Ends (maximum 90 days)
                    <input
                      name="endsAt"
                      type="datetime-local"
                      required
                      defaultValue={inputDate(editing?.endsAt)}
                    />
                  </label>
                  <p>The “விளம்பரம்” disclosure is mandatory and added automatically.</p>
                  <button className="button primary" type="submit">
                    Save draft
                  </button>
                </fieldset>
                {editing && (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() => setEditing(null)}
                  >
                    Cancel edit
                  </button>
                )}
              </form>
            </section>
          )}
          <section>
            <h2>4. Campaigns and review</h2>
            <p>
              {total} campaign{total === 1 ? '' : 's'} · Approval does not enable delivery.
            </p>
            {!campaigns.length && <p>No campaigns in this view yet.</p>}
            {campaigns.map((campaign) => {
              const canEdit = status.canManage || campaign.advertiser.ownerId === userId;
              const independent = ![
                campaign.advertiser.ownerId,
                campaign.submittedBy,
                campaign.lastEditedBy,
              ].includes(userId);
              return (
                <article className="panel editor-fields" key={campaign.id}>
                  <h3>{campaign.headline}</h3>
                  <p>
                    <strong>{campaign.status}</strong> · {campaign.advertiser.name} · Revision{' '}
                    {campaign.version}
                  </p>
                  <p>
                    {campaign.placement.name} · {date(campaign.startsAt)} – {date(campaign.endsAt)}{' '}
                    IST
                  </p>
                  <div className="ad-creative-preview" lang="ta">
                    <span className="sponsored-label">{campaign.disclosure}</span>
                    <h4>{campaign.headline}</h4>
                    <p>{campaign.body}</p>
                    <a
                      href={campaign.destinationUrl}
                      target="_blank"
                      rel="sponsored nofollow noopener noreferrer"
                    >
                      விளம்பரதாரர் இணையதளம் ↗
                    </a>
                  </div>
                  <p>
                    <strong>Rights evidence:</strong> {campaign.rightsEvidence}
                  </p>
                  {campaign.reviewNote && (
                    <p>
                      <strong>Review note:</strong> {campaign.reviewNote}
                    </p>
                  )}
                  <div className="ad-actions">
                    {canEdit && ['DRAFT', 'REJECTED'].includes(campaign.status) && (
                      <>
                        <button
                          type="button"
                          className="button secondary"
                          disabled={busy || demo}
                          onClick={() => {
                            setEditing(campaign);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          Edit draft
                        </button>
                        <button
                          type="button"
                          className="button primary"
                          disabled={busy || demo}
                          onClick={() =>
                            void mutate(`/campaigns/${campaign.id}/submit`, {
                              version: campaign.version,
                            })
                          }
                        >
                          Submit for review
                        </button>
                      </>
                    )}
                    {canEdit && campaign.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        className="button secondary"
                        disabled={busy || demo}
                        onClick={() =>
                          void mutate(`/campaigns/${campaign.id}/cancel`, {
                            version: campaign.version,
                          })
                        }
                      >
                        Cancel campaign and void unpaid quote
                      </button>
                    )}
                  </div>
                  {status.canReview && campaign.status === 'SUBMITTED' && (
                    <>
                      {!independent && (
                        <p>Another reviewer must review your own or edited campaign.</p>
                      )}
                      <form
                        className="local-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const data = new FormData(event.currentTarget);
                          void mutate(`/campaigns/${campaign.id}/review`, {
                            version: campaign.version,
                            decision: data.get('decision'),
                            note: data.get('note'),
                            rightsConfirmed: data.get('rightsConfirmed') === 'on',
                          });
                        }}
                      >
                        <fieldset disabled={busy || demo || !independent}>
                          <label>
                            Review decision
                            <select name="decision">
                              <option value="REJECTED">Reject / request changes</option>
                              <option value="APPROVED">Approve creative and quote</option>
                            </select>
                          </label>
                          <label>
                            Review findings
                            <textarea name="note" required minLength={10} maxLength={2000} />
                          </label>
                          <label className="checkbox">
                            <input name="rightsConfirmed" type="checkbox" required /> I have
                            reviewed the rights evidence, destination and advertising disclosure.
                          </label>
                          <button type="submit" className="button secondary">
                            Save independent review
                          </button>
                        </fieldset>
                      </form>
                    </>
                  )}
                  {campaign.invoice && (
                    <aside className="ad-invoice">
                      <h4>5. Pro forma quote · {campaign.invoice.status}</h4>
                      <p>{campaign.invoice.id}</p>
                      <p>
                        {campaign.invoice.days} day(s) × {money(campaign.invoice.dailyRatePaise)} ={' '}
                        <strong>{money(campaign.invoice.amountPaise)}</strong>
                      </p>
                      <p>
                        This is a saved quote, not a tax invoice or payment receipt. Payment
                        processing and ad delivery are unavailable.
                      </p>
                      <button type="button" className="button secondary" disabled>
                        Payment unavailable
                      </button>
                    </aside>
                  )}
                </article>
              );
            })}
            <nav className="ad-actions" aria-label="Campaign pages">
              <button
                className="button secondary"
                disabled={page === 1 || busy || demo}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </button>
              <span>Page {page}</span>
              <button
                className="button secondary"
                disabled={page * 25 >= total || busy || demo}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </button>
            </nav>
          </section>
        </>
      )}
    </div>
  );
}
