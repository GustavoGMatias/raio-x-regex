const test = require('node:test');
const assert = require('node:assert');
const { parse, ErroER } = require('../src/parser');

const chars = (no) => [...no.set].sort().join('');

test('caractere simples', () => {
  const a = parse('a');
  assert.equal(a.t, 'char');
  assert.equal(chars(a), 'a');
});

test('ER vazia vira eps', () => {
  assert.deepEqual(parse(''), { t: 'eps', trecho: [0, 0], id: 1 });
});

test('concatenação e união (união tem a menor precedência)', () => {
  const a = parse('ab|c');
  assert.equal(a.t, 'alt');
  assert.equal(a.a.t, 'cat');
  assert.equal(a.b.t, 'char');
});

test('estrela', () => {
  assert.equal(parse('a*').t, 'star');
});

test('+ vira a seguido de a*', () => {
  const a = parse('a+');
  assert.equal(a.t, 'cat');
  assert.equal(a.b.t, 'star');
});

test('? vira união com eps', () => {
  const a = parse('a?');
  assert.equal(a.t, 'alt');
  assert.equal(a.b.t, 'eps');
});

test('parênteses mudam a precedência', () => {
  const a = parse('a(b|c)');
  assert.equal(a.t, 'cat');
  assert.equal(a.b.t, 'alt');
});

test('classe [a-c] é um nó só', () => {
  const a = parse('[a-c]');
  assert.equal(a.t, 'char');
  assert.equal(chars(a), 'abc');
});

test('classe com vários itens e hífen literal no fim', () => {
  assert.equal(chars(parse('[a-cx-]')), '-abcx');
});

test('classe negada [^0-9] não contém dígitos e contém letras', () => {
  const a = parse('[^0-9]');
  assert.ok(!a.set.has('5'));
  assert.ok(a.set.has('a'));
});

test('ponto cobre o alfabeto, inclusive acentos', () => {
  const a = parse('.');
  assert.ok(a.set.has('a') && a.set.has('ç') && a.set.has(' '));
});

test('escapes literais', () => {
  assert.equal(chars(parse('\\.')), '.');
  assert.equal(chars(parse('\\*')), '*');
  assert.equal(chars(parse('[\\]]')), ']');
});

test('\\d e \\w', () => {
  assert.equal(chars(parse('\\d')), '0123456789');
  assert.ok(parse('\\w').set.has('_'));
});

test('{3} expande em 3 cópias', () => {
  const a = parse('a{3}');
  assert.equal(a.t, 'cat');
  assert.equal(a.a.t, 'cat');
});

test('{0} vira eps', () => {
  assert.equal(parse('a{0}').t, 'eps');
});

test('{2,} termina com estrela', () => {
  const a = parse('a{2,}');
  assert.equal(a.b.t, 'star');
});

test('{n,m} termina com opcionais', () => {
  const a = parse('a{1,3}');
  assert.equal(a.t, 'cat');
  assert.equal(a.b.t, 'alt');
});

// ---------- erros ----------
function erro(er) {
  try { parse(er); } catch (e) { return e; }
  assert.fail(`esperava erro em ${er}`);
}

test('parêntese sem fechar aponta o "("', () => {
  const e = erro('ab(cd');
  assert.ok(e instanceof ErroER);
  assert.equal(e.pos, 2);
  assert.match(e.message, /'\('/);
});

test('parêntese sem abrir aponta o ")"', () => {
  assert.equal(erro('ab)').pos, 2);
});

test('operador sem operando', () => {
  assert.equal(erro('*a').pos, 0);
  assert.equal(erro('a|+').pos, 2);
});

test('colchete sem fechar', () => {
  assert.equal(erro('x[abc').pos, 1);
});

test('intervalo invertido', () => {
  assert.equal(erro('[z-a]').pos, 1);
});

test('barra no fim', () => {
  assert.equal(erro('ab\\').pos, 2);
});

