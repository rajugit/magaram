import Link from 'next/link';
import { Brand } from '../_components/brand';
import { contactEmail } from '../_lib/data';

export default function ResetPasswordPage() {
  return (
    <main className="login-wrap">
      <section className="login-story">
        <Brand />
        <div>
          <span className="eyebrow">ACCOUNT SECURITY</span>
          <h1>Secure access to the newsroom.</h1>
          <p>Magaram Media accounts are created and maintained by a super administrator.</p>
        </div>
      </section>
      <section className="login-form">
        <div>
          <span className="eyebrow">CONTACT ADMINISTRATOR</span>
          <h2>Password changes are managed by your administrator.</h2>
          <p className="muted">
            Ask the Magaram Media super administrator for a temporary password. You will be asked
            to choose a private password the first time you sign in.
          </p>
          <a className="button primary" href={`mailto:${contactEmail}`}>Contact {contactEmail}</a>
          <Link href="/login" className="back-link">← Back to sign in</Link>
        </div>
      </section>
    </main>
  );
}
