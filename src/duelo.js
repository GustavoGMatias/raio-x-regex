// Aba Duelo: backtracking contra AFN na mesma ER e na mesma cadeia.
//
//   montarDuelo(container, deps)   chamada por app.js quando a aba abre
//   duelar(er, cadeia, limite)     parte pura (testada no Node)
//   escada(er, montarCadeia, ns, limite)   mesma ER com cadeias cada vez maiores
//
// Medidas (não são segundos, são contagens, para dar o mesmo resultado em qualquer máquina):
//   backtracking: quantas vezes o matcher visitou um nó da árvore (casarBacktracking.passos)
//   AFN: soma dos tamanhos dos conjuntos de estados ativos ao longo da leitura.
//        É o trabalho da simulação, que cresce linearmente com a cadeia.

(function () {
  const ehNode = typeof module !== 'undefined' && module.exports;
  const R = ehNode
    ? Object.assign({}, require('./parser'), require('./nfa'), require('./backtrack'))
    : window.Raio;

  const LIMITE_PADRAO = 100000;
  const LIMITE_MAXIMO = 20000000;

  // ---------- Parte pura ----------

  // Roda os dois motores. Lança ErroER se a ER for inválida.
  function duelar(er, cadeia, limite = LIMITE_PADRAO) {
    const ast = R.parse(er);
    const bt = R.casarBacktracking(ast, cadeia, limite);
    const afn = R.construirAFN(ast);
    const traco = R.tracoAFN(afn, cadeia);
    const trabalho = traco.inicial.length + traco.passos.reduce((s, p) => s + p.depois.length, 0);
    return {
      backtracking: { aceita: bt.aceita, passos: bt.passos, estourou: bt.estourou },
      afn: { aceita: traco.aceita, trabalho, estados: afn.n },
      limite,
    };
  }

  // Mesma ER com cadeias de tamanhos diferentes. montarCadeia(n) devolve a cadeia de tamanho n.
  function escada(er, montarCadeia, ns, limite = LIMITE_PADRAO) {
    return ns.map((n) => ({ n, ...duelar(er, montarCadeia(n), limite) }));
  }

  const EXEMPLOS = [
    { er: '(a+)+b', rotulo: '(a+)+b', montar: (n) => 'a'.repeat(n) + 'c', nota: 'O caso clássico: cada "a" pode ser agrupado de muitas formas, e a falha no "c" obriga a tentar todas.' },
    { er: '(a|aa)+b', rotulo: '(a|aa)+b', montar: (n) => 'a'.repeat(n) + 'c', nota: 'Dois jeitos de consumir "a": o número de caminhos cresce como Fibonacci.' },
    { er: '(a*)*b', rotulo: '(a*)*b', montar: (n) => 'a'.repeat(n) + 'c', nota: 'Estrela dentro de estrela, outra receita de explosão.' },
    { er: 'a*b', rotulo: 'a*b (controle)', montar: (n) => 'a'.repeat(n) + 'c', nota: 'Sem ambiguidade: o backtracking também é linear. O problema não é backtracking, é a ER ambígua.' },
  ];

  // ---------- Interface ----------

  const NS_ESCADA = [4, 8, 12, 16, 20, 24];

  const CSS = `
.duelo { max-width: 980px; margin: 0 auto; padding: 20px; display: grid; gap: 16px; }
.duelo h2 { margin: 0 0 4px; font-size: 20px; }
.duelo .mudo { color: var(--mudo, #667089); margin: 0; }
.duelo .cartao { background: var(--superficie, #fff); border: 1px solid var(--borda, #dde1ea); border-radius: var(--raio, 10px); padding: 16px; }
.duelo .linha { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; }
.duelo label { display: grid; gap: 4px; font-size: 13px; color: var(--mudo, #667089); }
.duelo input { font: 15px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; padding: 8px 10px; border: 1px solid var(--borda, #dde1ea); border-radius: 8px; background: var(--fundo, #f5f6f9); color: var(--texto, #1b2130); }
.duelo input.er { min-width: 220px; flex: 1; }
.duelo input.cadeia { min-width: 260px; flex: 2; }
.duelo input.limite { width: 130px; }
.duelo button { font: inherit; padding: 8px 14px; border-radius: 8px; border: 1px solid var(--borda, #dde1ea); background: var(--superficie, #fff); color: var(--texto, #1b2130); cursor: pointer; }
.duelo button.principal { background: var(--primaria, #0f9b8e); color: var(--primaria-texto, #fff); border-color: transparent; font-weight: 600; }
.duelo button:hover { filter: brightness(0.96); }
.duelo .exemplos { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 12px; }
.duelo .exemplos span { font-size: 13px; color: var(--mudo, #667089); }
.duelo .erro { color: var(--erro, #d13438); font-family: ui-monospace, Menlo, monospace; white-space: pre-wrap; margin: 8px 0 0; }
.duelo .placar { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.duelo .motor h3 { margin: 0 0 8px; font-size: 15px; }
.duelo .veredito { font-weight: 700; }
.duelo .veredito.ok { color: var(--primaria, #0f9b8e); }
.duelo .veredito.nao { color: var(--mudo, #667089); }
.duelo .veredito.estouro { color: var(--erro, #d13438); }
.duelo .numero { font: 700 28px ui-monospace, Menlo, monospace; margin: 6px 0 0; }
.duelo .barra { height: 10px; border-radius: 5px; background: var(--borda, #dde1ea); overflow: hidden; margin-top: 8px; }
.duelo .barra > i { display: block; height: 100%; background: var(--primaria, #0f9b8e); }
.duelo .barra > i.estouro { background: var(--erro, #d13438); }
.duelo table { width: 100%; border-collapse: collapse; font-size: 14px; }
.duelo th, .duelo td { text-align: right; padding: 6px 8px; border-bottom: 1px solid var(--borda, #dde1ea); }
.duelo th:first-child, .duelo td:first-child { text-align: left; }
.duelo td.estouro { color: var(--erro, #d13438); font-weight: 700; }
.duelo .explica { line-height: 1.55; }
`;

  function fmt(n) { return n.toLocaleString('pt-BR'); }

  function el(tag, props, ...filhos) {
    const e = document.createElement(tag);
    if (props) for (const k of Object.keys(props)) {
      if (k === 'class') e.className = props[k];
      else if (k === 'text') e.textContent = props[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), props[k]);
      else e.setAttribute(k, props[k]);
    }
    for (const f of filhos) if (f != null) e.append(f);
    return e;
  }

  // Escala logarítmica: 1 passo é quase nada, `max` enche a barra.
  function larguraLog(v, max) {
    if (v <= 1) return 2;
    return Math.max(2, Math.round((Math.log(v) / Math.log(Math.max(max, 2))) * 100));
  }

  function montarDuelo(container /* , deps */) {
    if (!document.getElementById('duelo-css')) {
      const st = el('style', { id: 'duelo-css' });
      st.textContent = CSS;
      document.head.append(st);
    }
    container.textContent = '';

    const inEr = el('input', { class: 'er', type: 'text', value: EXEMPLOS[0].er, spellcheck: 'false', 'aria-label': 'Expressão regular' });
    const inCadeia = el('input', { class: 'cadeia', type: 'text', value: EXEMPLOS[0].montar(22), spellcheck: 'false', 'aria-label': 'Cadeia' });
    const inLimite = el('input', { class: 'limite', type: 'number', min: '1', max: String(LIMITE_MAXIMO), value: String(LIMITE_PADRAO), 'aria-label': 'Limite de passos' });
    const msgErro = el('pre', { class: 'erro', hidden: '' });
    const nota = el('p', { class: 'mudo', text: EXEMPLOS[0].nota });
    const placar = el('div', { class: 'placar' });
    const escadaBox = el('div', { class: 'cartao', hidden: '' });

    function lerLimite() {
      const v = parseInt(inLimite.value, 10);
      return Number.isFinite(v) && v > 0 ? Math.min(v, LIMITE_MAXIMO) : LIMITE_PADRAO;
    }

    function mostrarErro(e) {
      const ehER = e && e.name === 'ErroER';
      msgErro.hidden = false;
      msgErro.textContent = ehER
        ? `${e.message}\n${inEr.value}\n${' '.repeat(e.pos)}^`
        : 'Erro inesperado: ' + (e && e.message || e);
    }

    function cartaoMotor(titulo, veredito, classe, grande, legenda, valor, max, estourou) {
      return el('div', { class: 'cartao motor' },
        el('h3', { text: titulo }),
        el('div', { class: 'veredito ' + classe, text: veredito }),
        el('div', { class: 'numero', text: grande }),
        el('p', { class: 'mudo', text: legenda }),
        el('div', { class: 'barra', title: 'escala logarítmica' }, el('i', { class: estourou ? 'estouro' : '', style: `width:${larguraLog(valor, max)}%` })));
    }

    function duelo() {
      msgErro.hidden = true;
      let r;
      try { r = duelar(inEr.value, inCadeia.value, lerLimite()); }
      catch (e) { mostrarErro(e); placar.textContent = ''; return; }
      const { backtracking: b, afn: a, limite } = r;
      const max = Math.max(b.passos, a.trabalho);
      const vb = b.estourou ? ['Desistiu: estourou o limite', 'estouro'] : b.aceita ? ['Aceita', 'ok'] : ['Rejeita', 'nao'];
      const va = a.aceita ? ['Aceita', 'ok'] : ['Rejeita', 'nao'];
      placar.textContent = '';
      placar.append(
        cartaoMotor('Backtracking', vb[0], vb[1], fmt(b.passos), b.estourou ? `passos (limite: ${fmt(limite)})` : 'passos', b.passos, max, b.estourou),
        cartaoMotor('AFN (simulação)', va[0], va[1], fmt(a.trabalho), `estados processados (o AFN tem ${a.estados} estados)`, a.trabalho, max, false));
      if (!b.estourou && b.aceita !== a.aceita) {
        placar.append(el('p', { class: 'erro', text: 'Os dois motores discordaram. Isso não deveria acontecer: avise a Parte 1.' }));
      }
    }

    function rodarEscada(ex) {
      const limite = lerLimite();
      const linhas = escada(ex.er, ex.montar, NS_ESCADA, limite);
      const max = Math.max(...linhas.map((l) => Math.max(l.backtracking.passos, l.afn.trabalho)));
      escadaBox.hidden = false;
      escadaBox.textContent = '';
      const tbl = el('table', null,
        el('thead', null, el('tr', null, el('th', { text: 'n (letras "a")' }), el('th', { text: 'Backtracking (passos)' }), el('th', { text: 'AFN (estados processados)' }))),
        el('tbody', null, ...linhas.map((l) => el('tr', null,
          el('td', { text: String(l.n) }),
          el('td', { class: l.backtracking.estourou ? 'estouro' : '', text: l.backtracking.estourou ? `> ${fmt(l.limite)} (estourou)` : fmt(l.backtracking.passos) }),
          el('td', { text: fmt(l.afn.trabalho) })))));
      escadaBox.append(
        el('h3', { text: `Escada: ${ex.rotulo} contra "a" × n + "c"` }),
        el('p', { class: 'mudo', text: 'Compare as duas colunas conforme n cresce: uma explode, a outra anda em linha reta.' }),
        tbl);
    }

    function usarExemplo(ex) {
      inEr.value = ex.er;
      inCadeia.value = ex.montar(22);
      nota.textContent = ex.nota;
      duelo();
      rodarEscada(ex);
    }

    const btnDuelar = el('button', { class: 'principal', type: 'button', text: 'Duelar', onclick: () => { escadaBox.hidden = true; duelo(); } });
    for (const i of [inEr, inCadeia, inLimite]) i.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnDuelar.click(); });

    container.append(el('div', { class: 'duelo' },
      el('div', null,
        el('h2', { text: 'Duelo: backtracking contra AFN' }),
        el('p', { class: 'mudo', text: 'A mesma expressão e a mesma cadeia nos dois motores. Os dois dão a mesma resposta; o que muda é o custo.' })),
      el('div', { class: 'cartao' },
        el('div', { class: 'linha' },
          el('label', null, 'Expressão regular', inEr),
          el('label', null, 'Cadeia', inCadeia),
          el('label', null, 'Limite de passos', inLimite),
          btnDuelar),
        el('div', { class: 'exemplos' }, el('span', { text: 'Exemplos (rodam também a escada):' }),
          ...EXEMPLOS.map((ex) => el('button', { type: 'button', text: ex.rotulo, onclick: () => usarExemplo(ex) }))),
        nota, msgErro),
      placar,
      escadaBox,
      el('div', { class: 'cartao explica' },
        el('h3', { text: 'Por que a diferença?' }),
        el('p', { text: 'O backtracking tenta um caminho, e quando falha volta e tenta o próximo. Numa ER ambígua como (a+)+b, uma sequência de "a"s pode ser repartida entre o + de dentro e o de fora de 2^(n-1) maneiras, e como a cadeia termina em "c", todas falham, uma por uma.' }),
        el('p', { text: 'O AFN não escolhe: mantém todos os caminhos ao mesmo tempo como um conjunto de estados ativos, e esse conjunto nunca passa do número de estados do AFN. Por isso o trabalho dele cresce em linha reta com o tamanho da cadeia.' }))));

    usarExemplo(EXEMPLOS[0]);
  }

  const api = { montarDuelo, duelar, escada, EXEMPLOS, LIMITE_PADRAO };
  if (ehNode) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
