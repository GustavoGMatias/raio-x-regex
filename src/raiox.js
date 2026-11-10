// Painel do raio-x: o cartão azul onde o autômato aparece lendo uma cadeia,
// um caractere por vez, com a bolinha andando de estado em estado.
// Usado pelo Chat (ao clicar num destaque) e pelo Formulário (ao vivo, enquanto digita).
// Também guarda o tema visual da Parte 3 (cores e fontes), usado pelo Chat e pelo Formulário.
//
// criarRaioX(painel, opcoes) → { mostrar(dados), vazio(frase) }
//   opcoes.Viz3D, opcoes.grafoAFD  com os dois, o autômato é desenhado em 3D (src/viz3d.js,
//                                  do Pierre, e grafoAFD da Sofia). Sem eles, aparece a fita 2D.
//   opcoes.executarAFD             para a caixa "testar outra cadeia" (só com opcoes.testar)
//   opcoes.testar                  true mostra a caixa de teste e o botão "tentar uma inválida"
//   opcoes.totalCadeias, opcoes.contarCadeias  (src/contagem.js) mostram "quantas existem?"
//
// mostrar({ padrao, texto, resultado, modo })
//   padrao     { nome, er, cor, afd, naoExemplos }
//   texto      a cadeia lida (do jeito que a pessoa vê)
//   resultado  no formato de executarAFD: { caminho, morreuEm, aceita, esperado }
//   modo       'tudo'   toca a leitura do começo e repete sozinho
//              'ultimo' mostra só o último passo e para (o Formulário usa enquanto se digita)

