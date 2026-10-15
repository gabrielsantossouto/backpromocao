# promocao-scraper

Web scraping simples de preços de hardware (KaBuM!, Pichau e Mercado Livre) em Node.js com **Axios + Cheerio**, expondo os dados estruturados por um endpoint **Express** em JSON.

> Uso pessoal/educacional. Respeite os termos de uso e o `robots.txt` dos sites; faça requisições com moderação.

## Requisitos

- Node.js 18+ (usa ES modules e `node --watch`)

## Como rodar localmente

```bash
npm install
npm run dev        # sobe em http://localhost:3000 com hot-reload
```

Produção:

```bash
npm start
```

Variável opcional: `PORT` (padrão `3000`).

## Endpoints

### `GET /api/scrape?url=<url-do-produto>`

```bash
curl "http://localhost:3000/api/scrape?url=https://www.kabum.com.br/produto/1008840/placa-de-video-msi-geforce-rtx-5050-gaming-oc-8gb-gddr6-pcie-4-0-912-v538-009"
```

Resposta (200):

```json
{
  "success": true,
  "data": {
    "site": "KaBuM!",
    "name": "Placa De Vídeo Msi Nvidia Geforce RTX 5050 Gaming, 8GB, Gddr6, Dlss, Ray Tracing",
    "price": 2773.9,
    "priceRaw": "2.773,90",
    "url": "https://www.kabum.com.br/produto/1008840/...",
    "scrapedAt": "2026-10-15T10:39:50.752Z"
  }
}
```

Erro (ex.: site bloqueou):

```json
{
  "success": false,
  "error": {
    "code": "BLOCKED",
    "message": "O site redirecionou para uma página de verificação anti-bot. Tente novamente mais tarde.",
    "details": { "url": "...", "finalUrl": "..." }
  }
}
```

### `GET /api/sites`

Lista os sites suportados e os padrões de URL.

### `GET /`

Health check.

## Estrutura do projeto

```
promocao/
├── package.json
├── src/
│   ├── server.js              # bootstrap do Express + error handler global
│   ├── errors.js              # ScraperError + códigos de erro
│   ├── config/
│   │   └── sites.js           # seletores CSS por site (adicione novos sites aqui)
│   ├── routes/
│   │   └── scrape.js          # rotas /api/scrape e /api/sites
│   └── services/
│       └── scraper.js         # request HTTP (Axios) + parse (Cheerio)
└── README.md
```

## Como funciona

1. **Validação da URL** e detecção do site por regex (`src/config/sites.js`).
2. **Request HTTP** com Axios: `User-Agent` de navegador, timeout de 15s, redirects e **retry exponencial** para 429/5xx/timeout.
3. **Extração** com Cheerio em cascata:
   1. seletores CSS (lista de alternativas, testados em ordem);
   2. dados estruturados **JSON-LD** (`application/ld+json`, schema.org `Product`);
   3. regex genérica de preço (`R$ 1.234,56`) como último recurso.
4. **Resposta JSON** com nome, preço numérico (`price`) e preço formatado (`priceRaw`).

## Tratamento de erros

| Código | HTTP | Quando ocorre |
| --- | --- | --- |
| `INVALID_URL` | 400 | URL ausente, malformada ou não-http(s) |
| `UNSUPPORTED_SITE` | 400 | Site fora de KaBuM!/Pichau/Mercado Livre |
| `REQUEST_FAILED` | 404/502 | 404, erro HTTP ou falha de rede/timeout |
| `BLOCKED` | 503 | 403/429/503, CAPTCHA ou redirect para verificação anti-bot |
| `LAYOUT_CHANGED` | 422 | Página carregou mas nenhum campo essencial foi extraído |
| `INTERNAL` | 500 | Erro inesperado |

## Se o layout de um site mudar

Atualize apenas os seletores em `src/config/sites.js` — o JSON-LD e a regex de preço já funcionam como fallback na maioria dos casos.

## Limitações

- Sites com forte proteção anti-bot (Mercado Livre, Pichau) podem bloquear IPs de datacenter/nuvem; o endpoint responde `503 BLOCKED` nesses casos. A partir de uma conexão doméstica geralmente funciona.
- Sem cache e sem respeito a rate limit agressivo — se for rodar em loop, adicione intervalo entre requisições.
- Preços em páginas renderizadas 100% por JavaScript no cliente não são capturados (apenas HTML estático).
