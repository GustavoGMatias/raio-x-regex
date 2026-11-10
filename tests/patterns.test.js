// Testa os padrões com o motor REAL da main (parser → AFN → AFD → mínimo).
// Assim garantimos que as ERs funcionam com o parser do Gustavo e o AFD da Sofia.
const test = require('node:test');
const assert = require('node:assert');
const { parse } = require('../src/parser');
const { construirAFN } = require('../src/nfa');
const { afnParaAFD, minimizar, executarAFD } = require('../src/dfa');
const { padroes } = require('../src/patterns');
const { varrer } = require('../src/scanner');

const compilar = (er) => minimizar(afnParaAFD(construirAFN(parse(er))));
const comAFD = padroes.map((p) => ({ ...p, afd: compilar(p.er) }));

for (const p of comAFD) {
  test(`${p.nome}: aceita os exemplos`, () => {
    for (const ex of p.exemplos) assert.ok(executarAFD(p.afd, ex).aceita, `deveria aceitar "${ex}"`);
  });
  test(`${p.nome}: rejeita os não-exemplos`, () => {
    for (const ex of p.naoExemplos) assert.ok(!executarAFD(p.afd, ex).aceita, `deveria rejeitar "${ex}"`);
  });
}

const resumo = (texto, ds) => ds.map((d) => [d.padrao.nome, texto.slice(d.inicio, d.fim)]);

test('varrer com padrões reais: placa e telefone numa frase', () => {
  const texto = 'Bati no carro ABC1D23, me liga no (11) 98765-4321 ou 3456-7890.';
  assert.deepStrictEqual(resumo(texto, varrer(texto, comAFD)), [
    ['placa', 'ABC1D23'], ['telefone', '(11) 98765-4321'], ['telefone', '3456-7890'],
  ]);
});

test('varrer com padrões reais: +55 e placa minúscula', () => {
  const texto = 'o carro abc1d23 é do João, +55 21 3456-7890';
  assert.deepStrictEqual(resumo(texto, varrer(texto, comAFD)), [
    ['placa', 'abc1d23'], ['telefone', '+55 21 3456-7890'],
  ]);
});

test('varrer com padrões reais: placa colada não destaca', () => {
  assert.deepStrictEqual(varrer('ABC1D234', comAFD), []);
});
