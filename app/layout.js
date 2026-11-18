import './globals.css';
import { Sora, Space_Grotesk } from 'next/font/google';

// Self-hosted by Next at build time: no render-blocking request to Google on slow mobile data.
const sora = Sora({ subsets: ['latin'], weight: ['400', '600'], display: 'swap', variable: '--f-sora' });
const grot = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], display: 'swap', variable: '--f-grot' });

export const metadata = {
  title: 'Renata Oncology Quiz',
  description: 'Renata Oncology bioequivalence quiz',
};

// viewportFit 'cover' + safe-area padding in globals.css keeps content clear of phone notches / status bars
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

// Runs before first paint: phones, low-core / low-memory / data-saver devices get the "lite" tier.
// Force a tier for testing with ?perf=lite or ?perf=full.
const TIER = `(function(){try{var d=document.documentElement,n=navigator,m=location.search.match(/perf=(lite|full)/);
var lite=matchMedia('(pointer:coarse)').matches||innerWidth<820||(n.hardwareConcurrency&&n.hardwareConcurrency<=4)||(n.deviceMemory&&n.deviceMemory<=4)||(n.connection&&n.connection.saveData)||matchMedia('(prefers-reduced-motion:reduce)').matches;
if(m)lite=m[1]==='lite';if(lite)d.dataset.perf='lite'}catch(e){}})()`;

// Kiosk mode: any screen >= 820px wide gets a 1080x1920 (portrait) / 1920x1080 (landscape) canvas scaled to fit.
// ?kiosk=1 forces it on, ?kiosk=0 turns it off.
const KIOSK = `(function(){try{var d=document.documentElement,m=location.search.match(/kiosk=(0|1)/);
function f(){var w=innerWidth,h=innerHeight,p=h>=w,k=Math.min(w/(p?1080:1920),h/(p?1920:1080));
d.style.setProperty('--k',k);d.classList.toggle('kiosk',m?m[1]==='1':w>=820);d.classList.toggle('kp',p);d.classList.toggle('kl',!p)}
f();addEventListener('resize',f)}catch(e){}})()`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sora.variable} ${grot.variable}`} suppressHydrationWarning>
      {/* suppressHydrationWarning: browser extensions inject their own <script> into <head> before React hydrates */}
      <head suppressHydrationWarning>
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: TIER + ';' + KIOSK }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
