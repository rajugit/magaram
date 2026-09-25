'use client';

import { useState } from 'react';
import { api } from '../_lib/api';

import type { PublicBusiness } from '../_lib/local-data';

export function LocalDirectory({
  items,
  unavailable = false,
  demo = false,
}: {
  items: PublicBusiness[];
  unavailable?: boolean;
  demo?: boolean;
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <>
      <p role="status">{message}</p>
      {demo && (
        <p className="notice">
          வடிவமைப்பு முன்னோட்டம் · மாதிரி நிறுவனங்கள் மட்டும். படிவங்கள் செயல்படாது.
        </p>
      )}
      {unavailable ? (
        <p role="alert">
          நிறுவனப் பட்டியல் தற்போது கிடைக்கவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.
        </p>
      ) : (
        !items.length && <p>இந்தத் தேடலுக்கு சரிபார்க்கப்பட்ட நிறுவனங்கள் இல்லை.</p>
      )}
      <div className="story-grid">
        {items.map((business) => (
          <article className="story-card" key={business.id}>
            <div className="story-card-body">
              <p className="story-meta">
                {business.category} · {business.location}
              </p>
              <h2>{business.name}</h2>
              <p>{business.description}</p>
              {business.phone && <p>{business.phone}</p>}
              {business.website && /^https?:\/\//i.test(business.website) && (
                <a href={business.website} rel="nofollow noopener noreferrer" target="_blank">
                  இணையதளம்
                </a>
              )}
              {business.offers.map((offer) => (
                <section key={offer.id}>
                  <h3>{offer.title}</h3>
                  <p>{offer.description}</p>
                  <p>{offer.terms}</p>
                  <p>
                    முடிவு:{' '}
                    {new Date(offer.endsAt).toLocaleDateString('ta-IN', {
                      timeZone: 'Asia/Kolkata',
                    })}
                  </p>
                </section>
              ))}
              <details>
                <summary>தொடர்பு கோரிக்கை</summary>
                <form
                  className="local-form"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (demo || busy) return;
                    const form = event.currentTarget;
                    const data = new FormData(form);
                    setBusy(true);
                    try {
                      await api('/local/leads', {
                        method: 'POST',
                        body: JSON.stringify({
                          businessId: business.id,
                          name: data.get('name'),
                          offerId: data.get('offerId') || undefined,
                          email: data.get('email'),
                          message: data.get('message'),
                          consent: data.get('consent') === 'on',
                        }),
                      });
                      setMessage(
                        'கோரிக்கை சேமிக்கப்பட்டது. தானியங்கி மின்னஞ்சல் அனுப்பப்படவில்லை.',
                      );
                      form.reset();
                    } catch {
                      setMessage(
                        'கோரிக்கையைச் சேமிக்க முடியவில்லை. விவரங்களைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <fieldset disabled={busy || demo}>
                    {business.offers.length > 0 && (
                      <label>
                        சலுகை
                        <select name="offerId">
                          <option value="">பொதுவான விசாரணை</option>
                          {business.offers.map((offer) => (
                            <option key={offer.id} value={offer.id}>
                              {offer.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label>
                      பெயர்
                      <input
                        name="name"
                        required
                        minLength={2}
                        maxLength={160}
                        autoComplete="name"
                      />
                    </label>
                    <label>
                      மின்னஞ்சல்
                      <input
                        name="email"
                        type="email"
                        required
                        maxLength={320}
                        autoComplete="email"
                      />
                    </label>
                    <label>
                      செய்தி
                      <textarea name="message" required minLength={5} maxLength={5000} />
                    </label>
                    <label>
                      <input name="consent" type="checkbox" required /> இந்தக் கோரிக்கையைச்
                      செயல்படுத்த மகரம் மீடியா எனது விவரங்களைச் சேமித்து, {business.name}{' '}
                      நிறுவனத்துடன் பகிர ஒப்புக்கொள்கிறேன். இது விளம்பரச் சந்தா அல்ல.
                    </label>
                    <button disabled={busy || demo} type="submit">
                      {busy ? 'சேமிக்கப்படுகிறது…' : 'அனுப்புங்கள்'}
                    </button>
                  </fieldset>
                  <p>
                    கோரிக்கையைத் திரும்பப் பெற:{' '}
                    <a href="mailto:magaram.in@gmail.com">magaram.in@gmail.com</a>
                  </p>
                </form>
              </details>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