(function () {
  const FONTES = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400;700' +
    '&family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800&display=swap';

  const TEMPO_PASSO = 650;   // ms da bolinha andando numa transição
  const TEMPO_PAUSA = 250;   // ms parada em cada estado
  const TEMPO_FIM = 3200;    // ms mostrando o resultado antes de recomeçar

  // Tema: creme, azul e tinta preta, com o lima só no estado atual e na aceitação.
  // A classe rx-tema vai na raiz do Chat e do Formulário.
  const CSS = `
  .rx-tema, .rx-raiox {
    --creme: #f6eedf; --azul: #3760f9; --azul-escuro: #2448d6; --tinta: #17161b; --lima: #d2fc59; --rosa: #ffd2cb;
    --rx-fundo: var(--creme); --rx-texto: var(--tinta); --rx-linha: #17161b26; --rx-campo: #fffaf1;
    --rx-mudo: #5d574c; --rx-erro: #c2261d; --rx-ok: #1d7a3a; --rx-quase: #a35a00;
    --rx-titulo: 'Bricolage Grotesque', system-ui, sans-serif;
    --rx-fonte: 'Bricolage Grotesque', system-ui, sans-serif;
    --rx-mono: 'Atkinson Hyperlegible Mono', ui-monospace, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-tema="claro"]) .rx-tema {
      --rx-fundo: var(--tinta); --rx-texto: var(--creme); --rx-linha: #f6eedf2e; --rx-campo: #211f27;
      --rx-mudo: #b9b1a3; --rx-erro: #ff8a7a; --rx-ok: #8fe3a5; --rx-quase: #ffc36b;
    }
  }
  :root[data-tema="escuro"] .rx-tema {
    --rx-fundo: var(--tinta); --rx-texto: var(--creme); --rx-linha: #f6eedf2e; --rx-campo: #211f27;
    --rx-mudo: #b9b1a3; --rx-erro: #ff8a7a; --rx-ok: #8fe3a5; --rx-quase: #ffc36b;
  }
  .rx-tema { background: var(--rx-fundo); color: var(--rx-texto); font-family: var(--rx-fonte); }

  /* Cabeçalho de cada aba: título grosso e condensado + uma frase. */
  .rx-cabeca { margin: 0 0 28px; }
  .rx-cabeca h2 { margin: 0; font: 800 clamp(44px, 7vw, 76px)/0.92 var(--rx-titulo); font-stretch: 75%;
    letter-spacing: -0.01em; text-transform: uppercase; color: var(--azul); }
  .rx-cabeca p { margin: 12px 0 0; font: 400 20px/1.4 var(--rx-fonte); max-width: 52ch; }

  /* Botões em pílula: contorno (secundário) e cheio (principal). */
  .rx-pilula { font: 600 15px var(--rx-fonte); padding: 9px 20px; border-radius: 999px; cursor: pointer;
    border: 1.5px solid var(--azul); background: transparent; color: var(--azul); }
  .rx-pilula.cheia { background: var(--azul); color: var(--creme); }
  .rx-pilula:disabled { opacity: 0.4; cursor: not-allowed; }
  .rx-pilula:focus-visible { outline: 2px solid var(--rx-texto); outline-offset: 3px; }

  /* ---- O cartão do raio-x ---- */
  .rx-raiox {
    position: relative; background: var(--azul); color: var(--creme); border-radius: 28px;
    padding: 26px 26px 22px; font-family: var(--rx-fonte); overflow: hidden;
  }
  .rx-raiox h3 { margin: 0; font: 800 44px/0.95 var(--rx-titulo); font-stretch: 75%; text-transform: uppercase; }
  .rx-quantas { margin: 18px 0 0; padding-top: 16px; border-top: 1px solid #f6eedf40; }
  .rx-quantas:empty { display: none; }
  .rx-quantas p { margin: 0; font-size: 14px; }
  .rx-quantas strong { display: block; margin: 2px 0; font: 800 38px/1 var(--rx-titulo); font-stretch: 75%;
    color: var(--creme); overflow-wrap: anywhere; }
  .rx-raiox .rx-er { margin: 16px 0 0; font: 13px/1.5 var(--rx-mono); overflow-wrap: anywhere; opacity: 0.75; }
  .rx-raiox .rx-vazio { display: block; margin: 40px 0 30px; font: 600 24px/1.3 var(--rx-fonte); max-width: 24ch; }

  /* A cadeia sendo lida: já lidos apagados, o atual aceso, o que matou riscado. */
  .rx-cadeia { margin: 14px 0 0; font: 24px/1.3 var(--rx-mono); letter-spacing: 0.12em; min-height: 1.3em;
    overflow-wrap: anywhere; }
  .rx-cadeia span { transition: opacity 0.2s, color 0.2s; border-radius: 4px; }
  .rx-cadeia .lido { opacity: 0.45; }
  .rx-cadeia .agora { color: var(--tinta); background: var(--lima); }
  .rx-cadeia .matou { color: var(--tinta); background: var(--rosa); text-decoration: line-through; }
  .rx-cadeia .vazia { font: 16px var(--rx-fonte); letter-spacing: 0; opacity: 0.8; }

  .rx-raiox canvas { display: block; width: calc(100% + 52px); height: 300px; margin: 6px -26px 0; cursor: grab; touch-action: none;
    --viz-fundo: #3760f9; --viz-no: #3760f9; --viz-borda: #f6eedf; --viz-texto: #f6eedf; --viz-aresta: #f6eedf90;
    --viz-rotulo: #f6eedf; --viz-rotulo-fundo: #3760f9; --viz-ativo: #d2fc59; --viz-destaque: #f6eedf;
    --viz-morto: #e8463a; --viz-legenda-fundo: transparent; }

  /* Controles: recomeçar, pausar/tocar, um passo, trocar rótulos. */
  .rx-controles { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 8px; }
  .rx-controles button, .rx-teste button { font: 600 14px var(--rx-fonte); color: var(--creme); background: transparent;
    border: 1.5px solid var(--creme); border-radius: 999px; padding: 6px 14px; cursor: pointer; }
  .rx-controles button:hover, .rx-teste button:hover { background: #ffffff1f; }
  .rx-controles button:focus-visible, .rx-teste button:focus-visible, .rx-teste input:focus-visible { outline: 2px solid var(--lima); outline-offset: 2px; }
  .rx-controles .rx-girar { margin-left: auto; font-size: 13px; opacity: 0.75; }
  .rx-controles .rx-rotulos { border-style: dashed; }

  .rx-agora { margin: 12px 0 0; font: 15px var(--rx-mono); min-height: 1.5em; }
  .rx-raiox .rx-status { margin: 10px 0 0; font: 600 19px/1.4 var(--rx-fonte); min-height: 1.4em; }
  .rx-raiox .rx-status.aceita { color: var(--lima); }
  .rx-raiox .rx-status.morto { color: var(--rosa); }
  .rx-raiox .rx-status code { font: 16px var(--rx-mono); background: var(--azul-escuro); padding: 1px 6px; border-radius: 6px; }

  /* Testar outra cadeia (só no Chat). */
  .rx-teste { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 16px; padding-top: 16px;
    border-top: 1px solid #f6eedf40; }
  .rx-teste label { font-size: 14px; font-weight: 600; }
  .rx-teste input { flex: 1; min-width: 120px; font: 16px var(--rx-mono); color: var(--tinta); background: var(--creme);
    border: 0; border-radius: 999px; padding: 7px 14px; }

  /* Fita 2D (quando o desenho 3D não está carregado). */
  .rx-fita { display: flex; flex-wrap: wrap; align-items: flex-end; row-gap: 12px; margin-top: 18px; min-height: 52px;
    font-family: var(--rx-mono); }
  .rx-estado { box-sizing: border-box; width: 38px; height: 38px; border-radius: 50%; border: 1.5px solid #f6eedf99;
    display: grid; place-items: center; font-size: 12px; transition: background 0.2s, opacity 0.2s; }
  .rx-estado.inicio { border-width: 2.5px; }
  .rx-estado.final { box-shadow: inset 0 0 0 3px var(--azul), inset 0 0 0 4.5px #f6eedf99; }
  .rx-estado.morto { border: 2px solid var(--rosa); color: var(--rosa); font-size: 16px; font-weight: 700; }
  .rx-passo { display: flex; flex-direction: column; align-items: center; width: 26px; padding-bottom: 18px;
    transition: opacity 0.2s; }
  .rx-letra { font-size: 15px; line-height: 1.2; }
  .rx-seta { position: relative; width: 100%; height: 1.5px; background: #f6eedf99; }
  .rx-seta::after { content: ''; position: absolute; right: 0; top: -3px; border: 4px solid transparent;
    border-left: 5px solid #f6eedf99; border-right: 0; }
  .rx-passo.morreu .rx-letra { color: var(--rosa); font-weight: 700; }
  .rx-passo.morreu .rx-seta { background: repeating-linear-gradient(90deg, var(--rosa) 0 3px, transparent 3px 6px); }
  .rx-fita .futuro { opacity: 0.3; }
  .rx-fita .rx-estado.visto { background: #f6eedf26; }
  .rx-fita .rx-estado.atual { background: var(--lima); color: var(--tinta); border-color: var(--lima); font-weight: 700; }
  .rx-fita .rx-estado.morto.atual { background: var(--rosa); border-color: var(--rosa); }
  `;

  function injetarEstilo() {
    if (document.getElementById('rx-estilo-raiox')) return;
    if (!document.querySelector('link[href*="Bricolage+Grotesque"]')) {
      const fontes = document.createElement('link');
      fontes.rel = 'stylesheet';
      fontes.href = FONTES;
      document.head.appendChild(fontes);
    }
    const s = document.createElement('style');
    s.id = 'rx-estilo-raiox';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function botao(texto, classe) {
    const b = el('button', classe || '', texto);
    b.type = 'button';
    return b;
  }

  const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const mostrarChar = (c) => (c === ' ' ? '␣' : c);
  const semMovimento = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Cabeçalho de aba: título + uma frase. Exportado para o Chat e o Formulário.
  function cabecalho(titulo, frase) {
    injetarEstilo();
    const c = el('header', 'rx-cabeca');
    c.append(el('h2', '', titulo), el('p', '', frase));
    return c;
  }

  // ---------- Parte sem tela (testada no Node) ----------

  // Rótulos amigáveis para as setas: "[A-Z]" vira "letra", "[0-9]" vira "dígito"...
  // Só troca os que estão no dicionário; o resto fica como a ER escreveu.
  const AMIGAVEIS = {
    '[A-Z]': 'letra', '[a-z]': 'minúscula', '[A-Za-z]': 'letra', '[0-9]': 'dígito', '␣': 'espaço',
    '[\\-0-9]': 'dígito ou -', '[\\-0-9A-Za-z]': 'letra, dígito ou -',
    '[%+\\-.0-9A-Z_a-z]': 'letra, dígito ou ._%+-', '[#%&+\\-/-9=A-Z_a-z~]': 'caractere de link',
  };
  function rotuloAmigavel(r) {
    if (AMIGAVEIS[r]) return AMIGAVEIS[r];
    if (/^\[0-9A-Z_a-z/.test(r)) return 'letra, dígito ou _'; // a classe da hashtag (com acentos)
    const faixa = /^\[(\d)-(\d)\]$/.exec(r);                  // [1-9] vira "1 a 9"
    if (faixa) return `${faixa[1]} a ${faixa[2]}`;
    return r;
  }

  // A leitura dividida em passos, para tocar um de cada vez.
  //   { tipo: 'inicio', estado }                 antes de ler qualquer coisa
  //   { tipo: 'move', de, para, lidos }          leu um caractere e andou
  //   { tipo: 'fim', estado, aceita }            acabou a cadeia
  //   { tipo: 'morreu', estado, lidos }          o caractere seguinte não tinha seta
  function passosLeitura(resultado) {
    const cam = resultado.caminho;
    const passos = [{ tipo: 'inicio', estado: cam[0], lidos: 0 }];
    for (let k = 1; k < cam.length; k++) passos.push({ tipo: 'move', de: cam[k - 1], para: cam[k], lidos: k });
    const ultimo = cam[cam.length - 1];
    if (resultado.morreuEm !== -1) passos.push({ tipo: 'morreu', estado: ultimo, lidos: cam.length - 1 });
    else passos.push({ tipo: 'fim', estado: ultimo, aceita: resultado.aceita, lidos: cam.length - 1 });
    return passos;
  }

  // ---------- Parte com tela ----------

  // Frase dizendo onde o autômato parou e por quê.
  function preencherStatus(p, texto, r, letras) {
    p.className = 'rx-status';
    p.innerHTML = '';
    const ultimo = 'q' + r.caminho[r.caminho.length - 1];
    const opcoes = r.esperado.length ? r.esperado.join(' ou ') : '?';
    if (texto === '') {
      p.textContent = `Começa em ${ultimo}. Digite para ver o autômato ler.`;
    } else if (r.morreuEm !== -1) {
      p.classList.add('morto');
      p.append(`Morreu no "${mostrarChar(letras[r.morreuEm])}": de ${ultimo} não sai seta com ele. Ali cabia `,
        el('code', '', opcoes), '.');
    } else if (r.aceita) {
      p.classList.add('aceita');
      p.textContent = `Aceita: parou em ${ultimo}, que é estado de aceitação. ✓`;
    } else {
      p.append(`Parou em ${ultimo}, que ainda não é de aceitação. Falta `, el('code', '', opcoes), '.');
    }
  }

  // Fita 2D: todos os estados e setas do caminho; o tocador acende um de cada vez.
  function montarFita(texto, r, finais) {
    const letras = Array.from(texto);
    const f = el('div', 'rx-fita');
    const estados = [];
    const passos = [];
    r.caminho.forEach((q, i) => {
      if (i > 0) {
        const passo = el('span', 'rx-passo');
        passo.append(el('span', 'rx-letra', mostrarChar(letras[i - 1])), el('span', 'rx-seta'));
        f.appendChild(passo);
        passos.push(passo);
      }
      const e = el('span', 'rx-estado' + (i === 0 ? ' inicio' : '') + (finais.has(q) ? ' final' : ''), 'q' + q);
      f.appendChild(e);
      estados.push(e);
    });
    let morto = null;
    if (r.morreuEm !== -1) {
      const passo = el('span', 'rx-passo morreu');
      passo.append(el('span', 'rx-letra', mostrarChar(letras[r.morreuEm])), el('span', 'rx-seta'));
      morto = el('span', 'rx-estado morto', '∅');
      f.append(passo, morto);
      passos.push(passo);
    }
    f.setAttribute('role', 'img');
    f.setAttribute('aria-label', 'Caminho no autômato: ' + r.caminho.map((q) => 'q' + q).join(', ') +
      (morto ? ', estado morto' : ''));

    // Acende o passo k: estados até k vistos, o k-ésimo atual, o resto apagado.
    function pintar(k, passo) {
      estados.forEach((e, i) => {
        e.classList.toggle('futuro', i > k);
        e.classList.toggle('visto', i < k);
        e.classList.toggle('atual', i === k && passo.tipo !== 'morreu');
      });
      passos.forEach((p, i) => p.classList.toggle('futuro', i >= k && !(passo.tipo === 'morreu' && p.classList.contains('morreu'))));
      if (morto) {
        morto.classList.toggle('futuro', passo.tipo !== 'morreu');
        morto.classList.toggle('atual', passo.tipo === 'morreu');
      }
    }
    return { elemento: f, pintar };
  }

  function criarRaioX(painel, opcoes = {}) {
    injetarEstilo();
    painel.classList.add('rx-raiox');
    const R = (typeof window !== 'undefined' && window.Raio) || {};
    const Viz3D = opcoes.Viz3D;
    const grafoAFD = opcoes.grafoAFD;
    const usa3D = typeof Viz3D === 'function' && typeof grafoAFD === 'function';
    const executarAFD = opcoes.executarAFD || R.executarAFD;
    const totalCadeias = opcoes.totalCadeias || R.totalCadeias;
    const contarCadeias = opcoes.contarCadeias || R.contarCadeias;

    // Partes fixas do cartão; só o conteúdo delas muda.
    const titulo = el('h3');
    const cadeia = el('p', 'rx-cadeia');
    cadeia.setAttribute('aria-hidden', 'true');
    const area = el('div');
    const controles = el('div', 'rx-controles');
    const bRecomecar = botao('↺ recomeçar');
    const bTocar = botao('❚❚ pausar');
    const bPasso = botao('passo ›');
    const bRotulos = botao('letra/dígito', 'rx-rotulos');
    bRotulos.title = 'Trocar os rótulos das setas entre palavras e a notação da ER';
    controles.append(bRecomecar, bTocar, bPasso, bRotulos);
    const agora = el('p', 'rx-agora');
    agora.setAttribute('aria-live', 'polite');
    const status = el('p', 'rx-status');
    const quantas = el('div', 'rx-quantas');
    const er = el('p', 'rx-er');
    painel.append(titulo, cadeia, area, controles, agora, status);

    // Caixa "testar outra cadeia" (opcional).
    let teste = null;
    if (opcoes.testar && typeof executarAFD === 'function') {
      teste = { caixa: el('div', 'rx-teste'), input: el('input'), ler: botao('Ler'), invalida: botao('Tentar uma inválida') };
      const id = 'rx-teste-' + Math.random().toString(36).slice(2, 8);
      const label = el('label', '', 'Testar outra cadeia');
      label.htmlFor = id;
      teste.input.id = id;
      teste.input.spellcheck = false;
      teste.input.autocomplete = 'off';
      teste.caixa.append(label, teste.input, teste.ler, teste.invalida);
      painel.appendChild(teste.caixa);
    }
    painel.append(quantas, er);

    let viz = null;
    let enquadrar = () => {};
    if (usa3D) {
      const canvas = el('canvas');
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'Autômato em 3D. Arraste para girar, use a rodinha para aproximar.');
      area.appendChild(canvas);
      // Sem o giro completo do Viz3D: de lado, o autômato fica encolhido e ilegível.
      // Em vez disso, ele balança devagar em volta da vista de frente (ou da vista que
      // a pessoa escolheu arrastando). Com o mouse em cima, fica parado.
      // (Usa viz.yaw e viz._pedir() do Viz3D; se o Pierre criar uma opção de balanço,
      // dá para trocar por ela.)
      viz = new Viz3D(canvas, { girarSozinho: false });
      controles.appendChild(el('span', 'rx-girar', 'Arraste para girar'));
      let mouseEmCima = false;
      let base = -0.3;
      let t0 = 0;
      canvas.addEventListener('pointerenter', () => { mouseEmCima = true; });
      canvas.addEventListener('pointerleave', () => { mouseEmCima = false; base = viz.yaw; t0 = 0; });
      const balancar = (t) => {
        if (!painel.isConnected) return;
        if (!t0) t0 = t;
        if (!mouseEmCima && !semMovimento() && viz.grafo.states.length > 1) {
          viz.yaw = base + 0.32 * Math.sin((t - t0) / 2400);
          viz._pedir();
        }
        requestAnimationFrame(balancar);
      };
      requestAnimationFrame(balancar);

      // Enquadra o autômato: procura o ângulo em que ele fica mais "aberto" na
      // horizontal e aproxima até ocupar o cartão (o Viz3D, sozinho, reserva espaço
      // para a volta completa e deixa o desenho pequeno).
      enquadrar = () => {
        try {
          if (!viz.pos || viz.pos.size < 2 || !viz.w) return;
          let melhor = -1, melhorYaw = -0.3;
          for (let i = 0; i < 72; i++) {
            viz.yaw = -Math.PI + (i * Math.PI) / 36;
            let min = Infinity, max = -Infinity;
            for (const p of viz.pos.values()) { const r = viz._rodar(p); min = Math.min(min, r.x); max = Math.max(max, r.x); }
            if (max - min > melhor + 1e-6) { melhor = max - min; melhorYaw = viz.yaw; }
          }
          // Lê da esquerda para a direita: se o estado inicial ficou à direita, vira meia volta.
          const inicio = viz.grafo.states.find((s) => s.start);
          if (inicio && viz.pos.has(inicio.id)) {
            viz.yaw = melhorYaw;
            const xs = [...viz.pos.values()].map((p) => viz._rodar(p).x);
            if (viz._rodar(viz.pos.get(inicio.id)).x > (Math.min(...xs) + Math.max(...xs)) / 2) melhorYaw += Math.PI;
          }
          let mx = 0.01, my = 0.01; // espaço ocupado durante o balanço
          for (const d of [-0.32, -0.16, 0, 0.16, 0.32]) {
            viz.yaw = melhorYaw + d;
            for (const p of viz.pos.values()) { const r = viz._rodar(p); mx = Math.max(mx, Math.abs(r.x)); my = Math.max(my, Math.abs(r.y)); }
          }
          viz.yaw = base = melhorYaw;
          t0 = 0;
          viz.zoom = Math.max(1, Math.min(2.4, (viz.w / 2 - 46) / (viz.escala * mx), (viz.h / 2 - 34) / (viz.escala * my)));
          viz._pedir();
        } catch (e) {
          // Se o Viz3D mudar por dentro, fica o enquadramento padrão dele.
        }
      };
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => enquadrar()).observe(canvas);
    } else {
      bRotulos.hidden = true; // na fita 2D os rótulos são os próprios caracteres lidos
    }

    // ----- Estado do tocador -----
    let atual = null;        // { padrao, texto, resultado, letras, passos, fita }
    let k = 0;               // passo mostrado agora
    let tocando = false;
    let geracao = 0;         // muda a cada nova leitura/pausa: cancela o laço antigo
    let amigavel = true;
    let padraoNoViz = null;
    let invalida = 0;
    const grafos = new Map();

    function grafoDe(padrao) {
      const chave = padrao.nome + (amigavel ? ':a' : ':e');
      if (!grafos.has(chave)) {
        const g = grafoAFD(padrao.afd);
        grafos.set(chave, amigavel ? { ...g, edges: g.edges.map((e) => ({ ...e, label: rotuloAmigavel(e.label) })) } : g);
      }
      return grafos.get(chave);
    }

    function atualizarBotoes() {
      bTocar.textContent = tocando ? '❚❚ pausar' : '▶ tocar';
      bTocar.setAttribute('aria-pressed', String(tocando));
      bPasso.disabled = !atual || k >= atual.passos.length - 1;
      bRotulos.textContent = amigavel ? 'letra/dígito' : '[A-Z]/[0-9]';
    }

    // Desenha a cadeia com o caractere atual aceso.
    function pintarCadeia(passo) {
      cadeia.innerHTML = '';
      if (!atual.letras.length) { cadeia.appendChild(el('span', 'vazia', 'Cadeia vazia')); return; }
      atual.letras.forEach((c, i) => {
        const s = el('span', '', mostrarChar(c));
        if (i < passo.lidos) s.className = 'lido';
        if (passo.tipo === 'morreu' && i === atual.resultado.morreuEm) s.className = 'matou';
        else if (passo.tipo === 'move' && i === passo.lidos - 1) s.className = 'agora';
        cadeia.appendChild(s);
      });
    }

    // Mostra o passo i (com animação da bolinha, se 'animado').
    function mostrarPasso(i, animado) {
      k = i;
      const p = atual.passos[i];
      const vistos = atual.resultado.caminho.slice(0, p.tipo === 'move' ? p.lidos : p.lidos + 1);
      pintarCadeia(p);
      if (p.tipo === 'inicio') agora.textContent = `Começa em q${p.estado}`;
      if (p.tipo === 'move') agora.textContent = `Leu "${mostrarChar(atual.letras[p.lidos - 1])}": q${p.de} → q${p.para}`;
      if (p.tipo === 'fim' || p.tipo === 'morreu') {
        agora.textContent = '';
        preencherStatus(status, atual.texto, atual.resultado, atual.letras);
      } else {
        status.className = 'rx-status';
        status.textContent = '';
      }
      if (viz) {
        viz.setDestacados(vistos);
        viz.marcarMorte(null);
        const dur = animado && !semMovimento() ? TEMPO_PASSO : 0;
        if (p.tipo === 'move') viz.animar([{ arestas: [{ de: p.de, para: p.para }], ativos: [p.para] }], { duracao: dur, pausa: 0 });
        else if (p.tipo === 'morreu') { viz.parar(); viz.setAtivos([]); viz.marcarMorte([p.estado], 'morreu aqui'); }
        else { viz.parar(); viz.setAtivos([p.estado]); }
      } else if (atual.fita) {
        atual.fita.pintar(Math.min(i, atual.resultado.caminho.length - 1), p);
      }
      atualizarBotoes();
    }

    // Laço: anda um passo por vez; no fim espera e recomeça (se ainda estiver tocando).
    async function tocar() {
      const g = ++geracao;
      tocando = true;
      atualizarBotoes();
      while (g === geracao) {
        if (k >= atual.passos.length - 1) {
          await esperar(TEMPO_FIM);
          if (g !== geracao) return;
          mostrarPasso(0, false);
          await esperar(TEMPO_PAUSA * 2);
          continue;
        }
        mostrarPasso(k + 1, true);
        await esperar((atual.passos[k].tipo === 'move' ? TEMPO_PASSO : 0) + TEMPO_PAUSA);
      }
    }

    function pausar() {
      geracao++;
      tocando = false;
      atualizarBotoes();
    }

    bTocar.onclick = () => { if (!atual) return; if (tocando) pausar(); else tocar(); };
    bPasso.onclick = () => { if (!atual) return; pausar(); if (k < atual.passos.length - 1) mostrarPasso(k + 1, true); };
    bRecomecar.onclick = () => { if (!atual) return; pausar(); mostrarPasso(0, false); if (!semMovimento()) tocar(); };
    bRotulos.onclick = () => {
      amigavel = !amigavel;
      if (viz && atual) { viz.setGrafo(grafoDe(atual.padrao)); enquadrar(); mostrarPasso(k, false); }
      atualizarBotoes();
    };

    function testar(cadeiaNova) {
      if (!atual) return;
      const padrao = atual.padrao;
      const lida = padrao.maiusculas ? cadeiaNova.toUpperCase() : cadeiaNova;
      teste.input.value = lida;
      mostrar({ padrao, texto: lida, resultado: executarAFD(padrao.afd, lida), modo: 'tudo' });
    }
    if (teste) {
      teste.ler.onclick = () => testar(teste.input.value);
      teste.input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); testar(teste.input.value); } };
      teste.invalida.onclick = () => {
        const lista = (atual && atual.padrao.naoExemplos) || [];
        if (lista.length) testar(lista[invalida++ % lista.length]);
      };
    }

    // "Quantas existem?": conta, pelo próprio autômato, quantas cadeias ele aceita.
    // Linguagem finita (placa, CPF...): o total. Infinita (e-mail, link...): quantas
    // existem só com o tamanho da cadeia atual.
    const totais = new Map();
    function mostrarQuantas(padrao, tamanho) {
      quantas.innerHTML = '';
      if (typeof totalCadeias !== 'function' || typeof contarCadeias !== 'function') return;
      if (!totais.has(padrao)) totais.set(padrao, totalCadeias(padrao.afd));
      const total = totais.get(padrao);
      const numero = (x) => x.toLocaleString('pt-BR');
      if (total !== null) {
        quantas.append(el('p', '', `Quantas cadeias este autômato aceita?`), el('strong', '', numero(total)),
          el('p', '', total === 1n ? 'Só uma.' : 'Contadas pelo autômato, sem fórmula feita à mão.'));
      } else {
        const n = Math.max(1, tamanho);
        quantas.append(el('p', '', 'Quantas cadeias este autômato aceita?'), el('strong', '', 'Infinitas'),
          el('p', '', `Só com ${n} caractere${n > 1 ? 's' : ''}, são ${numero(contarCadeias(padrao.afd, n))}.`));
      }
    }

    function vazio(frase) {
      pausar();
      atual = null;
      titulo.textContent = 'Raio-X';
      cadeia.innerHTML = '';
      agora.textContent = '';
      status.className = 'rx-status';
      status.innerHTML = '';
      status.appendChild(el('span', 'rx-vazio', frase));
      er.textContent = '';
      quantas.innerHTML = '';
      controles.hidden = true;
      if (teste) teste.caixa.hidden = true;
      if (viz) { viz.setGrafo({ states: [], edges: [] }); padraoNoViz = null; }
      else area.innerHTML = '';
    }

    function mostrar({ padrao, texto, resultado, modo = 'tudo' }) {
      pausar();
      controles.hidden = false;
      if (teste) { teste.caixa.hidden = false; if (document.activeElement !== teste.input) teste.input.value = texto; }
      titulo.textContent = padrao.nome;
      er.textContent = `AFD mínimo com ${padrao.afd.n} estados, gerado da ER ${padrao.er}`;
      mostrarQuantas(padrao, Array.from(texto).length);
      const mesmo = atual && atual.padrao === padrao;
      atual = { padrao, texto, resultado, letras: Array.from(texto), passos: passosLeitura(resultado), fita: null };

      if (viz) {
        if (padraoNoViz !== padrao) { viz.setGrafo(grafoDe(padrao)); padraoNoViz = padrao; enquadrar(); }
      } else {
        atual.fita = montarFita(texto, resultado, padrao.afd.aceita);
        area.innerHTML = '';
        area.appendChild(atual.fita.elemento);
      }

      const ultimo = atual.passos.length - 1;
      if (modo === 'ultimo' && mesmo) {
        // Enquanto digita: anima só o último movimento e depois mostra o resultado.
        const ultimoMove = atual.passos.findLastIndex((p) => p.tipo === 'move');
        if (ultimoMove > 0 && !semMovimento()) {
          mostrarPasso(ultimoMove, true);
          const g = geracao;
          setTimeout(() => { if (g === geracao) mostrarPasso(ultimo, false); }, TEMPO_PASSO);
        } else {
          mostrarPasso(ultimo, false);
        }
      } else if (semMovimento()) {
        mostrarPasso(ultimo, false);
      } else {
        mostrarPasso(0, false);
        tocar();
      }
    }

    return { mostrar, vazio };
  }

  const api = { criarRaioX, cabecalho, rotuloAmigavel, passosLeitura };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
