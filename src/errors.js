/**
 * Erros de domínio do scraper, com um código HTTP sugerido.
 */
export class ScraperError extends Error {
  constructor(message, { status = 500, code = 'SCRAPE_ERROR', details = null } = {}) {
    super(message);
    this.name = 'ScraperError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const ErrorCodes = {
  INVALID_URL: 'INVALID_URL',
  UNSUPPORTED_SITE: 'UNSUPPORTED_SITE',
  REQUEST_FAILED: 'REQUEST_FAILED',
  BLOCKED: 'BLOCKED',
  LAYOUT_CHANGED: 'LAYOUT_CHANGED',
  INTERNAL: 'INTERNAL',
};
