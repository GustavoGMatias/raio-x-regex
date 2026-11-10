// O desenho em si roda no navegador (demo-arvore.html); aqui testamos o layout.
const test = require('node:test');
const assert = require('node:assert');
const { layoutArvore, idsDaSubarvore } = require('../src/arvore');
const { parse } = require('../src/parser');

const EXEMPLO = {
  id: 1, t: 'cat', trecho: [0, 7],
  a: { id: 2, t: 'char', set: new Set(['a']), trecho: [0, 1] },
  b: { id: 3, t: 'star', trecho: [1, 7],
    a: { id: 4, t: 'alt', trecho: [2, 5],
      a: { id: 5, t: 'char', set: new Set(['b']), trecho: [2, 3] },
      b: { id: 6, t: 'char', set: new Set(['c']), trecho: [4, 5] } } },
};

test('layout: um item por nó, com textos dos operadores', () => {
  const { nos } = layoutArvore(EXEMPLO);
  const porId = Object.fromEntries(nos.map((n) => [n.id, n]));
  assert.equal(nos.length, 6);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((i) => porId[i].texto), ['·', 'a', '*', '|', 'b', 'c']);
  assert.equal(porId[1].pai, null);
  assert.equal(porId[5].pai, 4);
});

test('layout: filhos abaixo do pai, folhas da esquerda para a direita, pai no meio', () => {
  const { nos, largura, altura } = layoutArvore(EXEMPLO);
  const p = Object.fromEntries(nos.map((n) => [n.id, n]));
  for (const n of nos) if (n.pai != null) assert.ok(n.y > p[n.pai].y);
  assert.ok(p[2].x < p[5].x && p[5].x < p[6].x);
  assert.equal(p[4].x, (p[5].x + p[6].x) / 2);
  assert.equal(p[3].x, p[4].x); // star tem um filho só: fica em cima dele
  for (const n of nos) assert.ok(n.x > 0 && n.x < largura && n.y > 0 && n.y < altura);
});

test('layout: nós sem id (parser antigo) ganham ids únicos', () => {
  const { nos } = layoutArvore(parse('a(b|c)*'));
  const ids = nos.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('idsDaSubarvore: o nó e todos os descendentes', () => {
  const lay = layoutArvore(EXEMPLO);
  assert.deepEqual(idsDaSubarvore(lay, 3).sort(), [3, 4, 5, 6]);
  assert.deepEqual(idsDaSubarvore(lay, 2), [2]);
});

test('layout: classes viram rótulo curto', () => {
  const { nos } = layoutArvore(parse('[0-9]'));
  assert.equal(nos[0].texto, '[0-9]');
});
