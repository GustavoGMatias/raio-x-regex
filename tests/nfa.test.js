const test = require('node:test');
const assert = require('node:assert');
const { parse } = require('../src/parser');
const { construirAFN, passosThompson, tracoAFN, grafoAFN, rotuloConjunto } = require('../src/nfa');
const { casarBacktracking } = require('../src/backtrack');

const afnDe = (er) => construirAFN(parse(er));
const aceitaAFN = (afn, s) => tracoAFN(afn, s).aceita;

test('formato do AFN: um estado de aceitação, trans com um item por estado', () => {
  const afn = afnDe('a|b*');
  assert.equal(afn.trans.length, afn.n);
  assert.ok(afn.accept >= 0 && afn.accept < afn.n);
  assert.equal(afn.trans[afn.accept].eps.length + afn.trans[afn.accept].mov.length, 0);
});

test('Thompson: tamanhos conhecidos', () => {
  assert.equal(afnDe('a').n, 2);
  assert.equal(afnDe('ab').n, 4);   // 2 + 2, os fragmentos ligados por ε
  assert.equal(afnDe('a|b').n, 6);  // 2 + 2 + início e fim
  assert.equal(afnDe('a*').n, 4);
});

test('aceitação básica', () => {
  const afn = afnDe('ab*c');
  assert.ok(aceitaAFN(afn, 'ac'));
  assert.ok(aceitaAFN(afn, 'abbbc'));
  assert.ok(!aceitaAFN(afn, 'ab'));
  assert.ok(!aceitaAFN(afn, ''));
});

test('ER vazia só aceita a cadeia vazia', () => {
  const afn = afnDe('');
  assert.ok(aceitaAFN(afn, ''));
  assert.ok(!aceitaAFN(afn, 'a'));
});

test('traço: inicial é o fecho-ε do início e cada passo traz os campos do contrato', () => {
  const afn = afnDe('a*b');
  const t = tracoAFN(afn, 'ab');
  assert.ok(t.inicial.includes(afn.start));
  assert.equal(t.passos.length, 2);
  for (const p of t.passos) {
    for (const k of ['ch', 'consome', 'mid', 'eps', 'depois']) assert.ok(k in p, k);
  }
  assert.equal(t.passos[0].ch, 'a');
  assert.ok(t.passos[1].depois.includes(afn.accept));
  assert.ok(t.aceita);
});

test('traço: para quando a cadeia morre', () => {
  const t = tracoAFN(afnDe('ab'), 'xab');
  assert.equal(t.passos.length, 1);
  assert.deepEqual(t.passos[0].depois, []);
  assert.ok(!t.aceita);
});

test('traço: caractere fora do alfabeto leva à morte', () => {
  assert.ok(!aceitaAFN(afnDe('.*'), 'a€b'));
});

test('grafo: estados, início, aceitação e arestas fundidas', () => {
  const afn = afnDe('[a-c]');
  const g = grafoAFN(afn);
  assert.equal(g.states.length, afn.n);
  assert.equal(g.states.filter((s) => s.start).length, 1);
  assert.equal(g.states.filter((s) => s.accept).length, 1);
  const e = g.edges.find((x) => x.label !== 'ε');
  assert.equal(e.label, '[a-c]');
  // sem arestas duplicadas para o mesmo par
  const pares = g.edges.map((x) => `${x.from}>${x.to}`);
  assert.equal(new Set(pares).size, pares.length);
});

test('rótulos', () => {
  assert.equal(rotuloConjunto(new Set(['a'])), 'a');
  assert.equal(rotuloConjunto(new Set(['a', 'b'])), 'a, b');
  assert.equal(rotuloConjunto(parse('[0-9]').set), '[0-9]');
  assert.equal(rotuloConjunto(parse('.').set), '.');
  assert.equal(rotuloConjunto(parse('[^0-9]').set), '[^0-9]');
});

