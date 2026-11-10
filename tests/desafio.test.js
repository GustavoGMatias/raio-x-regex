// Testa a parte "sem tela" do modo desafio, com o motor real da main.
const test = require('node:test');
const assert = require('node:assert');
const { parse } = require('../src/parser');
const { construirAFN } = require('../src/nfa');
const { afnParaAFD, minimizar, executarAFD } = require('../src/dfa');
const { gerarExemplos } = require('../src/exemplos');
const { padroes } = require('../src/patterns');
const { montarBaralho, sortear } = require('../src/desafio');

const compilar = (er) => minimizar(afnParaAFD(construirAFN(parse(er))));
const comAFD = padroes.map((p) => ({ ...p, afd: compilar(p.er) }));

test('montarBaralho: cada cadeia está na pilha que o autômato decide', () => {
  for (const p of comAFD) {
    const b = montarBaralho(p, gerarExemplos, executarAFD);
    assert.ok(b.aceitas.length > 0 && b.rejeitadas.length > 0, p.nome);
    for (const c of b.aceitas) assert.ok(executarAFD(p.afd, c).aceita, `${p.nome}: "${c}" devia ser aceita`);
    for (const c of b.rejeitadas) assert.ok(!executarAFD(p.afd, c).aceita, `${p.nome}: "${c}" devia ser rejeitada`);
  }
});

test('montarBaralho: inclui os exemplos e os não-exemplos do padrão', () => {
  const placa = comAFD.find((p) => p.nome === 'placa');
  const b = montarBaralho(placa, gerarExemplos, executarAFD);
  for (const ex of placa.exemplos) assert.ok(b.aceitas.includes(ex), ex);
  for (const ex of placa.naoExemplos) assert.ok(b.rejeitadas.includes(ex), ex);
});

test('sortear: não repete a pergunta anterior', () => {
  const baralhos = { x: { aceitas: ['a', 'b'], rejeitadas: ['c'] } };
  let anterior = null;
  for (let i = 0; i < 50; i++) {
    const s = sortear(baralhos, anterior);
    assert.ok(!anterior || s.cadeia !== anterior.cadeia);
    anterior = s;
  }
});

test('sortear: com aleatório fixo, escolhe a pilha pela metade', () => {
  const baralhos = { x: { aceitas: ['sim'], rejeitadas: ['nao'] } };
  assert.deepStrictEqual(sortear(baralhos, null, () => 0.1), { nome: 'x', cadeia: 'sim' });
  assert.deepStrictEqual(sortear(baralhos, null, () => 0.9), { nome: 'x', cadeia: 'nao' });
});

test('sortear: pilha vazia usa a outra', () => {
  const baralhos = { x: { aceitas: [], rejeitadas: ['nao'] } };
  assert.deepStrictEqual(sortear(baralhos, null, () => 0.1), { nome: 'x', cadeia: 'nao' });
});
