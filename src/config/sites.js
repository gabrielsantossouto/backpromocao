/**
 * Configuração de sites suportados.
 *
 * Cada site define:
 *  - match: regex para identificar a URL como pertencente ao site
 *  - selectors: seletores CSS usados para extrair nome, preço e link
 *    (cada campo aceita uma lista de seletores alternativos, testados em ordem)
 *
 * Se o layout mudar, basta atualizar os seletores aqui — nenhum código de
 * scraping precisa ser alterado.
 */
export const SITES = {
  kabum: {
    name: 'KaBuM!',
    match: /^https?:\/\/(www\.)?kabum\.com\.br\//i,
    selectors: {
      name: [
        'h1.h-product-name',
        'h1[data-testid="product-title"]',
        'h1',
      ],
      price: [
        'span.priceCard',
        'span[data-testid="price-cash"]',
        'div.priceSale span',
        '[class*="price"]',
      ],
      link: [
        'link[rel="canonical"]',
        'meta[property="og:url"]',
      ],
      linkAttr: { canonical: 'href', 'og:url': 'content' },
      urlPattern: /^https?:\/\/(www\.)?kabum\.com\.br\/produto\//i,
    },
  },
  pichau: {
    name: 'Pichau',
    match: /^https?:\/\/(www\.)?pichau\.com\.br\//i,
    selectors: {
      name: [
        'h1[class*="ProductName"]',
        'h1',
      ],
      price: [
        'span[class*="priceValue"]',
        'div[class*="price"] span',
        '[class*="price"]',
      ],
      link: [
        'link[rel="canonical"]',
        'meta[property="og:url"]',
      ],
      urlPattern: /^https?:\/\/(www\.)?pichau\.com\.br\/.*\/p\//i,
    },
  },
  mercadolivre: {
    name: 'Mercado Livre',
    match: /^https?:\/\/(www\.)?mercadolivre\.com\.br\//i,
    selectors: {
      name: [
        'h1.ui-pdp-title',
        'h1',
      ],
      price: [
        'span.ui-pdp-price__fraction',
        'span.andes-money-amount__fraction',
        '[class*="price"]',
      ],
      link: [
        'link[rel="canonical"]',
        'meta[property="og:url"]',
      ],
      urlPattern: /^https?:\/\/(www\.)?mercadolivre\.com\.br\/(ML[BBI]\d+)/i,
    },
  },
};

/**
 * Retorna a configuração do site a partir da URL ou `null` se não suportado.
 */
export function detectSite(url) {
  return Object.entries(SITES).find(([, site]) => site.match.test(url))?.[1] ?? null;
}
