import axios from 'axios';
import * as cheerio from 'cheerio';
import { detectSite } from '../config/sites.js';
import { ErrorCodes, ScraperError } from '../errors.js';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 750;

// Padrões de URL que indicam muro anti-bot / verificação de conta.
const CHALLENGE_URL_PATTERN = /account-verification|captcha|challenge|security-check|verify|bot-detection/i;

const http = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
  maxRedirects: 5,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
  },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Busca a página HTML com Axios, com timeout, User-Agent realista e
 * reenvio exponencial para falhas transitórias (429/5xx/timeout).
 *
 * @returns {Promise<{html: string, finalUrl: string}>}
 */
async function fetchHtml(url) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await http.get(url);
      const finalUrl = response.request?.res?.responseUrl ?? url;

      // Ex.: Mercado Livre redireciona para /gz/account-verification quando desconfia do cliente.
      if (CHALLENGE_URL_PATTERN.test(finalUrl)) {
        throw new ScraperError(
          'O site redirecionou para uma página de verificação anti-bot. Tente novamente mais tarde.',
          { status: 503, code: ErrorCodes.BLOCKED, details: { url, finalUrl } },
        );
      }

      return { html: response.data, finalUrl };
    } catch (error) {
      if (error instanceof ScraperError) throw error;

      lastError = error;
      const status = error.response?.status;
      const retryable = !status || status === 429 || status >= 500;

      if (!retryable) break;
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * 2 ** attempt);
    }
  }

  throw toRequestError(lastError, url);
}

/**
 * Converte erros do Axios em ScraperError com mensagens amigáveis.
 */
function toRequestError(error, url) {
  if (!error.response) {
    const timedOut = error.code === 'ECONNABORTED';
    return new ScraperError(
      timedOut
        ? 'O site não respondeu dentro do tempo limite (possível bloqueio ou instabilidade).'
        : `Falha de rede ao acessar o site: ${error.message}`,
      { status: 502, code: ErrorCodes.REQUEST_FAILED, details: { url, code: error.code } },
    );
  }

  const status = error.response.status;

  if (status === 403 || status === 429 || status === 503) {
    return new ScraperError(
      `O site bloqueou a requisição temporariamente (HTTP ${status}). Tente novamente mais tarde.`,
      { status: 503, code: ErrorCodes.BLOCKED, details: { url, httpStatus: status } },
    );
  }

  if (status === 404) {
    return new ScraperError('Página do produto não encontrada (HTTP 404).', {
      status: 404,
      code: ErrorCodes.REQUEST_FAILED,
      details: { url, httpStatus: status },
    });
  }

  return new ScraperError(`O site respondeu com erro HTTP ${status}.`, {
    status: 502,
    code: ErrorCodes.REQUEST_FAILED,
    details: { url, httpStatus: status },
  });
}


/**
 * Testa os seletores alternativos em ordem e retorna o primeiro valor não vazio.
 */
function firstMatch($, selectors) {
  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length) {
      const value = (el.text() || '').replace(/\s+/g, ' ').trim();
      if (value) return { value, selector };
    }
  }
  return { value: null, selector: null };
}

/**
 * Extrai o link canônico do produto (canonical ou og:url).
 */
function extractLink($) {
  return (
    $('link[rel="canonical"]').attr('href') ??
    $('meta[property="og:url"]').attr('content') ??
    null
  );
}

/**
 * Normaliza o preço extraído: "R$ 3.499,00" -> 3499.00
 */
function parsePrice(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d,.-]/g, '');
  const normalized = digits.includes(',')
    ? digits.replace(/\./g, '').replace(',', '.')
    : digits;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Fallback: extrai o primeiro "R$ 1.234,56" encontrado no HTML bruto.
 * Usado quando o layout muda e os seletores CSS deixam de funcionar.
 */
