const foundations = [
  'Secure accounts and role-based access',
  'Versioned API and validation standards',
  'Auditable administration and configuration',
  'Background-job foundation for reliable delivery',
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16 sm:px-10">
      <header className="mb-10 flex items-center gap-4 sm:gap-5">
        <Image
          src="/brand/magaram-logo.png"
          alt="Magaram Media logo"
          width={180}
          height={180}
          priority
          className="h-20 w-20 rounded-2xl bg-white sm:h-24 sm:w-24"
        />
        <div>
          <p
            lang="en"
            className="text-lg font-bold tracking-[0.12em] text-[var(--magaram-burgundy)] sm:text-2xl"
          >
            MAGARAM MEDIA
          </p>
          <div aria-hidden="true" className="mt-3 flex h-1.5 w-24 overflow-hidden rounded-full">
            <span className="flex-1 bg-[var(--magaram-orange)]" />
            <span className="flex-1 bg-[var(--magaram-coral)]" />
            <span className="flex-1 bg-[var(--magaram-burgundy)]" />
          </div>
        </div>
      </header>
      <h1 className="max-w-3xl text-3xl font-semibold leading-relaxed tracking-tight sm:text-5xl sm:leading-relaxed">
        நம்பகமான தமிழ் செய்திக்கும் உள்ளூர் வாய்ப்புகளுக்கும் ஒரு புதிய தளம்.
      </h1>
      <p lang="en" className="mt-6 max-w-2xl text-lg leading-8 text-[var(--magaram-muted)]">
        The platform foundation is in progress. Editorial publishing, local commerce, and audience
        services will be released through reviewed phases.
      </p>
      <section
        lang="en"
        className="mt-12 rounded-2xl border border-[var(--magaram-border)] border-t-4 border-t-[var(--magaram-orange)] bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-[var(--magaram-burgundy)]">Foundation status</h2>
        <ul className="mt-4 grid gap-3 text-[var(--magaram-ink)] sm:grid-cols-2">
          {foundations.map((foundation) => (
            <li
              key={foundation}
              className="rounded-lg border-l-2 border-[var(--magaram-coral)] bg-[var(--magaram-cream)] px-4 py-3"
            >
              {foundation}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
import Image from 'next/image';
