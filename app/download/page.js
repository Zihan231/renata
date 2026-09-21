import { notFound } from 'next/navigation';
import FxLayer from '@/components/FxLayer';
import Header from '@/components/Header';

export const metadata = { title: 'Download Excel · Renata Quiz', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

// /download → a single "Download Excel" button.
// If ADMIN_KEY is set in .env.local the page needs /download?key=<ADMIN_KEY> (else 404); if not set it is open.
export default async function DownloadPage({ searchParams }) {
  const { key = '' } = await searchParams;
  if (process.env.ADMIN_KEY && key !== process.env.ADMIN_KEY) notFound();

  return (
    <>
      <FxLayer />
      <div className="stage">
        <Header />
        <div className="card" style={{ width: 'min(440px,100%)' }}>
          <section className="screen active">
            <a className="btn big" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
               href={key ? `/api/export?key=${encodeURIComponent(key)}` : '/api/export'} download="renata-quiz-participants.xlsx">
              ⬇ Download Excel
            </a>
          </section>
        </div>
      </div>
    </>
  );
}
