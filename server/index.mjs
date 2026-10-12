// Serveur de production : sert l'application construite (dist/) et le relais multijoueur.
//   npm run build && npm start
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachRelay } from './relay.mjs';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT ?? 3000);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/ est introuvable : lancez d\'abord « npm run build ».');
  process.exit(1);
}

const server = createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    // Adresse mal formée (robots, scanners) : la requête est refusée sans faire tomber le serveur
    res.writeHead(400).end();
    return;
  }
  let file = join(DIST, normalize(pathname));
  // Hors de dist/ ou fichier inconnu : on sert l'application
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) {
    file = join(DIST, 'index.html');
  }
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': file.includes(`${join(DIST, 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(file).on('error', () => res.destroy()).pipe(res);
});

attachRelay(server);
server.listen(PORT, () => console.log(`Grimoire du Conteur : http://localhost:${PORT}`));
