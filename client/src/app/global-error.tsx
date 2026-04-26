'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="sw">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <h1 className="mb-4 text-2xl font-bold text-[#0d1820]">Something went wrong</h1>
          <p className="mb-8 text-[#637885]">An unexpected error occurred.</p>
          <button
            onClick={reset}
            className="rounded-xl bg-[#0a7c5c] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#096b4d]"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}