const test = require('node:test');
const assert = require('node:assert');
const { maisLongo } = require('../src/scanner');

// Monta à mão um AFD "em linha" a partir de uma lista de classes de caracteres.
// Ex.: linear(['0123456789', '0123456789']) é o AFD de [0-9]{2}:
//   q0 --dígito--> q1 --dígito--> q2 (aceita)
function linear(classes) {
  const trans = classes.map((chars, i) => new Map([...chars].map((c) => [c, i + 1])));
  trans.push(new Map()); // último estado: sem saída
  const n = classes.length + 1;
  return { n, start: 0, aceita: new Set([n - 1]), trans, simbolos: [...new Set(classes.join(''))] };
}

const DIG = '0123456789';

// AFD do contrato para (a|b)*ab: termina em "ab".
const terminaEmAB = () => ({
  n: 3, start: 0, aceita: new Set([2]),
  trans: [new Map([['a', 1], ['b', 0]]), new Map([['a', 1], ['b', 2]]), new Map([['a', 1], ['b', 0]])],
  simbolos: ['a', 'b'],
});

test('maisLongo: acha o padrão no começo do texto', () => {
  assert.strictEqual(maisLongo(linear([DIG, DIG]), '42 reais', 0), 2);
});

test('maisLongo: começa na posição pedida', () => {
  assert.strictEqual(maisLongo(linear([DIG, DIG]), 'tenho 42', 6), 2);
});

test('maisLongo: devolve 0 quando nada é aceito', () => {
  assert.strictEqual(maisLongo(linear([DIG, DIG]), 'abc', 0), 0);
  assert.strictEqual(maisLongo(linear([DIG, DIG]), '4', 0), 0); // incompleto
});

test('maisLongo: não passa do tamanho do padrão', () => {
  assert.strictEqual(maisLongo(linear([DIG, DIG]), '123', 0), 2);
});

test('maisLongo: fica com o MAIOR prefixo aceito, não o primeiro', () => {
  // "abab": aceita em 2 ("ab") e em 4 ("abab"); o maior é 4.
  assert.strictEqual(maisLongo(terminaEmAB(), 'ababa', 0), 4);
});

test('maisLongo: caractere fora do alfabeto mata a cadeia', () => {
  assert.strictEqual(maisLongo(terminaEmAB(), 'abxab', 0), 2);
});

test('maisLongo: respeita aceitaMorto (complemento)', () => {
  // Complemento de [0-9]{2}: ao morrer, tudo dali pra frente é aceito.
  const comp = { ...linear([DIG, DIG]), aceitaMorto: true };
  assert.strictEqual(maisLongo(comp, 'ab', 0), 2);
});

// ---------- varrer ----------
const { varrer } = require('../src/scanner');

const MAI = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const placa = { nome: 'placa', afd: linear([MAI, MAI, MAI, DIG, MAI, DIG, DIG]) };
const doisDig = { nome: 'dois dígitos', afd: linear([DIG, DIG]) };
const tresDig = { nome: 'três dígitos', afd: linear([DIG, DIG, DIG]) };
const outroDoisDig = { nome: 'outro dois dígitos', afd: linear([DIG, DIG]) };

// Resumo legível do resultado: [ ['placa', 'ABC1D23'], ... ]
const resumo = (texto, ds) => ds.map((d) => [d.padrao.nome, texto.slice(d.inicio, d.fim)]);

test('varrer: acha a placa no meio da frase (exemplo do TAREFAS.md)', () => {
  const texto = 'a placa é ABC1D23';
  const ds = varrer(texto, [placa]);
  assert.deepStrictEqual(ds.map((d) => [d.inicio, d.fim]), [[10, 17]]);
  assert.deepStrictEqual(resumo(texto, ds), [['placa', 'ABC1D23']]);
});

test('varrer: borda de palavra, ABC1D234 não é placa', () => {
  assert.deepStrictEqual(varrer('ABC1D234', [placa]), []);
  assert.deepStrictEqual(varrer('XABC1D23', [placa]), []);
});

test('varrer: pontuação conta como borda', () => {
  const texto = 'placa:ABC1D23.';
  assert.deepStrictEqual(resumo(texto, varrer(texto, [placa])), [['placa', 'ABC1D23']]);
});

test('varrer: borda só proíbe quando os dois lados são de palavra', () => {
  const ddd = { nome: 'ddd', afd: linear(['(', DIG, DIG, ')']) };
  const texto = 'ligue(11)já';
  assert.deepStrictEqual(resumo(texto, varrer(texto, [ddd])), [['ddd', '(11)']]);
});

test('varrer: se o maior casamento está colado, tenta um menor', () => {
  // AFD de [0-9]{2}(-[0-9]{2})?: aceita "12" e "12-34"
  const afd = {
    n: 6, start: 0, aceita: new Set([2, 5]),
    trans: [
      new Map([...DIG].map((c) => [c, 1])), new Map([...DIG].map((c) => [c, 2])),
      new Map([['-', 3]]), new Map([...DIG].map((c) => [c, 4])), new Map([...DIG].map((c) => [c, 5])), new Map(),
    ],
  };
  const texto = '12-34a';
  assert.deepStrictEqual(resumo(texto, varrer(texto, [{ nome: 'x', afd }])), [['x', '12']]);
});

test('varrer: o mais longo ganha, não importa a ordem', () => {
  const texto = 'nota 123';
  assert.deepStrictEqual(resumo(texto, varrer(texto, [doisDig, tresDig])), [['três dígitos', '123']]);
});

test('varrer: empate de tamanho, ganha o primeiro da lista', () => {
  const texto = 'nota 12';
  assert.deepStrictEqual(resumo(texto, varrer(texto, [doisDig, outroDoisDig])), [['dois dígitos', '12']]);
  assert.deepStrictEqual(resumo(texto, varrer(texto, [outroDoisDig, doisDig])), [['outro dois dígitos', '12']]);
});

test('varrer: vários destaques, sem sobreposição', () => {
  const texto = 'ABC1D23 e 45, depois XYZ9K88';
  assert.deepStrictEqual(resumo(texto, varrer(texto, [placa, doisDig])), [
    ['placa', 'ABC1D23'], ['dois dígitos', '45'], ['placa', 'XYZ9K88'],
  ]);
});

test('varrer: texto sem nada devolve lista vazia', () => {
  assert.deepStrictEqual(varrer('oi, tudo bem?', [placa, doisDig]), []);
  assert.deepStrictEqual(varrer('', [placa]), []);
});

test('varrer: padrão com maiusculas aceita o texto em minúscula', () => {
  const placaMai = { ...placa, maiusculas: true };
  const texto = 'o carro abc1d23 e o ABC1D23';
  assert.deepStrictEqual(resumo(texto, varrer(texto, [placaMai])), [['placa', 'abc1d23'], ['placa', 'ABC1D23']]);
  assert.deepStrictEqual(varrer('abc1d23', [placa]), []); // sem a marca, minúscula não entra
});
