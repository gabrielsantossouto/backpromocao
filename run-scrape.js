import fs from 'fs';
import { scrapeProduct } from './src/services/scraper.js';

const urlsParaMonitorar = [
  "https://www.kabum.com.br/produto/1063823/placa-de-video-pcyes-geforce-rtx4060-8gb-gddr6-128bits-pvr40608gr6df2",
  "https://www.kabum.com.br/produto/459144/placa-de-video-rx-7600-challenger-asrock-amd-radeon-8gb-gddr6-90-ga41zz-00uanf"
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
