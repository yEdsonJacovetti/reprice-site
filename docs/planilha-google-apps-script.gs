/**
 * RePrice -> Google Planilhas
 * Copia todos os produtos do site para a aba "Produtos".
 *
 * Como usar:
 * 1. Na planilha: Extensões > Apps Script. Apague o que tiver e cole este código.
 * 2. Troque SITE e CHAVE abaixo e salve.
 * 3. Rode a função "atualizarProdutos" uma vez (vai pedir autorização).
 * 4. (Opcional) Rode "ativarAtualizacaoAutomatica" para atualizar a cada 15 min.
 * Depois disso aparece o menu "RePrice" na planilha.
 */

const SITE = 'https://SEU-SITE.netlify.app'; // endereço do site, sem barra no final
const CHAVE = 'COLE_AQUI_A_EXPORT_KEY';       // mesmo valor da EXPORT_KEY no Netlify
const ABA = 'Produtos';

const COLUNAS = [
  ['nome', 'Produto'],
  ['categoria', 'Categoria'],
  ['mercado', 'Mercado'],
  ['cidade', 'Cidade'],
  ['precoOriginal', 'Preço original (R$)'],
  ['precoPromocional', 'Preço promocional (R$)'],
  ['desconto', 'Desconto (%)'],
  ['quantidade', 'Quantidade'],
  ['validade', 'Validade'],
  ['status', 'Status'],
  ['atualizadoEm', 'Atualizado no site'],
  ['id', 'ID'],
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('RePrice')
    .addItem('Atualizar produtos agora', 'atualizarProdutos')
    .addItem('Atualizar a cada 15 min', 'ativarAtualizacaoAutomatica')
    .addItem('Parar atualização automática', 'desativarAtualizacaoAutomatica')
    .addToUi();
}

function atualizarProdutos() {
  const url = SITE + '/api/export/products?key=' + encodeURIComponent(CHAVE);
  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const code = resp.getResponseCode();
  if (code !== 200) {
    throw new Error('O site respondeu ' + code + ': ' + resp.getContentText().slice(0, 200));
  }
  const dados = JSON.parse(resp.getContentText());

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(ABA) || ss.insertSheet(ABA);
  sh.clearContents();

  const cabecalho = COLUNAS.map(function (c) { return c[1]; });
  const linhas = dados.produtos.map(function (p) {
    return COLUNAS.map(function (c) { return p[c[0]]; });
  });

  sh.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]).setFontWeight('bold');
  if (linhas.length) sh.getRange(2, 1, linhas.length, cabecalho.length).setValues(linhas);
  sh.setFrozenRows(1);

  const ultima = cabecalho.length + 2;
  sh.getRange(1, ultima).setValue('Última atualização');
  sh.getRange(2, ultima).setValue(new Date());
  sh.getRange(3, ultima).setValue(dados.total + ' produtos');
}

function ativarAtualizacaoAutomatica() {
  desativarAtualizacaoAutomatica();
  ScriptApp.newTrigger('atualizarProdutos').timeBased().everyMinutes(15).create();
}

function desativarAtualizacaoAutomatica() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'atualizarProdutos') ScriptApp.deleteTrigger(t);
  });
}
