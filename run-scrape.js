import fs from 'fs';
import { scrapeProduct } from './src/services/scraper.js';

// Coloque aqui a lista de links de hardware que você quer monitorar
const urlsParaMonitorar = [
  "https://www.kabum.com.br/produto/1063823/placa-de-video-pcyes-geforce-rtx4060-8gb-gddr6-128bits-pvr40608gr6df2",
  
  // Adicione mais links aqui
];

async function executarVarredura() {
  console.log("Iniciando varredura de promoções...");
  const resultados = [];

  for (const url of urlsParaMonitorar) {
    try {
      console.log(`Buscando: ${url}`);
      const dados = await scrapeProduct(url);
      resultados.push({
        url,
        nome: dados.name,
        preco: dados.price,
        precoRaw: dados.priceRaw,
        atualizadoEm: new Date().toISOString()
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
