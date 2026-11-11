const test = require('node:test');
const assert = require('node:assert');
const { EXEMPLOS, trechoDoNo, linhasDeExplicacao, resumoContagem, formatarErro } = require('../src/lab');
const { compilar, LIMITE_AFD } = require('../src/main');
const { explicar } = require('../src/explicacao');
const { ErroER } = require('../src/parser');
const { executarAFD } = require('../src/dfa');

test('compilar passa pelo pipeline todo e devolve o formato combinado', () => {
  const c = compilar('(a|b)*ab');
  assert.equal(c.er, '(a|b)*ab');
  for (const k of ['ast', 'afn', 'afd', 'min']) assert.ok(c[k], k);
  assert.equal(c.min.n, 3);                       // exemplo do contrato
  assert.ok(c.afd.subconjuntos && c.min.classes);
  assert.ok(executarAFD(c.min, 'bbab').aceita);
  assert.ok(!executarAFD(c.min, 'abb').aceita);
});

test('compilar lança ErroER com posição para ER inválida', () => {
  assert.throws(() => compilar('a(b'), (e) => e instanceof ErroER && e.pos === 1);
});

test('todos os exemplos do Laboratório compilam e aceitam a cadeia de exemplo', () => {
  for (const ex of EXEMPLOS) {
    const c = compilar(ex.er);
    assert.ok(executarAFD(c.min, ex.cadeia).aceita, `${ex.er} deveria aceitar ${ex.cadeia}`);
  }
});

test('linhasDeExplicacao: uma linha por nó, com o trecho da ER', () => {
  const er = 'a(b|c)*';
  const { ast } = compilar(er);
  const linhas = linhasDeExplicacao(er, ast, explicar(ast));
  assert.equal(linhas.length, 6);
  assert.deepEqual(linhas.map((l) => l.id), [1, 2, 3, 4, 5, 6]);
  assert.equal(linhas[0].trecho, 'a(b|c)*');
  assert.equal(linhas[2].trecho, '(b|c)*');
  assert.match(linhas[2].texto, /zero ou mais vezes/);
  for (const l of linhas) assert.ok(l.texto.length > 0);
});

test('trechoDoNo', () => {
  assert.equal(trechoDoNo('abc', { trecho: [1, 3] }), 'bc');
  assert.equal(trechoDoNo('abc', {}), null);
});

test('resumoContagem e formatarErro', () => {
  assert.equal(resumoContagem({ afn: { n: 10 }, afd: { n: 4 }, min: { n: 2 } }), 'AFN: 10 estados · AFD: 4 · AFD mínimo: 2');
  const e = (() => { try { compilar('ab(cd'); } catch (x) { return x; } })();
  const txt = formatarErro('ab(cd', e);
  assert.match(txt, /ab\(cd\n {2}\^/);
});

test('compilar recusa rápido o que explodiria o AFD, com ErroLimite', () => {
  const t0 = Date.now();
  let erro;
  try { compilar('(a|b)*a(a|b){18}'); } catch (e) { erro = e; }
  assert.ok(erro && erro.name === 'ErroLimite');
  assert.ok(Date.now() - t0 < 2000);
  assert.match(formatarErro('(a|b)*a(a|b){18}', erro), /Expressão pesada demais.*explosão/);
  assert.doesNotThrow(() => compilar('(a|b)*a(a|b){6}'));   // 129 estados: cabe
  assert.ok(LIMITE_AFD >= 129);
});
