const test = require('node:test');
const assert = require('node:assert');
const { dadosTabela } = require('../src/tabela');
const { afnParaAFD, minimizar } = require('../src/dfa');
const { parse } = require('../src/parser');
const { construirAFN } = require('../src/nfa');

// AFD dos subconjuntos do docs/CONTRATOS.md.
const afdContrato = () => ({
  n: 4, start: 0, aceita: new Set([3]),
  trans: [new Map([['a', 1], ['b', 2]]), new Map([['a', 1], ['b', 3]]), new Map([['a', 1], ['b', 2]]), new Map([['a', 1], ['b', 2]])],
  subconjuntos: [[0, 1], [1, 2], [1], [1, 3]],
});

test('tabela do AFD dos subconjuntos do contrato', () => {
  const t = dadosTabela(afdContrato());
  assert.deepEqual(t.colunas, ['a', 'b']);
  assert.equal(t.tipoConteudo, 'afn');
  assert.deepEqual(t.linhas.map((l) => l.destinos), [[1, 2], [1, 3], [1, 2], [1, 2]]);
  assert.deepEqual(t.linhas[3], { estado: 3, inicial: false, aceita: true, conteudo: [1, 3], destinos: [1, 2] });
  assert.equal(t.linhas[0].inicial, true);
});

test('símbolos que se comportam igual viram uma coluna só', () => {
  const min = minimizar(afnParaAFD(construirAFN(parse('[A-Z]{3}[0-9]{2}'))));
  const t = dadosTabela(min);
  assert.deepEqual(t.colunas, ['[0-9]', '[A-Z]']);
  assert.equal(t.tipoConteudo, 'afd');
  // q0 lê letra e vai adiante; dígito no começo vai para o morto (null).
  assert.equal(t.linhas[0].destinos[0], null);
  assert.equal(t.linhas[0].destinos[1], 1);
});

test('AFD feito à mão, sem subconjuntos nem classes', () => {
  const t = dadosTabela({ n: 1, start: 0, aceita: new Set([0]), trans: [new Map([['x', 0]])] });
  assert.equal(t.tipoConteudo, null);
  assert.equal(t.linhas[0].conteudo, null);
});
