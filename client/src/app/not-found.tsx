import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-6xl font-bold text-[#0d1820]">404</h1>
      <p className="mb-8 text-lg text-[#637885]">Page not found</p>
      <Link
        href="/"
        className="rounded-xl bg-[#0a7c5c] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#096b4d]"
      >
        Go home
      </Link>
    </div>
  );
}