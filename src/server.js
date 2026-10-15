import express from 'express';
import { ScraperError } from './errors.js';
import scrapeRouter from './routes/scrape.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Health check.
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'promocao-scraper',
    endpoints: ['GET /api/scrape?url=<product-url>', 'GET /api/sites'],
  });
});

app.use('/api', scrapeRouter);

// 404.
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } });
});

// Handler central de erros — sempre responde JSON.
// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  const isScraperError = error instanceof ScraperError;
  const status = isScraperError ? error.status : 500;
  const code = isScraperError ? error.code : 'INTERNAL';
  const message = isScraperError ? error.message : 'Erro interno inesperado.';

  if (!isScraperError) console.error('[scraper] erro inesperado:', error);

  res.status(status).json({
    success: false,
    error: { code, message, details: isScraperError ? error.details : null },
  });
});

app.listen(PORT, () => {
  console.log(`[scraper] servidor rodando em http://localhost:${PORT}`);
});

export default app;
