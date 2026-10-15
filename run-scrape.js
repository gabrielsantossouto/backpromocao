import fs from 'fs';
import { scrapeProduct } from './src/services/scraper.js';

const urlsParaMonitorar = [
  "https://www.kabum.com.br/produto/1063823/placa-de-video-pcyes-geforce-rtx4060-8gb-gddr6-128bits-pvr40608gr6df2",
  "https://www.kabum.com.br/produto/459144/placa-de-video-rx-7600-challenger-asrock-amd-radeon-8gb-gddr6-90-ga41zz-00uanf",
  "https://www.kabum.com.br/produto/1064822/memoria-kingston-ddr4-8gb-3200mhz-pc4-25600-cl22-1-2v-288-pin-dimm-kvr32n22s8-8",
  "https://www.mercadolivre.com.br/redragon-gm-707-memoria-ram-ddr4-8gb-3200mhz-gamer/p/MLB67495782",
  "https://www.mercadolivre.com.br/p/MLB64253730",
  "https://www.kabum.com.br/produto/988706/placa-de-video-palit-geforce-rtx-5060-8gb-infinity-2-oc-gddr7-128bits-ne75060v19p1-gb2063l",
  "https://www.kabum.com.br/produto/995288/placa-de-video-husky-alpha-rtx-3070-nvidia-8gb-gddr6-256-bit-dual-fan-hdmi-3x-displayport-hvg3070",
  "https://www.pichau.com.br/placa-de-video-msi-geforce-rtx-5050-gaming-oc-8gb-gddr6-128-bit-g5050-8gc",
  "https://www.pichau.com.br/placa-de-video-powercolor-radeon-rx-7600-fighter-8gb-gddr6-128-bit-rx7600-8g-f-v2",
  
];

async function executarVarredura() {
  console.log("Iniciando varredura de promoções...");
  const resultados = [];

  for (const url of urlsParaMonitorar) {
    try {
      console.log(`Buscando: ${url}`);
      const dados = await scrapeProduct(url);
      
      // Se o scraper retornou os dados com sucesso
      resultados.push({
        site: dados.site || "KaBuM!",
        nome: dados.name,
        preco: dados.price,
        precoRaw: dados.priceRaw,
        image: dados.image || "",
        url: url,
        atualizadoEm: dados.scrapedAt || new Date().toISOString()
      });
    } catch (error) {
      console.error(`Erro ao buscar ${url}:`, error.message);
      // Continua para o próximo link mesmo se um falhar
    }
  }

  // Só grava se encontrou pelo menos um produto válido, ou grava o array (mesmo que parcial)
  fs.writeFileSync('produtos.json', JSON.stringify(resultados, null, 2));
  console.log(`Varredura concluída! 'produtos.json' gerado com ${resultados.length} produtos.`);
}

executarVarredura();
