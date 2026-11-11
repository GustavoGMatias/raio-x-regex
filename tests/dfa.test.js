const test = require('node:test');
const assert = require('node:assert');
const { afnParaAFD, executarAFD, motivo, grafoAFD, fechoConjunto, rotulo } = require('../src/dfa');

// AFN escrito à mão do docs/CONTRATOS.md: (a|b)*ab
const afnExemplo = () => ({
  n: 4, start: 0, accept: 3,
  trans: [
    { eps: [1], mov: [] },
    { eps: [], mov: [{ set: new Set(['a', 'b']), to: 1 }, { set: new Set(['a']), to: 2 }] },
    { eps: [], mov: [{ set: new Set(['b']), to: 3 }] },
    { eps: [], mov: [] },
  ],
  origem: [1, 1, 2, 3],
});

const transComoObjeto = (afd) => afd.trans.map((m) => Object.fromEntries(m));

test('fecho-ε: segue movimentos vazios em cadeia', () => {
  const afn = {
    n: 4, start: 0, accept: 3,
    trans: [{ eps: [1], mov: [] }, { eps: [2], mov: [] }, { eps: [], mov: [] }, { eps: [0], mov: [] }],
  };
  assert.deepEqual(fechoConjunto(afn, [0]), [0, 1, 2]);
  assert.deepEqual(fechoConjunto(afn, [3]), [0, 1, 2, 3]);
  assert.deepEqual(fechoConjunto(afn, [2]), [2]);
});

test('subconjuntos: AFN do contrato vira o AFD esperado', () => {
  const afd = afnParaAFD(afnExemplo());
  assert.equal(afd.n, 4);
  assert.equal(afd.start, 0);
  assert.deepEqual([...afd.aceita], [3]);
  assert.deepEqual(afd.simbolos, ['a', 'b']);
  assert.deepEqual(afd.subconjuntos, [[0, 1], [1, 2], [1], [1, 3]]);
  assert.deepEqual(transComoObjeto(afd), [
    { a: 1, b: 2 }, { a: 1, b: 3 }, { a: 1, b: 2 }, { a: 1, b: 2 },
  ]);
});

test('subconjuntos: transição para o vazio não é guardada (morto implícito)', () => {
  // AFN de "ab": depois de ler 'b' no início não há para onde ir.
  const afn = {
    n: 3, start: 0, accept: 2,
    trans: [{ eps: [], mov: [{ set: new Set(['a']), to: 1 }] },
      { eps: [], mov: [{ set: new Set(['b']), to: 2 }] }, { eps: [], mov: [] }],
  };
  const afd = afnParaAFD(afn);
  assert.equal(afd.n, 3);
  assert.equal(afd.trans[0].has('b'), false);
  assert.equal(afd.trans[2].size, 0);
});

test('executarAFD: aceita e rejeita os exemplos do contrato', () => {
  const afd = afnParaAFD(afnExemplo());
  for (const s of ['ab', 'aab', 'bbab']) assert.ok(executarAFD(afd, s).aceita, s);
  for (const s of ['a', 'ba', 'abb', '']) assert.ok(!executarAFD(afd, s).aceita, s);
});

test('executarAFD: caminho, morreuEm e esperado', () => {
  const afd = afnParaAFD(afnExemplo());
  const ok = executarAFD(afd, 'aab');
  assert.deepEqual(ok.caminho, [0, 1, 1, 3]);
  assert.equal(ok.morreuEm, -1);

  const morreu = executarAFD(afd, 'abx');
  assert.equal(morreu.aceita, false);
  assert.equal(morreu.morreuEm, 2);
  assert.deepEqual(morreu.caminho, [0, 1, 3]);
  assert.deepEqual(morreu.esperado.sort(), ['a', 'b']);
});

test('executarAFD: terminou num estado que não aceita, esperado diz o que faltava', () => {
  const afn = {
    n: 3, start: 0, accept: 2,
    trans: [{ eps: [], mov: [{ set: new Set(['a']), to: 1 }] },
      { eps: [], mov: [{ set: new Set(['0', '1', '2', '3']), to: 2 }] }, { eps: [], mov: [] }],
  };
  const r = executarAFD(afnParaAFD(afn), 'a');
  assert.equal(r.aceita, false);
  assert.equal(r.morreuEm, -1);
  assert.deepEqual(r.esperado, ['[0-3]']);
});

test('executarAFD: respeita aceitaMorto (complemento)', () => {
  const afd = { ...afnParaAFD(afnExemplo()), aceitaMorto: true };
  assert.equal(executarAFD(afd, 'abx').aceita, true);
});

test('motivo: frases para morreu, aceitou e parou antes', () => {
  const afd = afnParaAFD(afnExemplo());
  assert.match(motivo(afd, 'abx'), /posição 2.*'x'/);
  assert.match(motivo(afd, 'ab'), /aceitação/);
  assert.match(motivo(afd, 'a'), /não é de aceitação/);
});

test('rotulo: caractere único, poucos soltos e faixas', () => {
  assert.equal(rotulo(['a']), 'a');
  assert.equal(rotulo(['b', 'a']), 'a, b');
  assert.equal(rotulo('0123456789'), '[0-9]');
  assert.equal(rotulo('ABCDEFGHIJKLMNOPQRSTUVWXYZ'), '[A-Z]');
  assert.equal(rotulo([' ']), '␣');
});

