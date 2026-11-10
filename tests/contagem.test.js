// Testa a contagem com os exemplos do docs/CONTRATOS.md, usando o motor real da main.
const test = require('node:test');
const assert = require('node:assert');
const { parse, ALFABETO } = require('../src/parser');
const { construirAFN } = require('../src/nfa');
const { afnParaAFD, minimizar } = require('../src/dfa');
const { complemento } = require('../src/linguagem');
const { padroes } = require('../src/patterns');
const { contarCadeias, classificar, totalCadeias } = require('../src/contagem');

const min = (er) => minimizar(afnParaAFD(construirAFN(parse(er))));

// ---------- Exemplos do contrato ----------

test('contrato: [0-9]{2} tem 100 cadeias de tamanho 2 e nenhuma de tamanho 3', () => {
  assert.strictEqual(contarCadeias(min('[0-9]{2}'), 2), 100n);
  assert.strictEqual(contarCadeias(min('[0-9]{2}'), 3), 0n);
});

test('contrato: existem 456.976.000 placas Mercosul (26³ × 10 × 26 × 10²)', () => {
  assert.strictEqual(contarCadeias(min('[A-Z]{3}[0-9][A-Z][0-9]{2}'), 7), 456976000n);
});

test('contrato: classificar', () => {
  assert.deepStrictEqual(classificar(min('ab|cd')), { tipo: 'finita', maxTamanho: 2 });
  assert.deepStrictEqual(classificar(min('a*')), { tipo: 'infinita', maxTamanho: null });
  assert.deepStrictEqual(classificar(min('[0-9]{2}')), { tipo: 'finita', maxTamanho: 2 });
});

// ---------- Outros casos ----------

test('contarCadeias: tamanho 0 conta a cadeia vazia só se ela for aceita', () => {
  assert.strictEqual(contarCadeias(min('a*'), 0), 1n);
  assert.strictEqual(contarCadeias(min('a+'), 0), 0n);
});

test('contarCadeias: (a|b)* tem 2^n cadeias de tamanho n', () => {
  for (const n of [0, 1, 5, 20]) assert.strictEqual(contarCadeias(min('(a|b)*'), n), 2n ** BigInt(n));
});

test('contarCadeias: o AFD do contrato para (a|b)*ab, escrito à mão', () => {
  const afd = {
    n: 3, start: 0, aceita: new Set([2]),
    trans: [new Map([['a', 1], ['b', 0]]), new Map([['a', 1], ['b', 2]]), new Map([['a', 1], ['b', 0]])],
  };
  // termina em "ab": as n-2 primeiras posições são livres entre a e b
  assert.strictEqual(contarCadeias(afd, 4), 4n);
  assert.strictEqual(contarCadeias(afd, 1), 0n);
});

test('contarCadeias: respeita aceitaMorto (complemento conta sobre Σ inteiro)', () => {
  const S = BigInt(ALFABETO.size);
  const comp = complemento(min('[0-9]{2}'));
  assert.strictEqual(contarCadeias(comp, 2), S * S - 100n);
  assert.strictEqual(contarCadeias(comp, 3), S ** 3n);
});

test('classificar: linguagem vazia', () => {
  const vazio = { n: 1, start: 0, aceita: new Set(), trans: [new Map([['a', 0]])] };
  assert.deepStrictEqual(classificar(vazio), { tipo: 'vazia', maxTamanho: null });
});

test('classificar: só a cadeia vazia é finita com tamanho 0', () => {
  const soVazia = { n: 1, start: 0, aceita: new Set([0]), trans: [new Map()] };
  assert.deepStrictEqual(classificar(soVazia), { tipo: 'finita', maxTamanho: 0 });
});

test('classificar: complemento de linguagem finita é infinito', () => {
  assert.strictEqual(classificar(complemento(min('[0-9]{2}'))).tipo, 'infinita');
});

test('classificar: ciclo que não leva a aceitação não conta', () => {
  // q0 -a-> q1 (aceita); q0 -b-> q2, e q2 tem laço mas nunca aceita
  const afd = { n: 3, start: 0, aceita: new Set([1]), trans: [new Map([['a', 1], ['b', 2]]), new Map(), new Map([['b', 2]])] };
  assert.deepStrictEqual(classificar(afd), { tipo: 'finita', maxTamanho: 1 });
});

// ---------- Os padrões do projeto ----------

test('padrões: placa, CPF, CEP e data são finitos; e-mail, link e hashtag, infinitos', () => {
  const tipo = (nome) => classificar(min(padroes.find((p) => p.nome === nome).er)).tipo;
  for (const nome of ['placa', 'CPF', 'CEP', 'data', 'telefone']) assert.strictEqual(tipo(nome), 'finita', nome);
  for (const nome of ['e-mail', 'link', 'hashtag', 'valor']) assert.strictEqual(tipo(nome), 'infinita', nome);
});

test('totalCadeias: CEP com e sem hífen = 10^8 × 2', () => {
  assert.strictEqual(totalCadeias(min('[0-9]{5}-?[0-9]{3}')), 2n * 10n ** 8n);
  assert.strictEqual(totalCadeias(min('a*')), null);
});
