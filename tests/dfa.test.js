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
