import Image from 'next/image';
import Link from 'next/link';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="மகரம் மீடியா முகப்பு">
      <Image
        src="/brand/magaram-logo.png"
        width={180}
        height={180}
        className="brand-mark"
        alt=""
        priority
        unoptimized
      />
      <span>
        <strong>
          மகரம்<span className="brand-dot">.</span>
        </strong>
        {!compact && <small>MEDIA · மக்களின் குரல்</small>}
      </span>
    </Link>
  );
}
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    news: 'M4 3h16v18H4z M8 7h8 M8 11h8 M8 15h3 M8 18h8',
    check: 'M4 12l5 5L20 6',
    clock: 'M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    plus: 'M12 5v14 M5 12h14',
    arrow: 'M4 12h16 M14 6l6 6-6 6',
    chevron: 'M9 5l7 7-7 7',
    globe: 'M3 12h18 M12 3c6 5 6 13 0 18 M12 3c-6 5-6 13 0 18 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    pin: 'M12 22s8-9 8-14a8 8 0 1 0-16 0c0 5 8 14 8 14z M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    mail: 'M3 5h18v14H3z M3 5l9 8 9-8',
    users:
      'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3 M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M17 3a4 4 0 0 1 0 8 M22 21v-3a4 4 0 0 0-4-4',
    chart: 'M3 3v18h18 M7 17v-5 M12 17V7 M17 17v-8',
    store: 'M3 9l2-6h14l2 6 M3 9v3h18V9 M5 12v9h14v-9 M9 21v-6h6v6',
    briefcase: 'M3 7h18v14H3z M8 7V3h8v4 M3 12h18 M10 12v3h4v-3',
    spark: 'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
    image: 'M3 3h18v18H3z M3 17l6-7 5 5 3-3 4 5 M15 7h.01',
    shield: 'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z M8 12l3 3 5-6',
    settings: 'M9 3h6l1 4 4 2v6l-4 2-1 4H9l-1-4-4-2V9l4-2z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    logout: 'M9 3H3v18h6 M9 12h12 M16 7l5 5-5 5',
    menu: 'M3 6h18 M3 12h18 M3 18h18',
    calendar: 'M3 5h18v16H3z M7 2v6 M17 2v6 M3 11h18',
    send: 'M22 2L9 15 M22 2l-7 20-6-7-7-6z',
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}
