import fs from 'fs';
import { scrapeProduct } from './src/services/scraper.js';

// Coloque aqui os links das peças de PC que você quer monitorar
const urlsParaMonitorar = [
  "https://www.kabum.com.br/produto/1063823/placa-de-video-pcyes-geforce-rtx4060-8gb-gddr6-128bits-pvr40608gr6df2",
  "https://www.kabum.com.br/produto/459144/placa-de-video-rx-7600-challenger-asrock-amd-radeon-8gb-gddr6-90-ga41zz-00uanf",
  // Adicione mais links aqui
];

async function executarVarredura() {
  console.log("Iniciando varredura de promoções...");
  const resultados = [];

  for (const url of urlsParaMonitorar) {
    try {
      console.log(`Buscando: ${url}`);
      const dados = await scrapeProduct(url);
      
      // Ajustado para pegar o objeto 'data' ou direto dependendo de como o scraper retorna
      resultados.push({
        site: dados.site || "KaBuM!",
        nome: dados.name,
        preco: dados.price,
        precoRaw: dados.priceRaw,
        image: dados.image || "", // Agora salvando a foto!
        url: url,
        atualizadoEm: dados.scrapedAt || new Date().toISOString()
      });
    } catch (error) {
      console.error(`Erro ao buscar ${url}:`, error.message);
    }
  }

  // Salva tudo no produtos.json na raiz
  fs.writeFileSync('produtos.json', JSON.stringify(resultados, null, 2));
  console.log("Varredura concluída! 'produtos.json' gerado com sucesso.");
}

executarVarredura();
