const test = require('node:test');
const assert = require('node:assert');
const { equivalentes, complemento, produto } = require('../src/linguagem');
const { afnParaAFD, minimizar, executarAFD } = require('../src/dfa');
const { parse } = require('../src/parser');
const { construirAFN } = require('../src/nfa');

const min = (er) => minimizar(afnParaAFD(construirAFN(parse(er))));
const aceita = (afd, s) => executarAFD(afd, s).aceita;
const AMOSTRA = ['', 'a', 'b', 'c', 'x', 'ab', 'ba', 'ac', 'abc', 'aab', 'abab', 'bbab', 'abba', 'cc', 'a b'];

// ---------- equivalentes: exemplos do docs/CONTRATOS.md ----------
test('a(b|c)* e a(c|b)* são iguais', () => {
  assert.deepEqual(equivalentes(min('a(b|c)*'), min('a(c|b)*')), { iguais: true, contraexemplo: null, so: null });
});

test('ab* e a(b|c)*: menor diferença é "ac", aceita só pelo B', () => {
  assert.deepEqual(equivalentes(min('ab*'), min('a(b|c)*')), { iguais: false, contraexemplo: 'ac', so: 'B' });
});

test('(a|b)* e (a|b)*ab: a cadeia vazia já diferencia, aceita só pelo A', () => {
  assert.deepEqual(equivalentes(min('(a|b)*'), min('(a|b)*ab')), { iguais: false, contraexemplo: '', so: 'A' });
});

test('equivalentes: o contraexemplo é mesmo aceito só por um', () => {
  for (const [x, y] of [['a*b', 'a+b'], ['(ab)*', '(ab)+|'], ['a{2,4}', 'aa|aaa'], ['[0-9]{2}', '[0-9]+']]) {
    const A = min(x), B = min(y);
    const r = equivalentes(A, B);
    if (r.iguais) continue;
    assert.equal(aceita(A, r.contraexemplo), r.so === 'A', `${x} x ${y}`);
    assert.equal(aceita(B, r.contraexemplo), r.so === 'B', `${x} x ${y}`);
  }
  assert.equal(equivalentes(min('(ab)*'), min('(ab)+|')).iguais, true);
  assert.equal(equivalentes(min('a{2,3}'), min('aa|aaa')).iguais, true);
});

test('equivalentes: AFD do subconjuntos (não mínimo) contra o mínimo dá igual', () => {
  const afd = afnParaAFD(construirAFN(parse('(a|b)*ab')));
  assert.equal(equivalentes(afd, minimizar(afd)).iguais, true);
});

// ---------- complemento ----------
test('complemento inverte a resposta para qualquer cadeia, inclusive as que morrem', () => {
  const A = min('(a|b)*ab');
  const C = complemento(A);
  assert.equal(C.aceitaMorto, true);
  for (const s of AMOSTRA) assert.equal(aceita(C, s), !aceita(A, s), JSON.stringify(s));
});

test('complemento do complemento volta à linguagem original', () => {
  const A = min('a(b|c)*');
  const CC = complemento(complemento(A));
  assert.equal(CC.aceitaMorto, undefined);
  assert.equal(equivalentes(A, CC).iguais, true);
});

test('complemento: A e não-A nunca são iguais e diferem já na cadeia vazia', () => {
  const r = equivalentes(min('a*'), complemento(min('a*')));
  assert.deepEqual(r, { iguais: false, contraexemplo: '', so: 'A' });
});

test('complemento sobre Σ inteiro: um caractere que A nem usa é aceito pelo complemento', () => {
  const C = complemento(min('ab'));
  assert.ok(aceita(C, 'é'));
  assert.ok(aceita(C, 'z'));
  assert.ok(!aceita(C, 'ab'));
});

// ---------- produto ----------
test('produto: interseção, união e diferença batem com a definição', () => {
  const A = min('a(b|c)*'), B = min('(a|b)*b');
  const casos = {
    intersecao: (a, b) => a && b,
    uniao: (a, b) => a || b,
    diferenca: (a, b) => a && !b,
  };
  for (const [modo, op] of Object.entries(casos)) {
    const P = produto(A, B, modo);
    for (const s of AMOSTRA) assert.equal(aceita(P, s), op(aceita(A, s), aceita(B, s)), `${modo} ${JSON.stringify(s)}`);
  }
});

test('produto: a(b|c)* ∩ (a|b)*b é o mesmo que ab+', () => {
  assert.equal(equivalentes(produto(min('a(b|c)*'), min('(a|b)*b'), 'intersecao'), min('ab+')).iguais, true);
});

test('produto: A - B vazio quando A ⊆ B', () => {
  const D = produto(min('ab'), min('a(b|c)*'), 'diferenca');
  assert.equal(minimizar(D).aceita.size, 0);
});

test('produto: só estados alcançáveis e pares registrados', () => {
  const P = produto(min('ab'), min('ab'), 'intersecao');
  assert.equal(P.n, 3); // (0,0) (1,1) (2,2): andam juntos, nunca descolam
  assert.deepEqual(P.pares, [[0, 0], [1, 1], [2, 2]]);
});

test('produto com complemento: diferença via interseção com o complemento', () => {
  const A = min('(a|b)*'), B = min('(a|b)*ab');
  const viaComp = produto(A, complemento(B), 'intersecao');
  assert.equal(equivalentes(viaComp, produto(A, B, 'diferenca')).iguais, true);
  const uniaoComp = produto(complemento(A), complemento(B), 'uniao');
  assert.equal(uniaoComp.aceitaMorto, true);
  for (const s of AMOSTRA) assert.equal(aceita(uniaoComp, s), !aceita(A, s) || !aceita(B, s), JSON.stringify(s));
});

test('produto: modo inválido dá erro claro', () => {
  assert.throws(() => produto(min('a'), min('b'), 'xor'), /modo desconhecido/);
});
