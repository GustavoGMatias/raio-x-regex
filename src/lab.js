// Aba Laboratório: o usuário digita uma ER e vê tudo o que o motor faz com ela.
//
//   montarLab(container, deps)
//
// Mostra, na ordem do pipeline:
//   1. a árvore sintática, com uma frase explicando cada nó (clicar acende o
//      pedaço do AFN que aquele nó criou);
//   2. a construção de Thompson passo a passo;
//   3. o AFN, o AFD e o AFD mínimo sincronizados (painel);
//   4. o teste de cadeias, com o motivo de aceitar ou rejeitar;
//   5. as tabelas da conversão AFN → AFD → mínimo.
//
// Tudo vem por `deps` (ou de window.Raio): compilar, explicar, passosThompson,
// montarArvore, montarPainel, montarTabela, gerarExemplos, motivo, executarAFD.
//
// A parte pura (sem DOM) fica no topo e é testada no Node.

(function () {
  const emNode = typeof module !== 'undefined' && module.exports;

  // ---------- Parte pura ----------

  const EXEMPLOS = [
    { er: 'a(b|c)*', nota: 'O exemplo de sala: um a seguido de qualquer mistura de b e c.', cadeia: 'abbc' },
    { er: '(a|b)*ab', nota: 'Termina em ab. O AFN de Thompson tem 12 estados, o AFD 4 e o mínimo 3: dá para ver a minimização juntar estados.', cadeia: 'bbab' },
    { er: '[A-Z]{3}[0-9][A-Z][0-9]{2}', nota: 'A placa Mercosul, a mesma que o Chat reconhece.', cadeia: 'ABC1D23' },
    { er: 'ab|cd', nota: 'União de duas palavras: linguagem finita.', cadeia: 'cd' },
    { er: '[0-9]+(,[0-9]+)?', nota: 'Número com vírgula decimal opcional.', cadeia: '3,14' },
  ];

  // Pedaço da ER que o nó representa, ou null.
  function trechoDoNo(er, no) {
    if (!no || !no.trecho) return null;
    return Array.from(er).slice(no.trecho[0], no.trecho[1]).join('');
  }

  // Uma linha por nó da árvore, na ordem dos ids: { id, tipo, trecho, texto }.
  // `explicacoes` é a saída de explicar(ast).
  function linhasDeExplicacao(er, ast, explicacoes) {
    const porId = new Map(explicacoes.map((e) => [e.noId, e.texto]));
    const linhas = [];
    (function ir(no) {
      linhas.push({ id: no.id, tipo: no.t, trecho: trechoDoNo(er, no), texto: porId.get(no.id) || '' });
      if (no.a) ir(no.a);
      if (no.b) ir(no.b);
    })(ast);
    return linhas;
  }

  // Frase com a contagem de estados dos três autômatos.
  function resumoContagem({ afn, afd, min }) {
    return `AFN: ${afn.n} estados · AFD: ${afd.n} · AFD mínimo: ${min.n}`;
  }

  // Mensagem de erro de ER com um ^ apontando a posição.
  function formatarErro(er, e) {
    if (e && e.name === 'ErroER') return `${e.message}\n${er}\n${' '.repeat(e.pos)}^`;
    if (e && e.name === 'ErroLimite') return 'Expressão pesada demais: ' + e.message;
    return 'Erro inesperado: ' + (e && e.message || e);
  }

  if (emNode) {
    module.exports = { EXEMPLOS, trechoDoNo, linhasDeExplicacao, resumoContagem, formatarErro };
    return;
  }

  // ---------- Interface ----------

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

  const rotuloCadeia = (s) => (s === '' ? 'ε (vazia)' : s);

  function montarLab(container, deps = {}) {
    const R = window.Raio || {};
    const D = (nome) => deps[nome] || R[nome];
    const faltando = ['compilar', 'explicar', 'passosThompson', 'montarArvore', 'montarPainel', 'tracoAFN', 'executarAFD']
      .filter((n) => typeof D(n) !== 'function');
    container.textContent = '';
    if (faltando.length) {
      container.append(el('div', { class: 'vazio erro' }, el('h2', { text: 'Laboratório' }),
        el('p', { text: 'Faltam módulos para montar a aba: ' + faltando.join(', ') + '.' })));
      return;
    }

    // ---- esqueleto ----
    const inEr = el('input', { class: 'mono lab-er', type: 'text', spellcheck: 'false', 'aria-label': 'Expressão regular', value: EXEMPLOS[0].er });
    const btnAnalisar = el('button', { class: 'lab-principal', type: 'button', text: 'Analisar' });
    const msgErro = el('pre', { class: 'lab-erro', hidden: '' });
    const nota = el('p', { class: 'mudo', text: EXEMPLOS[0].nota });
    const contagem = el('p', { class: 'lab-contagem' });

    const boxArvore = el('div', { class: 'lab-arvore' });
    const boxFrase = el('p', { class: 'lab-frase', 'aria-live': 'polite' });
    const boxLista = el('ol', { class: 'lab-lista' });

    const boxPasso = el('p', { class: 'lab-passo', 'aria-live': 'polite' });
    const btnIni = el('button', { type: 'button', title: 'Mostrar o AFN completo', text: '⏮ Tudo' });
    const btnAnt = el('button', { type: 'button', text: '◀ Anterior' });
    const btnProx = el('button', { type: 'button', text: 'Próximo ▶' });
    const btnTocar = el('button', { type: 'button', text: '▶▶ Tocar' });

    const boxPainel = el('div', { class: 'lab-painel' });
    const btnEmpilhar = el('button', { type: 'button', title: 'Alterna entre as três visões lado a lado e uma embaixo da outra (mais espaço para autômatos grandes)' });

    const inCadeia = el('input', { class: 'mono lab-cadeia', type: 'text', spellcheck: 'false', 'aria-label': 'Cadeia para testar', value: EXEMPLOS[0].cadeia });
    const btnExec = el('button', { class: 'lab-principal', type: 'button', text: 'Executar' });
    const boxResultado = el('div', { class: 'lab-resultado', 'aria-live': 'polite' });
    const boxChips = el('div', { class: 'lab-chips' });

    const boxTabelas = el('div', { class: 'lab-tabelas' });

    const secao = (titulo, ...filhos) => el('section', { class: 'cartao lab-secao' }, el('h3', { text: titulo }), ...filhos);

    const chipsER = el('div', { class: 'lab-chips' }, el('span', { class: 'mudo', text: 'Exemplos:' }),
      ...EXEMPLOS.map((ex) => el('button', { type: 'button', class: 'chip', text: ex.er, onclick: () => {
        inEr.value = ex.er; inCadeia.value = ex.cadeia; nota.textContent = ex.nota; analisar();
      } })));

    container.append(el('div', { class: 'lab' },
      el('div', { class: 'cartao lab-secao' },
        el('h2', { text: 'Laboratório' }),
        el('p', { class: 'mudo', text: 'Digite uma expressão regular e veja como ela vira árvore, AFN, AFD e AFD mínimo.' }),
        el('div', { class: 'lab-linha' }, inEr, btnAnalisar),
        chipsER, nota, msgErro, contagem),
      secao('1. Árvore sintática',
        el('p', { class: 'mudo', text: 'Clique num nó para ver a explicação e acender no AFN os estados que ele criou.' }),
        boxArvore, boxFrase, el('details', null, el('summary', { text: 'Explicação de todos os nós' }), boxLista)),
      secao('2. Construção de Thompson, passo a passo',
        el('div', { class: 'lab-linha' }, btnIni, btnAnt, btnProx, btnTocar), boxPasso),
      secao('3. AFN, AFD e AFD mínimo', el('div', { class: 'lab-linha' }, btnEmpilhar), boxPainel),
      secao('4. Testar uma cadeia',
        el('div', { class: 'lab-linha' }, inCadeia, btnExec), boxChips, boxResultado),
      secao('5. Tabelas da conversão', boxTabelas)));

    // ---- estado ----
    let atual = null;      // { c, painel, arvore, passos, linhas }
    let k = -1;            // passo de Thompson mostrado (-1 = AFN completo)
    let timer = null;
    let rodando = false;   // animação de execução em andamento
    let empilhado = false; // as três visões uma embaixo da outra
    let escolhaManual = false;

    function aplicarEmpilhado(v) {
      empilhado = v;
      boxPainel.classList.toggle('lab-empilhado', v);
      btnEmpilhar.textContent = v ? '▦ Lado a lado' : '☰ Empilhar as visões';
    }
    aplicarEmpilhado(false);

    function parar() { if (timer) { clearInterval(timer); timer = null; btnTocar.textContent = '▶▶ Tocar'; } }

    function mostrarPasso(novo) {
      if (!atual) return;
      k = novo;
      if (k < 0) {
        atual.painel.passo(null);
        atual.arvore.destacar([]);
        boxPasso.textContent = 'Mostrando o AFN completo. Use "Próximo" para vê-lo sendo construído.';
        return;
      }
      const r = atual.painel.passo(k);
      if (!r) { boxPasso.textContent = 'A construção passo a passo não está disponível.'; return; }
      atual.arvore.destacar([r.atual.noId]);
      boxPasso.textContent = `Passo ${k + 1} de ${r.total}: ${r.atual.texto}`;
    }

    function selecionarNo(id, subarvore) {
      if (!atual) return;
      parar();
      k = -1;
      atual.painel.passo(null);
      atual.painel.destacarNos(subarvore || [id]);
      atual.arvore.destacar(subarvore || [id]);
      const l = atual.linhas.find((x) => x.id === id);
      boxFrase.textContent = l ? `#${l.id}${l.trecho !== null ? ` (${l.trecho || 'vazio'})` : ''}: ${l.texto}` : '';
    }

    function montarTabelas(c) {
      boxTabelas.textContent = '';
      const mt = D('montarTabela');
      if (typeof mt !== 'function') { boxTabelas.append(el('p', { class: 'mudo', text: 'Tabelas indisponíveis.' })); return; }
      for (const [titulo, afd] of [['AFN → AFD (subconjuntos)', c.afd], ['AFD → AFD mínimo (classes)', c.min]]) {
        const corpo = el('div');
        boxTabelas.append(el('details', null, el('summary', { text: titulo }), corpo));
        try { mt(corpo, afd, {}); } catch (e) { corpo.textContent = 'Erro ao montar a tabela: ' + e.message; }
      }
    }

    function montarChips(c) {
      boxChips.textContent = '';
      const ge = D('gerarExemplos');
      if (typeof ge !== 'function') return;
      let ex;
      try { ex = ge(c.min, 4); } catch (e) { return; }
      const chip = (s, ok) => el('button', { type: 'button', class: 'chip ' + (ok ? 'ok' : 'nao'),
        title: ok ? 'aceita' : 'rejeita', text: rotuloCadeia(s), onclick: () => { inCadeia.value = s; executar(); } });
      boxChips.append(el('span', { class: 'mudo', text: 'Cadeias de exemplo:' }),
        ...ex.aceitas.map((s) => chip(s, true)), ...ex.rejeitadas.map((s) => chip(s, false)));
    }

    function analisar() {
      parar();
      msgErro.hidden = true;
      const er = inEr.value;
      let c;
      try { c = D('compilar')(er); }
      catch (e) {
        msgErro.hidden = false; msgErro.textContent = formatarErro(er, e);
        if (atual) contagem.textContent = 'Mostrando o último resultado válido. ' + resumoContagem(atual.c);
        return;
      }

      if (atual) { try { atual.painel.destruir(); } catch (e) { /* já limpo */ } }
      const explicacoes = D('explicar')(c.ast);
      const linhas = linhasDeExplicacao(er, c.ast, explicacoes);

      boxPainel.textContent = '';
      // autômatos grandes precisam de quadros mais largos: empilha sozinho, até o usuário escolher
      if (!escolhaManual) aplicarEmpilhado(c.afn.n > 9);
      const painel = D('montarPainel')(boxPainel, { afn: c.afn, afd: c.afd, min: c.min, ast: c.ast }, deps);
      const arvore = D('montarArvore')(boxArvore, c.ast, { er, aoSelecionar: selecionarNo });
      atual = { c, painel, arvore, linhas, passos: D('passosThompson')(c.ast) };
      k = -1;

      contagem.textContent = resumoContagem(c);
      boxFrase.textContent = linhas.length ? `#${linhas[0].id}: ${linhas[0].texto}` : '';
      boxLista.textContent = '';
      for (const l of linhas) {
        boxLista.append(el('li', { value: String(l.id) },
          el('button', { type: 'button', class: 'lab-no', onclick: () => selecionarNo(l.id, idsDaSubarvoreDe(c.ast, l.id)) },
            el('code', { text: l.trecho === null ? '' : (l.trecho === '' ? 'ε' : l.trecho) }), ' — ', l.texto)));
      }
      mostrarPasso(-1);
      montarTabelas(c);
      montarChips(c);
      boxResultado.textContent = '';
    }

    function idsDaSubarvoreDe(ast, id) {
      const ids = [];
      (function achar(no) {
        if (!no) return false;
        if (no.id === id) { (function todos(n) { ids.push(n.id); if (n.a) todos(n.a); if (n.b) todos(n.b); })(no); return true; }
        return achar(no.a) || achar(no.b);
      })(ast);
      return ids;
    }

    async function executar() {
      if (!atual || rodando) return;
      parar();
      const cadeia = inCadeia.value;
      const { c, painel } = atual;
      k = -1; painel.passo(null);
      rodando = true;
      btnExec.disabled = true;
      boxResultado.textContent = '';
      try {
        const r = await painel.executar(cadeia);
        const motivoFn = D('motivo');
        const ok = r.afn && r.afd && r.min;
        const linha = (nome, aceita) => el('li', null, el('strong', { text: nome + ': ' }), aceita ? 'aceita' : 'rejeita');
        boxResultado.append(
          el('p', { class: 'lab-veredito ' + (ok ? 'ok' : 'nao'), text: `"${cadeia}" ${r.min ? 'é aceita' : 'é rejeitada'}.` }),
          typeof motivoFn === 'function' ? el('p', { text: motivoFn(c.min, cadeia) }) : null,
          el('ul', { class: 'lab-vots' }, linha('AFN', r.afn), linha('AFD', r.afd), linha('AFD mínimo', r.min)));
        if (r.afn !== r.afd || r.afd !== r.min) {
          boxResultado.append(el('p', { class: 'lab-erro', text: 'Os três autômatos discordaram. Isso não deveria acontecer.' }));
        }
      } catch (e) {
        boxResultado.textContent = 'Erro ao executar: ' + e.message;
      } finally {
        rodando = false;
        btnExec.disabled = false;
      }
    }

    // ---- ligações ----
    btnEmpilhar.addEventListener('click', () => { escolhaManual = true; aplicarEmpilhado(!empilhado); });
    btnAnalisar.addEventListener('click', analisar);
    btnExec.addEventListener('click', executar);
    inEr.addEventListener('keydown', (e) => { if (e.key === 'Enter') analisar(); });
    inCadeia.addEventListener('keydown', (e) => { if (e.key === 'Enter') executar(); });
    let espera = null;
    inEr.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(analisar, 450); });

    btnIni.addEventListener('click', () => { parar(); mostrarPasso(-1); });
    btnAnt.addEventListener('click', () => { parar(); if (atual) mostrarPasso(Math.max(0, (k < 0 ? atual.passos.length : k) - 1)); });
    btnProx.addEventListener('click', () => { parar(); if (atual) mostrarPasso(Math.min(atual.passos.length - 1, k + 1)); });
    btnTocar.addEventListener('click', () => {
      if (timer) { parar(); return; }
      if (!atual) return;
      btnTocar.textContent = '⏸ Pausar';
      mostrarPasso(0);
      timer = setInterval(() => {
        if (k >= atual.passos.length - 1) { parar(); return; }
        mostrarPasso(k + 1);
      }, 1100);
    });

    analisar();
  }

  window.Raio = window.Raio || {};
  Object.assign(window.Raio, { montarLab, EXEMPLOS_LAB: EXEMPLOS });
})();
