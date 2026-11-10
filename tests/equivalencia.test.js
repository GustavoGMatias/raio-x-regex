// AFN, AFD dos subconjuntos e AFD mínimo têm que reconhecer a MESMA linguagem.
// Aqui sorteamos muitas cadeias e conferimos que os três concordam em todas.
const test = require('node:test');
const assert = require('node:assert');
const { afnParaAFD, minimizar, executarAFD, conferirEquivalencia, aceitaAFN } = require('../src/dfa');
const { gerarExemplos } = require('../src/exemplos');
const { parse } = require('../src/parser');
const { construirAFN, tracoAFN } = require('../src/nfa');

const ERS = [
  '(a|b)*ab',
  'a(b|c)*',
  'a*b*',
  '(ab|ba)*',
  '(a|b)*a(a|b)(a|b)',      // o AFD cresce bastante em relação ao AFN
  'a?b+c{2,3}',
  '((a|b)(a|b))*',
  '',
  '[0-9]{3}\\.[0-9]{3}',
  '[A-Z]{3}([0-9][A-Z][0-9]{2}|-?[0-9]{4})',
];

function compilar(er) {
  const afn = construirAFN(parse(er));
  const afd = afnParaAFD(afn);
  return { afn, afd, min: minimizar(afd) };
}

for (const er of ERS) {
  test(`AFN, AFD e mínimo concordam em cadeias aleatórias: ${er || '(vazia)'}`, () => {
    const { afn, afd, min } = compilar(er);
    const r = conferirEquivalencia(afn, afd, min, { quantidade: 400, tamanhoMax: 10 });
    assert.deepEqual(r.divergencias, []);
    assert.ok(min.n <= afd.n, 'o mínimo nunca tem mais estados');
  });

  test(`as cadeias geradas são classificadas igual pelos três: ${er || '(vazia)'}`, () => {
    const { afn, afd, min } = compilar(er);
    const { aceitas, rejeitadas } = gerarExemplos(min, 6);
    for (const s of aceitas) {
      assert.ok(aceitaAFN(afn, s) && executarAFD(afd, s).aceita && executarAFD(min, s).aceita, s);
    }
    for (const s of rejeitadas) {
      assert.ok(!aceitaAFN(afn, s) && !executarAFD(afd, s).aceita && !executarAFD(min, s).aceita, s);
    }
  });
}

test('minha simulação do AFN bate com o tracoAFN do Gustavo', () => {
  const { afn } = compilar('(a|b)*a(a|b)');
  for (const s of ['', 'a', 'aa', 'ab', 'bab', 'abba', 'bbbbab', 'x']) {
    assert.equal(aceitaAFN(afn, s), tracoAFN(afn, s).aceita, s);
  }
});

test('conferirEquivalencia acusa quando um AFD está errado', () => {
  const { afn, afd } = compilar('(a|b)*ab');
  const errado = minimizar(compilar('(a|b)*').afd);
  const r = conferirEquivalencia(afn, afd, errado, { quantidade: 100 });
  assert.equal(r.ok, false);
  assert.ok(r.divergencias.length > 0);
});
