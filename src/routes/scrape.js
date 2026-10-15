import { Router } from 'express';
import { ErrorCodes, ScraperError } from '../errors.js';
import { scrapeProduct } from '../services/scraper.js';

const router = Router();

/**
 * GET /api/scrape?url=<url-do-produto>
 * Retorna JSON com { site, name, price, priceRaw, url, scrapedAt }.
 */
router.get('/scrape', async (req, res, next) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      throw new ScraperError('Informe a URL do produto no parâmetro ?url=', {
        status: 400,
        code: ErrorCodes.INVALID_URL,
      });
    }

    const product = await scrapeProduct(url);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sites — lista os sites suportados.
 */
router.get('/sites', async (_req, res) => {
  const { SITES } = await import('../config/sites.js');
  res.json({
    success: true,
    data: Object.values(SITES).map((s) => ({ name: s.name, pattern: s.match.source })),
  });
});

export default router;