test('traço: morreuEm é o índice do caractere que matou a cadeia, ou -1', () => {
  const afn = afnDe('a(b|c)*');
  assert.equal(tracoAFN(afn, 'abc').morreuEm, -1);
  assert.equal(tracoAFN(afn, 'abx').morreuEm, 2);
  assert.equal(tracoAFN(afn, 'xa').morreuEm, 0);
  assert.equal(tracoAFN(afn, '').morreuEm, -1);
  assert.equal(tracoAFN(afn, 'b').aceita, false); // rejeitou, mas morreu (índice 0)
  assert.equal(tracoAFN(afn, 'b').morreuEm, 0);
});

test('origem: um id de nó da AST para cada estado', () => {
  const ast = parse('a(b|c)*');
  const afn = construirAFN(ast);
  assert.equal(afn.origem.length, afn.n);
  const ids = new Set();
  (function ir(n) { ids.add(n.id); if (n.a) ir(n.a); if (n.b) ir(n.b); })(ast);
  for (const o of afn.origem) assert.ok(ids.has(o), `origem ${o} não é id de nó`);
  // os dois estados de um char vêm do nó dele: o "a" (id 2) criou q0 e q1
  assert.deepEqual(afn.origem.slice(0, 2), [2, 2]);
});

test('passosThompson: um passo por nó, filhos antes do pai, estados sem repetição', () => {
  const ast = parse('a(b|c)*');
  const afn = construirAFN(ast);
  const passos = passosThompson(ast);
  assert.equal(passos.length, 6);
  assert.deepEqual(passos.map((p) => p.noId), [2, 5, 6, 4, 3, 1]);
  for (const p of passos) {
    assert.ok(p.operador && p.texto && Array.isArray(p.estados));
  }
  // juntando os estados dos passos aparecem todos os estados do AFN, uma vez cada
  const todos = passos.flatMap((p) => p.estados).sort((x, y) => x - y);
  assert.deepEqual(todos, [...Array(afn.n).keys()]);
  // cada estado listado num passo tem origem igual ao nó do passo
  for (const p of passos) for (const s of p.estados) assert.equal(afn.origem[s], p.noId);
  // a concatenação só liga fragmentos: não cria estados
  assert.deepEqual(passos[5].estados, []);
});

test('passosThompson é consistente com construirAFN (mesma numeração de estados)', () => {
  for (const er of ['a', 'ab|c', '(a|b)*abb', 'a{2,3}']) {
    const ast = parse(er);
    const n = construirAFN(ast).n;
    assert.equal(passosThompson(ast).reduce((t, p) => t + p.estados.length, 0), n, er);
  }
});

// ---------- comparação com o RegExp do JS e com o backtracking ----------
const CASOS = [
  'a', 'ab|cd', '(a|b)*abb', 'a*', 'a+b?', '(ab)+', '[a-z]+@[a-z]+\\.com',
  '[0-9]{3}-[0-9]{4}', '(a|b){2,4}', 'a{2,}', 'x?y?z?', '(a*)*b', '(a|ab)(c|bcd)',
  '\\d+(,\\d+)?', '[^a-c]x', '(a+)+b', '',
];

function cadeiasAleatorias(alfabeto, n, tamMax, semente = 42) {
  let x = semente;
  const rnd = () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; };
  const r = [''];
  for (let k = 0; k < n; k++) {
    let s = '';
    const t = Math.floor(rnd() * (tamMax + 1));
    for (let i = 0; i < t; i++) s += alfabeto[Math.floor(rnd() * alfabeto.length)];
    r.push(s);
  }
  return r;
}

for (const er of CASOS) {
  test(`AFN, backtracking e RegExp do JS concordam em /${er}/`, () => {
    const afn = afnDe(er);
    const ast = parse(er);
    const js = new RegExp('^(?:' + er + ')$');
    const alfa = [...new Set([...er].filter((c) => /[a-z0-9@.,-]/.test(c)).concat(['a', 'b', 'x', '1']))];
    for (const s of cadeiasAleatorias(alfa, 400, 8)) {
      const esperado = js.test(s);
      assert.equal(aceitaAFN(afn, s), esperado, `AFN errou em "${s}"`);
      const b = casarBacktracking(ast, s, 1e6);
      assert.equal(b.aceita, esperado, `backtracking errou em "${s}"`);
    }
  });
}