function extractPriceByRegex(html) {
  const match = html.match(/R\$\s?(\d{1,3}(?:\.\d{3})*,\d{2})/);
  return match ? match[1] : null;
}

/**
 * Fallback: lê os dados estruturados schema.org (application/ld+json)
 * presentes na página — o formato mais estável entre mudanças de layout.
 */
function extractFromJsonLd($) {
  let product = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    if (product) return;
    let data;
    try {
      data = JSON.parse($(el).html() ?? '');
    } catch {
      return; // JSON malformado não deve derrubar o scraper
    }

    const nodes = Array.isArray(data) ? data : data['@graph'] ?? [data];
    product = nodes.find((n) => n && (n['@type'] === 'Product' || n['@type']?.includes?.('Product')));
  });

  if (!product) return null;

  const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  return {
    name: typeof product.name === 'string' ? product.name.trim() : null,
    price: offers?.price ?? offers?.lowPrice ?? null,
    url: typeof product.url === 'string' ? product.url : null,
  };
}


/**
 * Função principal: busca uma página de produto e extrai nome, preço e link.
 *
 * @param {string} url URL completa da página do produto
 * @returns {Promise<object>} dados estruturados do produto
 * @throws {ScraperError} URL inválida, site não suportado, bloqueio ou layout alterado
 */
export async function scrapeProduct(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new ScraperError('URL inválida. Informe uma URL completa, incluindo https://', {
      status: 400,
      code: ErrorCodes.INVALID_URL,
    });
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    throw new ScraperError('Apenas URLs http(s) são permitidas.', {
      status: 400,
      code: ErrorCodes.INVALID_URL,
    });
  }

  const site = detectSite(url);
  if (!site) {
    throw new ScraperError('Site não suportado. Sites aceitos: KaBuM!, Pichau e Mercado Livre.', {
      status: 400,
      code: ErrorCodes.UNSUPPORTED_SITE,
    });
  }

  const { html } = await fetchHtml(url);
  const $ = cheerio.load(html);

  const jsonLd = extractFromJsonLd($);

  const name = firstMatch($, site.selectors.name);
  const price = firstMatch($, site.selectors.price);
  const link = extractLink($);

  const resolvedName = name.value ?? jsonLd?.name ?? null;
  const resolvedPrice = price.value ?? jsonLd?.price ?? extractPriceByRegex(html);

  // Sem nome nem preço => layout mudou ou a página é um bloqueio/CAPTCHA.
  if (!resolvedName || resolvedPrice == null) {
    const looksBlocked = /captcha|access denied|cloudflare|verifying you are human|account-verification/i.test(
      html,
    );
    if (looksBlocked) {
      throw new ScraperError('O site apresentou um desafio anti-bot (CAPTCHA/bloqueio).', {
        status: 503,
        code: ErrorCodes.BLOCKED,
        details: { url, site: site.name },
      });
    }
    throw new ScraperError(
      `Não foi possível extrair os dados do produto em ${site.name}. O layout pode ter mudado.`,
      {
        status: 422,
        code: ErrorCodes.LAYOUT_CHANGED,
        details: {
          url,
          site: site.name,
          missing: {
            name: resolvedName ? null : name.selector,
            price: resolvedPrice == null ? (price.selector ?? 'regex') : null,
          },
        },
      },
    );
  }

  // preço "cru" formatado (ex.: "2.773,90") quando disponível no layout;
  // senão, usa o do JSON-LD apenas se bater com o valor final.
  let priceRaw = price.value;
  if (!priceRaw) {
    const regexRaw = extractPriceByRegex(html);
    priceRaw =
      regexRaw && parsePrice(regexRaw) === parsePrice(resolvedPrice)
        ? regexRaw
        : String(resolvedPrice);
  }

  return {
    site: site.name,
    name: resolvedName,
    price: parsePrice(resolvedPrice),
    priceRaw,
    url: link ?? jsonLd?.url ?? url,
    scrapedAt: new Date().toISOString(),
  };
}
