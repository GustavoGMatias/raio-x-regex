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

test('CEP contra telefone: 8 dígitos sem hífen viram telefone (vem antes na lista)', () => {
  const texto = 'liga 34567890 ou vai no CEP 01310-100';
  assert.deepStrictEqual(resumo(texto, varrer(texto, comAFD)), [['telefone', '34567890'], ['CEP', '01310-100']]);
});

test('CEP contra telefone: se o CEP viesse antes, ele ganharia', () => {
  const cep = comAFD.find((p) => p.nome === 'CEP');
  const tel = comAFD.find((p) => p.nome === 'telefone');
  const texto = '34567890';
  assert.deepStrictEqual(resumo(texto, varrer(texto, [cep, tel])), [['CEP', '34567890']]);
});

test('varrer com padrões reais: uma mensagem com tudo', () => {
  const texto = 'Oi! Meu CPF é 123.456.789-09, nasci em 5/3/2001 e paguei R$ 1.234,56. '
    + 'Manda pra luciana@ufx.edu.br ou veja https://ufx.br/lfc. #automação';
  assert.deepStrictEqual(resumo(texto, varrer(texto, comAFD)), [
    ['CPF', '123.456.789-09'], ['data', '5/3/2001'], ['valor', 'R$ 1.234,56'],
    ['e-mail', 'luciana@ufx.edu.br'], ['link', 'https://ufx.br/lfc'], ['hashtag', '#automação'],
  ]);
});

test('todo padrão tem nome, ER, cor e exemplos', () => {
  for (const p of padroes) {
    assert.ok(p.nome && p.er && /^#[0-9a-f]{6}$/.test(p.cor) && p.exemplos.length && p.naoExemplos.length, p.nome);
  }
  assert.strictEqual(new Set(padroes.map((p) => p.nome)).size, padroes.length, 'nomes repetidos');
});
