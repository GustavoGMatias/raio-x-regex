// Testa a parte "sem tela" do Chat e do Formulário, com o motor real da main.
const test = require('node:test');
const assert = require('node:assert');
const { parse } = require('../src/parser');
const { construirAFN } = require('../src/nfa');
const { afnParaAFD, minimizar, executarAFD } = require('../src/dfa');
const { padroes } = require('../src/patterns');
const { varrer } = require('../src/scanner');
const { pedacos, caminho, MENSAGENS_EXEMPLO } = require('../src/chat');
const { estadoCampo, CAMPOS } = require('../src/form');

const compilar = (er) => minimizar(afnParaAFD(construirAFN(parse(er))));
const comAFD = padroes.map((p) => ({ ...p, afd: compilar(p.er) }));
const porNome = (nome) => comAFD.find((p) => p.nome === nome);

// ---------- Chat ----------

test('pedacos: alterna texto comum e destaques, sem perder nada', () => {
  const texto = 'placa ABC1D23!';
  const ps = pedacos(texto, varrer(texto, comAFD));
  assert.deepStrictEqual(ps.map((p) => [p.texto, p.destaque && p.destaque.padrao.nome]), [
    ['placa ', null], ['ABC1D23', 'placa'], ['!', null],
  ]);
  assert.strictEqual(ps.map((p) => p.texto).join(''), texto);
});

test('pedacos: texto sem destaque vira um pedaço só; texto vazio, nenhum', () => {
  assert.deepStrictEqual(pedacos('oi', []), [{ texto: 'oi', destaque: null }]);
  assert.deepStrictEqual(pedacos('', []), []);
});

test('caminho: estados percorridos pelo AFD ao ler o trecho', () => {
  const c = caminho(porNome('placa').afd, 'ABC1D23');
  assert.strictEqual(c.length, 8); // q0 + um estado por caractere
  assert.ok(porNome('placa').afd.aceita.has(c[c.length - 1]));
});

test('mensagens de exemplo: cada uma reconstrói o texto e mostra o esperado', () => {
  const achados = [];
  for (const m of MENSAGENS_EXEMPLO) {
    const ds = varrer(m.texto, comAFD);
    assert.strictEqual(pedacos(m.texto, ds).map((p) => p.texto).join(''), m.texto);
    for (const d of ds) achados.push(d.padrao.nome);
  }
  for (const nome of ['placa', 'telefone', 'CPF', 'CEP', 'e-mail', 'valor', 'data', 'link', 'hashtag']) {
    assert.ok(achados.includes(nome), `nenhuma mensagem de exemplo mostra ${nome}`);
  }
});

// ---------- Formulário ----------

const classificar = (nome, texto) => estadoCampo(texto, executarAFD(porNome(nome).afd, texto)).estado;

test('formulário: vazio, válido, incompleto e inválido', () => {
  assert.strictEqual(classificar('placa', ''), 'vazio');
  assert.strictEqual(classificar('placa', 'ABC1D23'), 'valido');
  assert.strictEqual(classificar('placa', 'ABC1'), 'incompleto');
  assert.strictEqual(classificar('placa', 'AB1'), 'invalido');
  assert.strictEqual(classificar('placa', 'ABC1D234'), 'invalido'); // passou do tamanho
  assert.strictEqual(classificar('CPF', '123.456'), 'incompleto');
  assert.strictEqual(classificar('CPF', '123.456.789-09'), 'valido');
  assert.strictEqual(classificar('CEP', '01310100'), 'valido'); // sem hífen também vale
  assert.strictEqual(classificar('e-mail', 'luciana@ufx'), 'incompleto');
  assert.strictEqual(classificar('data', '32'), 'invalido');
});

test('formulário: a mensagem diz onde morreu e o que era esperado', () => {
  const { mensagem } = estadoCampo('AB1', executarAFD(porNome('placa').afd, 'AB1'));
  assert.match(mensagem, /"1" na posição 3/);
  assert.match(mensagem, /A-Z/);
});

test('formulário: a mensagem do incompleto diz como continuar', () => {
  const { mensagem } = estadoCampo('ABC', executarAFD(porNome('placa').afd, 'ABC'));
  assert.match(mensagem, /falta continuar com .*0-9/);
});

test('formulário: todo campo aponta para um padrão que existe', () => {
  for (const c of CAMPOS) assert.ok(porNome(c.padrao), c.padrao);
});

// ---------- Raio-x ----------
const { rotuloAmigavel, passosLeitura } = require('../src/raiox');

test('rotuloAmigavel: troca as classes comuns por palavras e mantém o resto', () => {
  assert.strictEqual(rotuloAmigavel('[A-Z]'), 'letra');
  assert.strictEqual(rotuloAmigavel('[0-9]'), 'dígito');
  assert.strictEqual(rotuloAmigavel('[1-9]'), '1 a 9');
  assert.strictEqual(rotuloAmigavel('@'), '@');
});

test('passosLeitura: cadeia aceita vira início, um movimento por caractere e fim', () => {
  const r = executarAFD(porNome('placa').afd, 'ABC1D23');
  const ps = passosLeitura(r);
  assert.strictEqual(ps.length, 1 + 7 + 1);
  assert.deepStrictEqual(ps.map((p) => p.tipo), ['inicio', ...Array(7).fill('move'), 'fim']);
  assert.strictEqual(ps[ps.length - 1].aceita, true);
  assert.strictEqual(ps[1].de, r.caminho[0]);
  assert.strictEqual(ps[1].para, r.caminho[1]);
});

test('passosLeitura: cadeia que morre termina em "morreu" no estado certo', () => {
  const r = executarAFD(porNome('placa').afd, 'AB1');
  const ps = passosLeitura(r);
  assert.deepStrictEqual(ps.map((p) => p.tipo), ['inicio', 'move', 'move', 'morreu']);
  assert.strictEqual(ps[3].estado, r.caminho[2]);
});
