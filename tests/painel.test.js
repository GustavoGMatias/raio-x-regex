// Testes da parte pura do painel: a sincronização entre as três visões.
const test = require('node:test');
const assert = require('node:assert');
const {
  relacionar, estadosDosNos, visiveisAte, grafoAFDProvisorio, executarAFDProvisorio,
} = require('../src/painel');

const M = (o) => new Map(Object.entries(o));

// Exemplo do contrato: (a|b)*ab
const afd = {
  n: 4, start: 0, aceita: new Set([3]),
  trans: [M({ a: 1, b: 2 }), M({ a: 1, b: 3 }), M({ a: 1, b: 2 }), M({ a: 1, b: 2 })],
  subconjuntos: [[0, 1], [1, 2], [1], [1, 3]],
};
const min = {
  n: 3, start: 0, aceita: new Set([2]),
  trans: [M({ a: 1, b: 0 }), M({ a: 1, b: 2 }), M({ a: 1, b: 0 })],
  classes: [[0, 2], [1], [3]],
};

test('clicar num estado do AFD acende o subconjunto no AFN e a classe no mínimo', () => {
  const r = relacionar(afd, min, 'afd', 1);
  assert.deepStrictEqual(r.afn, [1, 2]);
  assert.deepStrictEqual(r.afd, [1]);
  assert.deepStrictEqual(r.min, [1]);
  assert.match(r.texto, /q1 do AFD representa \{q1, q2\}/);
});

test('clicar num estado do mínimo acende os estados equivalentes do AFD', () => {
  const r = relacionar(afd, min, 'min', 0);
  assert.deepStrictEqual(r.afd, [0, 2]);
  assert.deepStrictEqual(r.afn, [0, 1]); // {0,1} ∪ {1}
  assert.match(r.texto, /equivalentes/);
});

test('clicar num estado do AFN acende os estados do AFD que o contêm', () => {
  const r = relacionar(afd, min, 'afn', 1);
  assert.deepStrictEqual(r.afd, [0, 1, 2, 3]);
  assert.deepStrictEqual(r.min, [0, 1, 2]);
  const r3 = relacionar(afd, min, 'afn', 3);
  assert.deepStrictEqual(r3.afd, [3]);
  assert.deepStrictEqual(r3.min, [2]);
});

test('estado do AFD que sumiu na minimização', () => {
  const r = relacionar(afd, { classes: [[0], [1]] }, 'afd', 3);
  assert.deepStrictEqual(r.min, []);
  assert.match(r.texto, /removido/);
});

test('destacarNos usa a origem de cada estado', () => {
  const afn = { origem: [1, 3, 3, 4, 5, 5] };
  assert.deepStrictEqual(estadosDosNos(afn, [3, 5]), [1, 2, 4, 5]);
  assert.deepStrictEqual(estadosDosNos({}, [3]), []); // sem origem, não acende nada
});

test('passo a passo acumula os estados criados', () => {
  const passos = [{ estados: [0, 1] }, { estados: [2, 3] }, { estados: [4, 5] }];
  assert.deepStrictEqual(visiveisAte(passos, 0), [0, 1]);
  assert.deepStrictEqual(visiveisAte(passos, 1), [0, 1, 2, 3]);
  assert.deepStrictEqual(visiveisAte(passos, 99), [0, 1, 2, 3, 4, 5]);
});

test('grafo provisório do AFD junta transições com o mesmo destino', () => {
  const g = grafoAFDProvisorio({ n: 2, start: 0, aceita: new Set([1]), trans: [M({ a: 1, b: 1 }), M({})] });
  assert.deepStrictEqual(g.edges, [{ from: 0, to: 1, label: 'a, b' }]);
  assert.deepStrictEqual(g.states.map((s) => [s.start, s.accept]), [[true, false], [false, true]]);
});

test('execução provisória do AFD segue o contrato', () => {
  assert.deepStrictEqual(executarAFDProvisorio(min, 'bbab'),
    { caminho: [0, 0, 0, 1, 2], morreuEm: -1, aceita: true, esperado: ['a', 'b'] });
  assert.deepStrictEqual(executarAFDProvisorio(min, 'ax'),
    { caminho: [0, 1], morreuEm: 1, aceita: false, esperado: ['a', 'b'] });
  assert.strictEqual(executarAFDProvisorio({ ...min, aceitaMorto: true }, 'ax').aceita, true);
});
