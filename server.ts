import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const CONFIG_FILE = path.join(__dirname, '.supabase-config.json');

app.use(express.json());

// Helper to read server-side stored Supabase credentials
function getServerConfig() {
  const envUrl = process.env.VITE_SUPABASE_URL || '';
  const envKey = process.env.VITE_SUPABASE_ANON_KEY || '';

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return {
        url: (data.url || envUrl).trim(),
        anonKey: (data.anonKey || envKey).trim(),
      };
    } catch (e) {
      console.error('Failed to read config file:', e);
    }
  }

  return {
    url: envUrl.trim(),
    anonKey: envKey.trim(),
  };
}

// API: Get Supabase config so any client/window connects automatically
app.get('/api/config', (_req, res) => {
  const cfg = getServerConfig();
  res.json({
    url: cfg.url,
    anonKey: cfg.anonKey,
    isConfigured: !!(cfg.url && cfg.anonKey),
  });
});

// API: Save Supabase config from any window so all windows receive it
app.post('/api/config', (req, res) => {
  const { url, anonKey } = req.body;
  const cleanUrl = (url || '').trim();
  const cleanKey = (anonKey || '').trim();

  try {
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify({ url: cleanUrl, anonKey: cleanKey }, null, 2),
      'utf-8'
    );
    process.env.VITE_SUPABASE_URL = cleanUrl;
    process.env.VITE_SUPABASE_ANON_KEY = cleanKey;
    res.json({ success: true, isConfigured: !!(cleanUrl && cleanKey) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Development mode with Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode serving built assets
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Classroom server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