test('grafoAFD: estados e arestas agrupadas por par', () => {
  const g = grafoAFD(afnParaAFD(afnExemplo()));
  assert.deepEqual(g.states[0], { id: 0, label: 'q0', start: true, accept: false });
  assert.equal(g.states[3].accept, true);
  assert.equal(g.edges.length, 8);
  assert.ok(g.edges.some((e) => e.from === 1 && e.to === 3 && e.label === 'b'));

  const junto = grafoAFD({ n: 2, start: 0, aceita: new Set([1]), trans: [new Map([['a', 1], ['b', 1]]), new Map()] });
  assert.deepEqual(junto.edges, [{ from: 0, to: 1, label: 'a, b' }]);
});

// ---------- Minimização ----------
const { minimizar } = require('../src/dfa');

test('minimizar: exemplo do contrato vira 3 estados, juntando q0 e q2', () => {
  const min = minimizar(afnParaAFD(afnExemplo()));
  assert.equal(min.n, 3);
  assert.equal(min.start, 0);
  assert.deepEqual([...min.aceita], [2]);
  assert.deepEqual(transComoObjeto(min), [{ a: 1, b: 0 }, { a: 1, b: 2 }, { a: 1, b: 0 }]);
  assert.deepEqual(min.classes, [[0, 2], [1], [3]]);
});

test('minimizar: remove inalcançáveis e estados que não chegam em aceitação', () => {
  // q0 -a-> q1 (aceita); q0 -b-> q2 (beco sem saída); q3 inalcançável.
  const afd = {
    n: 4, start: 0, aceita: new Set([1, 3]),
    trans: [new Map([['a', 1], ['b', 2]]), new Map(), new Map([['c', 2]]), new Map([['a', 0]])],
  };
  const min = minimizar(afd);
  assert.equal(min.n, 2);
  assert.deepEqual(transComoObjeto(min), [{ a: 1 }, {}]);
  assert.deepEqual(min.classes, [[0], [1]]);
  assert.deepEqual(min.simbolos, ['a']);
});

test('minimizar: linguagem vazia vira um único estado sem aceitação', () => {
  const afd = { n: 2, start: 0, aceita: new Set(), trans: [new Map([['a', 1]]), new Map()] };
  const min = minimizar(afd);
  assert.equal(min.n, 1);
  assert.equal(min.aceita.size, 0);
  assert.equal(min.trans[0].size, 0);
});

test('minimizar: com aceitaMorto, o morto continua aceitando', () => {
  // Complemento de "a": aceita tudo menos "a".
  const comp = { n: 2, start: 0, aceita: new Set([0]), trans: [new Map([['a', 1]]), new Map()], aceitaMorto: true };
  const min = minimizar(comp);
  assert.equal(min.aceitaMorto, true);
  for (const [s, esp] of [['', true], ['a', false], ['aa', true], ['b', true]]) {
    assert.equal(executarAFD(min, s).aceita, esp, JSON.stringify(s));
  }
});

test('minimizar: já mínimo não muda de tamanho e é idempotente', () => {
  const min = minimizar(afnParaAFD(afnExemplo()));
  const outra = minimizar(min);
  assert.equal(outra.n, min.n);
  assert.deepEqual(transComoObjeto(outra), transComoObjeto(min));
});

// Com o parser e o AFN do Gustavo (já na main), o fluxo completo.
const { parse } = require('../src/parser');
const { construirAFN } = require('../src/nfa');
const minDe = (er) => minimizar(afnParaAFD(construirAFN(parse(er))));

test('fluxo completo: tamanhos conhecidos do AFD mínimo', () => {
  assert.equal(minDe('a(b|c)*').n, 2);
  assert.equal(minDe('(a|b)*ab').n, 3);
  assert.equal(minDe('a*').n, 1);
  assert.equal(minDe('[0-9]{2}').n, 3);
  assert.equal(minDe('[A-Z]{3}[0-9][A-Z][0-9]{2}').n, 8);
});

test('fluxo completo: placa (Mercosul e antiga)', () => {
  const min = minDe('[A-Z]{3}([0-9][A-Z][0-9]{2}|-?[0-9]{4})');
  for (const s of ['ABC1D23', 'ABC-1234', 'ABC1234']) assert.ok(executarAFD(min, s).aceita, s);
  for (const s of ['ABC1D234', 'AB1D23', 'abc1d23', 'ABC-1D23']) assert.ok(!executarAFD(min, s).aceita, s);
});

test('afnParaAFD: o limite de estados interrompe com ErroLimite', () => {
  const { parse } = require('../src/parser');
  const { construirAFN } = require('../src/nfa');
  const { afnParaAFD, ErroLimite } = require('../src/dfa');
  const afn = construirAFN(parse('(a|b)*a(a|b){10}'));
  assert.throws(() => afnParaAFD(afn, { limite: 100 }), (e) => e instanceof ErroLimite && e.limite === 100);
  assert.ok(afnParaAFD(afn).n > 2000);            // sem limite continua funcionando
});