test('chaves inválidas', () => {
  assert.equal(erro('a{').pos, 2);
  assert.equal(erro('a{2').pos, 1);
  assert.equal(erro('a{3,1}').pos, 1);
  assert.equal(erro('a{x}').pos, 2);
  assert.equal(erro('a{101}').pos, 1);
});

// ---------- id e trecho ----------
function nos(ast) {
  const r = [];
  (function ir(n) { r.push(n); if (n.a) ir(n.a); if (n.b) ir(n.b); })(ast);
  return r;
}

test('a árvore de a(b|c)* é idêntica à do contrato (ids em pré-ordem, trechos)', () => {
  const ast = parse('a(b|c)*');
  assert.deepEqual(nos(ast).map((n) => [n.id, n.t, n.trecho]), [
    [1, 'cat', [0, 7]],
    [2, 'char', [0, 1]],
    [3, 'star', [1, 7]],
    [4, 'alt', [2, 5]],
    [5, 'char', [2, 3]],
    [6, 'char', [4, 5]],
  ]);
});

test('todo nó tem id único a partir de 1 e trecho dentro da ER', () => {
  for (const er of ['', 'a', 'a+', 'a?b', '(ab|c){2,4}', '[a-z]+@x\\.com', '(a*)*', 'a{3}', 'x{1,3}y+']) {
    const todos = nos(parse(er));
    const ids = todos.map((n) => n.id);
    assert.deepEqual(ids, ids.map((_, k) => k + 1), `ids em ${er}`);
    for (const n of todos) {
      assert.ok(Array.isArray(n.trecho) && n.trecho.length === 2, `trecho em ${er}`);
      assert.ok(n.trecho[0] >= 0 && n.trecho[0] <= n.trecho[1] && n.trecho[1] <= er.length, `${er}: ${n.t} ${n.trecho}`);
    }
  }
});

test('nós criados por + herdam o trecho do operador; a cópia do átomo mantém o seu', () => {
  const ast = parse('ab+'); // cat(a, cat(b, star(b')))
  const b = ast.b;
  assert.equal(b.t, 'cat');
  assert.deepEqual(b.trecho, [1, 3]);        // "b+"
  assert.deepEqual(b.a.trecho, [1, 2]);      // o "b"
  assert.deepEqual(b.b.trecho, [1, 3]);      // a estrela criada pela expansão
  assert.deepEqual(b.b.a.trecho, [1, 2]);    // a cópia do "b"
  assert.notEqual(b.a.id, b.b.a.id);         // ids distintos, a cópia é outro nó
});

test('o trecho do texto da ER bate com o pedaço que o nó representa', () => {
  const er = 'x(ab|c)*y';
  const ast = parse(er);
  const star = nos(ast).find((n) => n.t === 'star');
  assert.equal(er.slice(...star.trecho), '(ab|c)*');
  const alt = nos(ast).find((n) => n.t === 'alt');
  assert.equal(er.slice(...alt.trecho), 'ab|c');
});

// ---------- teto no tamanho da árvore ----------
test('repetições aninhadas que explodem a árvore são recusadas rápido, com posição', () => {
  const t0 = Date.now();
  const e = erro('(a{100}){100}');
  assert.ok(Date.now() - t0 < 1000, 'demorou demais para recusar');
  assert.ok(e instanceof ErroER);
  assert.match(e.message, /grande demais/);
  assert.ok(e.pos >= 0);
  assert.throws(() => parse('((a{100}){100}){100}'), ErroER);
});

test('o teto não atrapalha ERs razoáveis', () => {
  for (const er of ['a{100}', '[a-z]{50}', '(ab|cd){20}', '((a{10}){10}){5}', '.{100}']) {
    assert.doesNotThrow(() => parse(er), er);
  }
});

test('depois de um erro de limite, o parser continua funcionando (contador reinicia)', () => {
  assert.throws(() => parse('(a{100}){100}'), ErroER);
  assert.doesNotThrow(() => parse('a(b|c)*'));
});
