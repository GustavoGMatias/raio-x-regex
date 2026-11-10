// Testes da parte pura do Viz3D: layout automático e montagem das fases da animação.
const test = require('node:test');
const assert = require('node:assert');
const { Viz3D, calcularLayout, profundidades } = require('../src/viz3d');
const { parse } = require('../src/parser');
const { construirAFN, grafoAFN, tracoAFN } = require('../src/nfa');

const grafoContrato = {
  states: [
    { id: 0, label: 'q0', start: true, accept: false },
    { id: 1, label: 'q1', start: false, accept: false },
    { id: 2, label: 'q2', start: false, accept: true },
  ],
  edges: [
    { from: 0, to: 1, label: 'a' }, { from: 0, to: 0, label: 'b' },
    { from: 1, to: 1, label: 'a' }, { from: 1, to: 2, label: 'b' },
    { from: 2, to: 1, label: 'a' }, { from: 2, to: 0, label: 'b' },
  ],
};

const afdContrato = {
  n: 3, start: 0, aceita: new Set([2]),
  trans: [new Map([['a', 1], ['b', 0]]), new Map([['a', 1], ['b', 2]]), new Map([['a', 1], ['b', 0]])],
};

test('profundidades: busca em largura a partir do inicial', () => {
  const p = profundidades(grafoContrato);
  assert.deepStrictEqual([p.get(0), p.get(1), p.get(2)], [0, 1, 2]);
});

test('profundidades: inalcançável vai para depois da última camada', () => {
  const g = { states: [{ id: 0, start: true }, { id: 1 }, { id: 2 }], edges: [{ from: 0, to: 1, label: 'a' }] };
  assert.strictEqual(profundidades(g).get(2), 2);
});

test('layout: toda posição é finita e o grafo cabe na esfera de raio 1', () => {
  const g = grafoAFN(construirAFN(parse('[A-Z]{3}([0-9][A-Z][0-9]{2}|-?[0-9]{4})')));
  const pos = calcularLayout(g);
  assert.strictEqual(pos.size, g.states.length);
  let max = 0;
  for (const p of pos.values()) {
    assert.ok(p.every(Number.isFinite));
    max = Math.max(max, Math.hypot(...p));
  }
  assert.ok(Math.abs(max - 1) < 1e-9);
});

test('layout: é determinístico', () => {
  const a = calcularLayout(grafoContrato), b = calcularLayout(grafoContrato);
  for (const id of [0, 1, 2]) assert.deepStrictEqual(a.get(id), b.get(id));
});

test('layout: lê da esquerda para a direita', () => {
  const pos = calcularLayout(grafoContrato);
  assert.ok(pos.get(0)[0] < pos.get(1)[0] && pos.get(1)[0] < pos.get(2)[0]);
});

test('layout: grafo vazio e de um estado só', () => {
  assert.strictEqual(calcularLayout({ states: [], edges: [] }).size, 0);
  const um = calcularLayout({ states: [{ id: 0, start: true, accept: true }], edges: [] });
  assert.deepStrictEqual(um.get(0), [0, 0, 0]);
});

test('fasesAFN: cadeia aceita termina com mensagem de aceitação', () => {
  const afn = construirAFN(parse('a(b|c)*'));
  const fases = Viz3D.fasesAFN(tracoAFN(afn, 'abbc'), afn, 'abbc');
  const ultima = fases[fases.length - 1];
  assert.match(ultima.texto, /^Aceita/);
  assert.ok(ultima.ativos.includes(afn.accept));
});

test('fasesAFN: cadeia que morre marca "morreu aqui" nos últimos ativos', () => {
  const afn = construirAFN(parse('a(b|c)*'));
  const traco = tracoAFN(afn, 'abx');
  const fases = Viz3D.fasesAFN(traco, afn, 'abx');
  const ultima = fases[fases.length - 1];
  assert.match(ultima.texto, /^Rejeita.*'x'.*posição 2/);
  assert.deepStrictEqual(ultima.morto, traco.passos[1].depois);
});

test('fasesAFN: cadeia que acaba fora da aceitação', () => {
  const afn = construirAFN(parse('(a|b)*ab'));
  const fases = Viz3D.fasesAFN(tracoAFN(afn, 'ba'), afn, 'ba');
  assert.match(fases[fases.length - 1].texto, /^Rejeita: a cadeia acabou/);
});

test('fasesAFD: caminho, aceitação e morte com o esperado', () => {
  const exec = { caminho: [0, 0, 0, 1, 2], morreuEm: -1, aceita: true, esperado: ['a', 'b'] };
  const fases = Viz3D.fasesAFD(exec, afdContrato, 'bbab');
  assert.strictEqual(fases.length, 6);
  assert.deepStrictEqual(fases[3].arestas, [{ de: 0, para: 1 }]); // leu 'a': q0 → q1
  assert.match(fases[5].texto, /^Aceita/);

  const morre = Viz3D.fasesAFD({ caminho: [0, 1], morreuEm: 1, aceita: false, esperado: ['a', 'b'] }, afdContrato, 'ax');
  const ult = morre[morre.length - 1];
  assert.deepStrictEqual(ult.morto, [1]);
  assert.match(ult.texto, /'x'.*Esperava a ou b/);
});
