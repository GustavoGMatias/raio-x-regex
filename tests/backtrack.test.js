const test = require('node:test');
const assert = require('node:assert');
const { parse } = require('../src/parser');
const { casarBacktracking } = require('../src/backtrack');

test('casa e rejeita, devolvendo o contador de passos', () => {
  const ast = parse('ab*c');
  const ok = casarBacktracking(ast, 'abbc', 1000);
  assert.ok(ok.aceita && !ok.estourou && ok.passos > 0);
  assert.ok(!casarBacktracking(ast, 'abbd', 1000).aceita);
});

test('laço vazio (a*)* não trava', () => {
  const r = casarBacktracking(parse('(a*)*b'), 'aaa', 1e5);
  assert.ok(!r.aceita && !r.estourou);
});

test('(a+)+b é exponencial: passos dobram (ou mais) a cada "a" a mais', () => {
  const ast = parse('(a+)+b');
  const p = (n) => casarBacktracking(ast, 'a'.repeat(n) + 'c', 1e9).passos;
  const p10 = p(10), p12 = p(12), p14 = p(14);
  assert.ok(p12 > 3 * p10, `${p10} -> ${p12}`);
  assert.ok(p14 > 3 * p12, `${p12} -> ${p14}`);
});

test('o limite corta a busca e marca estourou', () => {
  const r = casarBacktracking(parse('(a+)+b'), 'a'.repeat(40) + 'c', 10000);
  assert.ok(r.estourou);
  assert.ok(!r.aceita);
  assert.equal(r.passos, 10000);
});

test('ER sem ambiguidade continua linear', () => {
  const r = casarBacktracking(parse('a*b'), 'a'.repeat(1000) + 'c', 1e6);
  assert.ok(!r.estourou);
  assert.ok(r.passos < 10000);
});
