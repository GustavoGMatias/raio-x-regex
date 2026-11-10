// Aba Chat: mensagens com placa, telefone, CPF etc. destacados sozinhos.
// O destaque vem do varrer (src/scanner.js), que roda os AFDs dos padrões no texto.
//
// montarChat(container, deps)
//   deps.varrer     (obrigatório) varrer(texto, padroes) do scanner
//   deps.padroes    padrões já com o campo afd (se não vier, usa deps.compilar)
//   deps.compilar   er → AFD mínimo, usado para compilar window.Raio.padroes
//   deps.executarAFD  opcional: liga a caixa "testar outra cadeia" do raio-x
//   deps.aoClicar   aoClicar(padrao, trecho), chamado ao clicar num destaque
//                   (no final, o main.js liga isso ao painel com o autômato)
// Precisa de src/raiox.js carregado antes (o cartão do raio-x).
// Opcional: deps.Viz3D e deps.grafoAFD (ou em window.Raio) para o autômato em 3D.

(function () {
  // Mensagens que já aparecem no chat ao abrir a aba.
  const MENSAGENS_EXEMPLO = [
    { de: 'outro', texto: 'Oi! Bati no carro de placa ABC1D23 hoje cedo 😬' },
    { de: 'eu', texto: 'Nossa! Me liga no (83) 98765-4321 que a gente resolve.' },
    { de: 'outro', texto: 'Meu CPF é 123.456.789-09 e o CEP é 58051-900. Manda o orçamento pra luciana@ufx.edu.br' },
    { de: 'eu', texto: 'Ficou R$ 1.250,00, vence em 15/11/2026. Detalhes em https://oficina.com.br/os?id=42 #seguro' },
    { de: 'outro', texto: 'E 34567890 é telefone ou CEP? E ABC1D234, é placa? 🤔' },
  ];

  // ---------- Parte sem tela (testada no Node) ----------

  // Quebra o texto em pedaços, alternando texto comum e trechos destacados.
  // Ex.: pedacos('placa ABC1D23!', [{inicio:6, fim:13, padrao}]) →
  //   [ {texto:'placa ', destaque:null}, {texto:'ABC1D23', destaque:{...}}, {texto:'!', destaque:null} ]
  function pedacos(texto, destaques) {
    const r = [];
    let pos = 0;
    for (const d of destaques) {
      if (d.inicio > pos) r.push({ texto: texto.slice(pos, d.inicio), destaque: null });
      r.push({ texto: texto.slice(d.inicio, d.fim), destaque: d });
      pos = d.fim;
    }
    if (pos < texto.length) r.push({ texto: texto.slice(pos), destaque: null });
    return r;
  }

  // Caminho de estados que o AFD faz lendo o trecho (para o "raio-x" do clique).
  function caminho(afd, trecho) {
    const estados = [afd.start];
    let q = afd.start;
    for (const c of trecho) {
      q = afd.trans[q].get(c);
      if (q === undefined) break;
      estados.push(q);
    }
    return estados;
  }

  // ---------- Parte com tela ----------
  //
  // Layout: conversa à esquerda, cartão azul do raio-x (src/raiox.js) à direita.
  // Clicar num trecho colorido mostra no cartão o autômato que o reconheceu.
  // Em tela estreita, o cartão vai para baixo da conversa.

  const CSS = `
  .rx-chat { max-width: 1120px; margin: 0 auto; }
  .rx-chat-corpo { display: grid; grid-template-columns: minmax(0, 1fr); gap: 32px; }
  @media (min-width: 900px) {
    .rx-chat-corpo { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 48px; align-items: start; }
    .rx-chat .rx-raiox { position: sticky; top: 24px; }
  }
  .rx-conversa { display: grid; gap: 14px; min-width: 0; }
  .rx-legenda { display: flex; flex-wrap: wrap; gap: 6px; }
  .rx-chip { border: 1.5px solid var(--rx-texto); background: transparent; color: inherit;
    border-radius: 999px; padding: 4px 12px; font: 500 14px var(--rx-fonte); cursor: pointer; }
  .rx-chip:hover { background: var(--rx-campo); }
  .rx-chip:focus-visible { outline: 2px solid var(--azul); outline-offset: 2px; }
  .rx-chip i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 7px; }
  .rx-mensagens { display: flex; flex-direction: column; gap: 10px; padding: 18px 0; max-height: 460px; overflow-y: auto;
    border-top: 1.5px solid var(--rx-texto); border-bottom: 1px solid var(--rx-linha); }
  .rx-msg { max-width: 82%; padding: 10px 16px; border-radius: 22px; font-size: 16px; line-height: 1.55;
    white-space: pre-wrap; overflow-wrap: anywhere; border: 1.5px solid var(--rx-texto); background: var(--rx-campo); }
  .rx-msg.eu { align-self: flex-end; border-color: var(--azul); border-bottom-right-radius: 6px; }
  .rx-msg.outro { align-self: flex-start; border-bottom-left-radius: 6px; }
  .rx-marca { border-radius: 4px; padding: 0 2px; cursor: pointer; font: inherit; color: inherit;
    border: 0; border-bottom: 2px solid; }
  .rx-marca:hover { filter: saturate(1.6); }
  .rx-marca.ativa { outline: 2px solid var(--azul); outline-offset: 1px; }
  .rx-marca:focus-visible { outline: 2px solid var(--azul); outline-offset: 1px; }
  .rx-envio { display: flex; gap: 10px; align-items: stretch; }
  .rx-campo { position: relative; flex: 1; }
  .rx-campo textarea, .rx-espelho { box-sizing: border-box; width: 100%; margin: 0; padding: 12px 18px;
    font: 16px/1.5 var(--rx-fonte); letter-spacing: normal; border: 1.5px solid var(--rx-texto);
    border-radius: 24px; white-space: pre-wrap; overflow-wrap: anywhere; }
  .rx-campo textarea { position: relative; resize: none; background: transparent; color: inherit; display: block; height: 74px; }
  .rx-espelho { position: absolute; inset: 0; overflow: hidden; color: transparent; background: var(--rx-campo); pointer-events: none; }
  .rx-espelho mark { color: transparent; border-radius: 3px; }
  .rx-campo textarea:focus { outline: none; border-color: var(--azul); }
  .rx-envio .rx-pilula { align-self: center; }
  .rx-detectado { font: 15px/1.4 var(--rx-fonte); color: var(--rx-mudo); min-height: 1.4em; margin: 0; }
  `;

  function injetarCSS() {
    if (document.getElementById('rx-estilo-chat')) return;
    const s = document.createElement('style');
    s.id = 'rx-estilo-chat';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  // Padrões com o campo afd: os que vieram prontos ou os de window.Raio compilados aqui.
  function prepararPadroes(deps) {
    if (deps.padroes) return deps.padroes;
    const base = (typeof window !== 'undefined' && window.Raio && window.Raio.padroes) || [];
    if (!deps.compilar) throw new Error('montarChat precisa de deps.padroes (com afd) ou deps.compilar');
    return base.map((p) => ({ ...p, afd: deps.compilar(p.er) }));
  }

  function montarChat(container, deps = {}) {
    if (typeof deps.varrer !== 'function') throw new Error('montarChat precisa de deps.varrer');
    const R = (typeof window !== 'undefined' && window.Raio) || {};
    const criarRaioX = deps.criarRaioX || R.criarRaioX;
    if (typeof criarRaioX !== 'function') throw new Error('montarChat precisa de src/raiox.js carregado');
    injetarCSS();
    const padroes = prepararPadroes(deps);
    const varrer = (texto) => deps.varrer(texto, padroes);

    container.innerHTML = '';
    const raiz = el('div', 'rx-chat rx-tema');
    const corpo = el('div', 'rx-chat-corpo');
    const conversa = el('div', 'rx-conversa');
    const legenda = el('div', 'rx-legenda');
    const mensagens = el('div', 'rx-mensagens');
    const envio = el('form', 'rx-envio');
    const campo = el('div', 'rx-campo');
    const espelho = el('div', 'rx-espelho');
    const entrada = el('textarea');
    entrada.placeholder = 'Escreva uma mensagem com placa, telefone, CPF…';
    entrada.setAttribute('aria-label', 'Mensagem');
    const botao = el('button', 'rx-pilula cheia', 'Enviar');
    botao.type = 'submit';
    const detectado = el('p', 'rx-detectado');
    detectado.setAttribute('aria-live', 'polite');
    campo.append(espelho, entrada);
    envio.append(campo, botao);
    conversa.append(legenda, mensagens, envio, detectado);
    const painel = el('div');
    corpo.append(conversa, painel);
    raiz.append(
      R.cabecalho ? R.cabecalho('Chat', 'Placa, telefone, CPF e outros ficam coloridos sozinhos. Clique num deles para ver o autômato.') : '',
      corpo,
    );
    container.appendChild(raiz);

    const raiox = criarRaioX(painel, {
      Viz3D: deps.Viz3D || R.Viz3D, grafoAFD: deps.grafoAFD || R.grafoAFD,
      executarAFD: deps.executarAFD || R.executarAFD, testar: true,
    });
    raiox.vazio('Clique num trecho colorido da conversa para ver o autômato que o reconheceu.');
    let marcaAtiva = null;

    // Legenda: uma bolinha por padrão. Clicar coloca um exemplo na caixa de texto.
    for (const p of padroes) {
      const chip = el('button', 'rx-chip');
      chip.type = 'button';
      chip.title = `${p.descricao}. Clique para inserir um exemplo.`;
      const bola = el('i');
      bola.style.background = p.cor;
      chip.append(bola, p.nome);
      let vez = 0;
      chip.onclick = () => {
        const ex = p.exemplos[vez++ % p.exemplos.length];
        entrada.value += (entrada.value && !entrada.value.endsWith(' ') ? ' ' : '') + ex;
        atualizarEntrada();
        entrada.focus();
      };
      legenda.appendChild(chip);
    }

    // Mostra no raio-x o trecho clicado: o AFD mínimo lendo o trecho até a aceitação.
    function mostrarRaioX(padrao, trecho, marca) {
      if (marcaAtiva) marcaAtiva.classList.remove('ativa');
      marcaAtiva = marca;
      if (marca) marca.classList.add('ativa');
      const lido = padrao.maiusculas ? trecho.toUpperCase() : trecho;
      // O trecho veio do varrer, então foi aceito: não morreu e terminou na aceitação.
      const resultado = { caminho: caminho(padrao.afd, lido), morreuEm: -1, aceita: true, esperado: [] };
      raiox.mostrar({ padrao, texto: lido, resultado, modo: 'tudo' });
      if (typeof deps.aoClicar === 'function') deps.aoClicar(padrao, trecho);
    }

    // Escreve o texto num elemento, com cada trecho reconhecido virando um botão colorido.
    function desenharTexto(alvo, texto) {
      for (const p of pedacos(texto, varrer(texto))) {
        if (!p.destaque) { alvo.append(p.texto); continue; }
        const padrao = p.destaque.padrao;
        const marca = el('button', 'rx-marca', p.texto);
        marca.type = 'button';
        marca.style.background = padrao.cor + '40';
        marca.style.borderBottomColor = padrao.cor;
        marca.title = `${padrao.nome}: clique para ver o autômato`;
        marca.onclick = () => mostrarRaioX(padrao, p.texto, marca);
        alvo.appendChild(marca);
      }
    }

    function adicionarMensagem(de, texto) {
      const msg = el('div', 'rx-msg ' + de);
      desenharTexto(msg, texto);
      mensagens.appendChild(msg);
      mensagens.scrollTop = mensagens.scrollHeight;
      return msg;
    }

    // Destaque ao vivo: o espelho fica atrás da caixa de texto, com as mesmas letras
    // (invisíveis) e os trechos pintados. A cada tecla, roda o varrer de novo.
    function atualizarEntrada() {
      const texto = entrada.value;
      const ds = varrer(texto);
      espelho.innerHTML = '';
      for (const p of pedacos(texto, ds)) {
        if (!p.destaque) { espelho.append(p.texto); continue; }
        const m = el('mark', '', p.texto);
        m.style.background = p.destaque.padrao.cor + '55';
        espelho.appendChild(m);
      }
      espelho.append('\n'); // mantém a última linha vazia com altura
      espelho.scrollTop = entrada.scrollTop;
      detectado.textContent = ds.length
        ? 'Reconhecido: ' + ds.map((d) => `${d.padrao.nome} (${texto.slice(d.inicio, d.fim)})`).join(', ')
        : '';
    }

    entrada.addEventListener('input', atualizarEntrada);
    entrada.addEventListener('scroll', () => { espelho.scrollTop = entrada.scrollTop; });
    entrada.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envio.requestSubmit(); }
    });
    envio.addEventListener('submit', (e) => {
      e.preventDefault();
      const texto = entrada.value.trim();
      if (!texto) return;
      adicionarMensagem('eu', texto);
      entrada.value = '';
      atualizarEntrada();
    });

    for (const m of MENSAGENS_EXEMPLO) adicionarMensagem(m.de, m.texto);
    atualizarEntrada();

    return { adicionarMensagem };
  }

  const api = { montarChat, pedacos, caminho, MENSAGENS_EXEMPLO };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
