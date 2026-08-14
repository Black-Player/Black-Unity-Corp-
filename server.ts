import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ServerScanner } from './src/services/serverScanner';
import { generateGeminiResponse } from './server/geminiService';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser for base64 images and large payloads
  app.use(express.json({ limit: '25mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Server-side Gemini API Proxy Endpoints
  app.post('/api/gemini/generate', async (req, res) => {
    try {
      const { prompt, messages, model, systemInstruction, thinkingMode, image } = req.body;
      const result = await generateGeminiResponse({
        prompt,
        messages,
        model,
        systemInstruction,
        thinkingMode,
        image,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('[Gemini API Error]', err);
      res.status(500).json({
        success: false,
        error: err.message || 'An error occurred during Gemini AI processing.',
      });
    }
  });

  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { messages, model, systemInstruction, thinkingMode, image } = req.body;
      const result = await generateGeminiResponse({
        messages,
        model: model || 'gemini-3.5-flash',
        systemInstruction,
        thinkingMode,
        image,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('[Gemini Chat Error]', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to complete chat response.',
      });
    }
  });

  app.post('/api/gemini/analyze-chart', async (req, res) => {
    try {
      const { imageBase64, mimeType, prompt, thinkingMode } = req.body;
      const chartPrompt = prompt || "Analyze this market chart in detail. Identify market structure (BOS/CHoCH), Order Blocks (OB), Fair Value Gaps (FVG), Liquidity Sweeps, and any 6-Step Multi-Timeframe Reversal setups. Provide clear Entry, Stop Loss, Take Profit 1/2/3 levels, and risk management recommendations.";
      
      const result = await generateGeminiResponse({
        prompt: chartPrompt,
        model: thinkingMode ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash',
        thinkingMode: !!thinkingMode,
        image: {
          base64: imageBase64,
          mimeType: mimeType || 'image/png'
        },
        systemInstruction: "You are the Zion AI Cosmic Chart Analysis Oracle. You specialize in Smart Money Concepts (SMC), Market Maker Models (MMM), ICT, and 6-Step Multi-Timeframe Reversals. Be concise, precise, and highly structured."
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('[Gemini Chart Analysis Error]', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to analyze chart image.',
      });
    }
  });

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
    console.log(`[Server] Express web server running on http://0.0.0.0:${PORT}`);

    // Launch background automated scanner asynchronously without blocking startup
    try {
      const scanner = new ServerScanner();
      scanner.start().then(() => {
        console.log('[Server] Server-Side Automated SMC Breakout Scanner started in background.');
      }).catch((err) => {
        console.error('[Server] Failed to start ServerScanner background worker:', err);
      });
    } catch (err) {
      console.error('[Server] Failed to initialize ServerScanner:', err);
    }
  });
}

startServer();
