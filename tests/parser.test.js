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
  assert.deepEqual(parse(''), { t: 'eps' });
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
  assert.deepEqual(parse('a{0}'), { t: 'eps' });
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
