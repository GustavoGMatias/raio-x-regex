const test = require('node:test');
const assert = require('node:assert');
const { duelar, escada, EXEMPLOS } = require('../src/duelo');
const { ErroER } = require('../src/parser');

test('os dois motores concordam e os campos existem', () => {
  const r = duelar('ab*c', 'abbbc');
  assert.ok(r.backtracking.aceita && r.afn.aceita);
  assert.ok(r.backtracking.passos > 0 && r.afn.trabalho > 0 && r.afn.estados > 0);
});

test('ER inválida lança ErroER com posição', () => {
  assert.throws(() => duelar('a(b', 'ab'), (e) => e instanceof ErroER && e.pos === 1);
});

test('(a+)+b: backtracking explode e o AFN cresce linearmente', () => {
  const ex = EXEMPLOS[0];
  const l = escada(ex.er, ex.montar, [8, 12, 16], 1e9);
  assert.ok(l[2].backtracking.passos > 10 * l[0].backtracking.passos);
  const razao = l[2].afn.trabalho / l[0].afn.trabalho;
  assert.ok(razao < 4, `AFN cresceu ${razao}x de n=8 para n=16`);
});

test('limite pequeno estoura no backtracking, mas o AFN responde', () => {
  const r = duelar('(a+)+b', 'a'.repeat(40) + 'c', 5000);
  assert.ok(r.backtracking.estourou);
  assert.equal(r.afn.aceita, false);
});

test('controle a*b: backtracking não explode', () => {
  const ex = EXEMPLOS.find((e) => e.er === 'a*b');
  const l = escada(ex.er, ex.montar, [8, 16], 1e9);
  assert.ok(l[1].backtracking.passos < 4 * l[0].backtracking.passos);
});

test('todos os exemplos: as respostas concordam quando o backtracking termina', () => {
  for (const ex of EXEMPLOS) {
    for (const l of escada(ex.er, ex.montar, [3, 6, 9], 1e6)) {
      if (!l.backtracking.estourou) assert.equal(l.backtracking.aceita, l.afn.aceita, ex.er);
    }
  }
});

test('o AFD mínimo gasta um passo por caractere e concorda com os outros', () => {
  const r = duelar('(a+)+b', 'a'.repeat(30) + 'c', 1000);
  assert.ok(r.afd);
  assert.equal(r.afd.aceita, r.afn.aceita);
  assert.ok(r.afd.passos <= 32);                  // no máximo o tamanho da cadeia (+1 se morreu)
  assert.ok(r.afd.estados >= 1);
});

test('ER cujo AFD estoura o teto: a coluna do AFD some, o resto continua', () => {
  const r = duelar('(a|b)*a(a|b){15}', 'ab'.repeat(8), 1000);
  assert.equal(r.afd, null);
  assert.equal(typeof r.afn.aceita, 'boolean');
});
