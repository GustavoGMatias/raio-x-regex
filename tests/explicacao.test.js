const test = require('node:test');
const assert = require('node:assert');
const { parse } = require('../src/parser');
const { explicar } = require('../src/explicacao');

function ids(ast) {
  const r = [];
  (function ir(n) { r.push(n.id); if (n.a) ir(n.a); if (n.b) ir(n.b); })(ast);
  return r;
}

test('uma frase por nó, na ordem dos ids', () => {
  const ast = parse('a(b|c)*');
  const e = explicar(ast);
  assert.deepEqual(e.map((x) => x.noId), ids(ast));
  for (const x of e) assert.ok(typeof x.texto === 'string' && x.texto.length > 10);
});

test('frases por operador', () => {
  const t = (er, id) => explicar(parse(er)).find((x) => x.noId === id).texto;
  assert.match(t('a*', 1), /zero ou mais vezes/);
  assert.match(t('a|b', 1), /União/);
  assert.match(t('ab', 1), /Concatenação/);
  assert.match(t('a*', 2), /exatamente o caractere a/);
  assert.match(t('[a-z]', 1), /\[a-z\]/);
  assert.match(t('[^0-9]', 1), /fora de \[0-9\]/);
  assert.match(t('.', 1), /qualquer caractere/);
  assert.match(t('', 1), /vazia/);
});

test('o nó da estrela do contrato diz "zero ou mais vezes"', () => {
  const e = explicar(parse('a(b|c)*'));
  assert.match(e.find((x) => x.noId === 3).texto, /zero ou mais vezes/);
});
