import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ServerScanner } from './src/services/serverScanner';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start background automated scanner (runs server-side offline 24/7)
  try {
    const scanner = new ServerScanner();
    await scanner.start();
    console.log('[Server] Server-Side Automated SMC Breakout Scanner started in background.');
  } catch (err) {
    console.error('[Server] Failed to start ServerScanner background worker:', err);
  }

  // Vite middleware for development vs static asset serving for production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Server] Starting in Development mode (mounting Vite middleware)...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[Server] Starting in Production mode (serving compiled assets from dist/)...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Express web server running on port ${PORT}`);
  });
}

startServer();
