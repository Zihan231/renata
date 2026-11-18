// Builds an offline Windows bundle in dist/RenataQuiz:
//   RenataQuiz.exe   launcher (double-click to run)
//   runtime/node.exe portable Node, so the target PC needs nothing installed
//   app/             Next.js standalone server + static files
//   data/            participants.xlsx is written here
// Copy the whole RenataQuiz folder to any Windows PC; no internet needed.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'dist', 'RenataQuiz');
const buildDir = '.next-standalone';

const run = (cmd, env = {}) => execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });
const copy = (from, to) => fs.cpSync(from, to, { recursive: true });

console.log('> next build (standalone)');
run('npx next build', { NEXT_STANDALONE: '1', NEXT_DIST: buildDir, NEXT_TELEMETRY_DISABLED: '1' });

// Keep an existing data/ folder so re-packaging never wipes collected participants.
fs.rmSync(path.join(out, 'app'), { recursive: true, force: true });
fs.rmSync(path.join(out, 'runtime'), { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'data'), { recursive: true });

console.log('> copying server');
const standalone = path.join(root, buildDir, 'standalone');
copy(standalone, path.join(out, 'app'));
copy(path.join(root, buildDir, 'static'), path.join(out, 'app', buildDir, 'static'));
copy(path.join(root, 'public'), path.join(out, 'app', 'public'));
if (fs.existsSync(path.join(root, '.env.local'))) copy(path.join(root, '.env.local'), path.join(out, 'app', '.env.local'));

console.log('> copying node.exe');
fs.mkdirSync(path.join(out, 'runtime'), { recursive: true });
fs.copyFileSync(process.execPath, path.join(out, 'runtime', 'node.exe'));

console.log('> copying Start-Kiosk.bat / Stop-Kiosk.bat');
// .bat files must have CRLF line endings or labels/goto break
for (const f of ['Start-Kiosk.bat', 'Stop-Kiosk.bat']) {
  const text = fs.readFileSync(path.join(root, 'scripts', f), 'utf8').split(String.fromCharCode(13)).join('').split(String.fromCharCode(10)).join(String.fromCharCode(13, 10));
  fs.writeFileSync(path.join(out, f), text);
}

for (const f of ['Start-Kiosk.ps1', 'Stop-Kiosk.ps1']) fs.copyFileSync(path.join(root, 'scripts', f), path.join(out, f));

console.log('> compiling RenataQuiz.exe (optional: antivirus may remove it, use Start-Kiosk.bat instead)');
const csc = path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
const icon = path.join(root, 'scripts', 'icon.ico');
try {
  run(`"${csc}" /nologo /target:winexe /r:System.Windows.Forms.dll /optimize /out:"${path.join(out, 'RenataQuiz.exe')}"` +
  (fs.existsSync(icon) ? ` /win32icon:"${icon}"` : '') +
  ` "${path.join(root, 'scripts', 'launcher.cs')}"`);
} catch { console.warn('! RenataQuiz.exe could not be built (antivirus?). Use Start-Kiosk.bat instead.'); }

console.log(`\nDone: ${out}\nDouble-click Start-Kiosk.bat to start (kiosk, full-screen; Alt+F4 just reopens it; run Stop-Kiosk.bat to quit).`);
