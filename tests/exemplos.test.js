const test = require('node:test');
const assert = require('node:assert');
const { gerarExemplos } = require('../src/exemplos');
const { afnParaAFD, minimizar, executarAFD } = require('../src/dfa');
const { parse } = require('../src/parser');
const { construirAFN } = require('../src/nfa');

const minDe = (er) => minimizar(afnParaAFD(construirAFN(parse(er))));

// AFD mínimo do contrato: (a|b)*ab
const afdContrato = () => ({
  n: 3, start: 0, aceita: new Set([2]),
  trans: [new Map([['a', 1], ['b', 0]]), new Map([['a', 1], ['b', 2]]), new Map([['a', 1], ['b', 0]])],
});

test('aceitas são as mais curtas, em ordem de tamanho', () => {
  const { aceitas } = gerarExemplos(afdContrato(), 4);
  assert.equal(aceitas[0], 'ab');
  assert.equal(aceitas.length, 4);
  for (let i = 1; i < aceitas.length; i++) assert.ok(aceitas[i].length >= aceitas[i - 1].length);
});

test('tudo que sai como aceita é aceito e tudo que sai como rejeitada é rejeitado', () => {
  for (const er of ['(a|b)*ab', 'a(b|c)*', '[0-9]{5}-[0-9]{3}', '#[A-Za-z0-9_]+']) {
    const afd = minDe(er);
    const { aceitas, rejeitadas } = gerarExemplos(afd, 5);
    assert.ok(aceitas.length > 0 && rejeitadas.length > 0, er);
    for (const s of aceitas) assert.ok(executarAFD(afd, s).aceita, `${er}: ${s}`);
    for (const s of rejeitadas) assert.ok(!executarAFD(afd, s).aceita, `${er}: ${s}`);
    assert.equal(new Set(rejeitadas).size, rejeitadas.length);
  }
});

test('padrões com classes grandes não explodem e geram cadeias variadas', () => {
  const afd = minDe('[A-Z]{3}[0-9][A-Z][0-9]{2}');
  const { aceitas } = gerarExemplos(afd, 3);
  assert.equal(aceitas.length, 3);
  for (const s of aceitas) assert.equal(s.length, 7);
  assert.ok(!/^A+/.test(aceitas[0]) || new Set(aceitas[0]).size > 2);
});

test('linguagem finita pequena: devolve só o que existe', () => {
  const { aceitas } = gerarExemplos(minDe('ab|cd'), 10);
  assert.deepEqual(aceitas.sort(), ['ab', 'cd']);
});

test('linguagem vazia de cadeias: ER vazia só aceita ""', () => {
  const { aceitas, rejeitadas } = gerarExemplos(minDe(''), 3);
  assert.deepEqual(aceitas, ['']);
  assert.ok(rejeitadas.length > 0);
});
