// client/src/app/page.tsx
import Link from 'next/link';

const modules = [
  { href: '/fares', labelSw: 'Nauli', labelEn: 'Fares', icon: '💰' },
  { href: '/verify', labelSw: 'Thibitisha Hati', labelEn: 'Verify Documents', icon: '🔍' },
  { href: '/track', labelSw: 'Fuatilia Mabasi', labelEn: 'Track Buses', icon: '🚌' },
  { href: '/tickets', labelSw: 'Nunua Tiketi', labelEn: 'Buy Tickets', icon: '🎫' },
  { href: '/lost-found', labelSw: 'Potee & Patikana', labelEn: 'Lost & Found', icon: '📦' },
  { href: '/complaints', labelSw: 'Malalamiko', labelEn: 'Complaints', icon: '📝' },
  { href: '/news', labelSw: 'Habari', labelEn: 'News', icon: '📰' },
  { href: '/fines', labelSw: 'Faini', labelEn: 'Traffic Fines', icon: '⚖️' },
  { href: '/profile', labelSw: 'Wasifu Wangu', labelEn: 'My Profile', icon: '👤' },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-zartsa-green">ZARTSA</h1>
        <p className="text-sm text-gray-600">
          Mamlaka ya Barabara na Usalama Zanzibar
        </p>
      </header>

      <nav className="grid grid-cols-3 gap-3">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors hover:bg-gray-50"
          >
            <span className="text-2xl">{m.icon}</span>
            <span className="text-xs font-medium">{m.labelSw}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}