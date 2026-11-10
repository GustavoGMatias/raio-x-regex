// Modo desafio: aparece uma cadeia, a pessoa diz se o autômato aceita ou rejeita,
// e o raio-x revela a resposta lendo a cadeia passo a passo (e o motivo).
//
// montarDesafio(container, deps)
//   deps.gerarExemplos (obrigatório) gerarExemplos(afd, k) → { aceitas, rejeitadas }  (Sofia)
//   deps.executarAFD   (obrigatório) executarAFD(afd, cadeia)                         (Sofia)
//   deps.padroes       padrões já com o campo afd (se não vier, usa deps.compilar)
//   deps.compilar      er → AFD mínimo, usado para compilar window.Raio.padroes
// Precisa de src/raiox.js carregado antes (o cartão do raio-x).

(function () {
  // ---------- Parte sem tela (testada no Node) ----------

  // Junta as cadeias de um padrão em duas pilhas: as que o autômato aceita e as que
  // rejeita. Vêm do gerarExemplos (mais curtas e variações) e dos exemplos do padrão.
  // Quem decide a pilha é sempre o executarAFD, nunca a lista de onde a cadeia veio.
  function montarBaralho(padrao, gerarExemplos, executarAFD, k = 8) {
    const g = gerarExemplos(padrao.afd, k);
    const todas = new Set([...g.aceitas, ...g.rejeitadas, ...(padrao.exemplos || []), ...(padrao.naoExemplos || [])]);
    const baralho = { aceitas: [], rejeitadas: [] };
    for (const c of todas) {
      if (c === '') continue; // a cadeia vazia não aparece bem na tela
      (executarAFD(padrao.afd, c).aceita ? baralho.aceitas : baralho.rejeitadas).push(c);
    }
    return baralho;
  }

  // Sorteia a próxima pergunta: metade das vezes uma aceita, metade uma rejeitada,
  // sem repetir a pergunta anterior. aleatorio() devolve um número em [0, 1).
  function sortear(baralhos, anterior, aleatorio = Math.random) {
    const nomes = Object.keys(baralhos).filter((n) => baralhos[n].aceitas.length || baralhos[n].rejeitadas.length);
    for (let tentativa = 0; tentativa < 20; tentativa++) {
      const nome = nomes[Math.floor(aleatorio() * nomes.length)];
      const b = baralhos[nome];
      let pilha = aleatorio() < 0.5 ? b.aceitas : b.rejeitadas;
      if (!pilha.length) pilha = pilha === b.aceitas ? b.rejeitadas : b.aceitas;
      const cadeia = pilha[Math.floor(aleatorio() * pilha.length)];
      if (!anterior || anterior.nome !== nome || anterior.cadeia !== cadeia) return { nome, cadeia };
    }
    return anterior;
  }

  // ---------- Parte com tela ----------

  const CSS = `
  .rx-desafio { max-width: 1120px; margin: 0 auto; }
  .rx-desafio-corpo { display: grid; grid-template-columns: minmax(0, 1fr); gap: 32px; }
  @media (min-width: 900px) {
    .rx-desafio-corpo { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 48px; align-items: start; }
    .rx-desafio .rx-raiox { position: sticky; top: 24px; }
  }
  .rx-desafio .rx-escolha { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 22px; }
  .rx-desafio .rx-escolha button { border: 1.5px solid var(--rx-texto); background: transparent; color: inherit;
    border-radius: 999px; padding: 4px 12px; font: 500 14px var(--rx-fonte); cursor: pointer; }
  .rx-desafio .rx-escolha button[aria-pressed="true"] { background: var(--rx-texto); color: var(--rx-fundo); }
  .rx-desafio .rx-escolha button:focus-visible { outline: 2px solid var(--azul); outline-offset: 2px; }
  .rx-pergunta { border: 1.5px solid var(--rx-texto); border-radius: 28px; padding: 26px 28px 28px; background: var(--rx-campo); }
  .rx-pergunta .rx-qual { margin: 0; font-size: 16px; }
  .rx-pergunta .rx-qual b { color: var(--azul); }
  .rx-pergunta .rx-alvo { margin: 14px 0 22px; font: 700 clamp(30px, 4.4vw, 46px)/1.15 var(--rx-mono);
    letter-spacing: 0.06em; overflow-wrap: anywhere; }
  .rx-respostas { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .rx-respostas .rx-pilula { font-size: 17px; padding: 12px 28px; }
  .rx-respostas .rx-dica { font-size: 13px; color: var(--rx-mudo); margin-left: 4px; }
  .rx-veredito { margin: 22px 0 0; font: 800 40px/1 var(--rx-titulo); font-stretch: 75%; text-transform: uppercase; }
  .rx-veredito:empty { display: none; }
  .rx-veredito.certo { color: var(--rx-ok); }
  .rx-veredito.errado { color: var(--rx-erro); }
  .rx-explica { margin: 8px 0 0; font-size: 16px; }
  .rx-explica:empty { display: none; }
  .rx-placar { display: flex; gap: 28px; margin-top: 22px; padding-top: 16px; border-top: 1px solid var(--rx-linha); }
  .rx-placar div { font-size: 14px; color: var(--rx-mudo); }
  .rx-placar strong { display: block; font: 800 34px/1 var(--rx-titulo); font-stretch: 75%; color: var(--rx-texto); }
  `;

  function injetarCSS() {
    if (document.getElementById('rx-estilo-desafio')) return;
    const s = document.createElement('style');
    s.id = 'rx-estilo-desafio';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function prepararPadroes(deps) {
    if (deps.padroes) return deps.padroes;
    const base = (typeof window !== 'undefined' && window.Raio && window.Raio.padroes) || [];
    if (!deps.compilar) throw new Error('montarDesafio precisa de deps.padroes (com afd) ou deps.compilar');
    return base.map((p) => ({ ...p, afd: deps.compilar(p.er) }));
  }

  function montarDesafio(container, deps = {}) {
    if (typeof deps.gerarExemplos !== 'function') throw new Error('montarDesafio precisa de deps.gerarExemplos');
    if (typeof deps.executarAFD !== 'function') throw new Error('montarDesafio precisa de deps.executarAFD');
    const R = (typeof window !== 'undefined' && window.Raio) || {};
    const criarRaioX = deps.criarRaioX || R.criarRaioX;
    if (typeof criarRaioX !== 'function') throw new Error('montarDesafio precisa de src/raiox.js carregado');
    injetarCSS();
    const padroes = prepararPadroes(deps);
    const porNome = new Map(padroes.map((p) => [p.nome, p]));
    const baralhos = {};
    for (const p of padroes) baralhos[p.nome] = montarBaralho(p, deps.gerarExemplos, deps.executarAFD);

    container.innerHTML = '';
    const raiz = el('div', 'rx-desafio rx-tema');
    const corpo = el('div', 'rx-desafio-corpo');
    const esquerda = el('div');
    const escolha = el('div', 'rx-escolha');
    escolha.setAttribute('role', 'group');
    escolha.setAttribute('aria-label', 'Padrões do desafio');
    const pergunta = el('section', 'rx-pergunta');
    pergunta.setAttribute('aria-live', 'polite');
    const qual = el('p', 'rx-qual');
    const alvo = el('p', 'rx-alvo');
    const respostas = el('div', 'rx-respostas');
    const bAceita = el('button', 'rx-pilula cheia', 'Aceita');
    const bRejeita = el('button', 'rx-pilula', 'Rejeita');
    const bProxima = el('button', 'rx-pilula cheia', 'Próxima cadeia');
    [bAceita, bRejeita, bProxima].forEach((b) => { b.type = 'button'; });
    const dica = el('span', 'rx-dica', 'ou aperte A ou R');
    respostas.append(bAceita, bRejeita, bProxima, dica);
    const veredito = el('p', 'rx-veredito');
    const explica = el('p', 'rx-explica');
    pergunta.append(qual, alvo, respostas, veredito, explica);
    const placar = el('div', 'rx-placar');
    const acertosEl = el('strong', '', '0');
    const sequenciaEl = el('strong', '', '0');
    const recordeEl = el('strong', '', '0');
    for (const [rotulo, valor] of [['acertos', acertosEl], ['sequência', sequenciaEl], ['melhor sequência', recordeEl]]) {
      const d = el('div');
      d.append(valor, rotulo);
      placar.appendChild(d);
    }
    esquerda.append(escolha, pergunta, placar);
    const painel = el('div');
    corpo.append(esquerda, painel);
    raiz.append(
      R.cabecalho ? R.cabecalho('Desafio', 'Olhe a cadeia e diga se o autômato aceita ou rejeita. Depois, veja ele ler.') : '',
      corpo,
    );
    container.appendChild(raiz);

    const raiox = criarRaioX(painel, {
      Viz3D: deps.Viz3D || R.Viz3D, grafoAFD: deps.grafoAFD || R.grafoAFD, executarAFD: deps.executarAFD,
    });

    // ----- Estado do jogo -----
    let escolhidos = null;   // null = todos os padrões; senão, o nome de um só
    let atual = null;        // { nome, cadeia }
    let respondida = false;
    let acertos = 0, total = 0, sequencia = 0, recorde = 0;

    // Botões para escolher o padrão: "Todos" ou um só.
    const botoesEscolha = [];
    for (const nome of [null, ...padroes.map((p) => p.nome)]) {
      const b = el('button', '', nome || 'Todos');
      b.type = 'button';
      b.onclick = () => { escolhidos = nome; botoesEscolha.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); proxima(); };
      b.setAttribute('aria-pressed', String(nome === null));
      botoesEscolha.push(b);
      escolha.appendChild(b);
    }

    function proxima() {
      const fonte = escolhidos ? { [escolhidos]: baralhos[escolhidos] } : baralhos;
      atual = sortear(fonte, atual);
      respondida = false;
      const p = porNome.get(atual.nome);
      qual.innerHTML = '';
      qual.append('O autômato de ', el('b', '', p.nome), ' aceita esta cadeia?');
      alvo.textContent = atual.cadeia;
      veredito.textContent = '';
      veredito.className = 'rx-veredito';
      explica.textContent = '';
      bAceita.hidden = bRejeita.hidden = dica.hidden = false;
      bProxima.hidden = true;
      raiox.vazio('Responda primeiro. Depois o autômato lê a cadeia aqui.');
      bAceita.focus({ preventScroll: true });
    }

    function responder(chuteAceita) {
      if (respondida || !atual) return;
      respondida = true;
      const p = porNome.get(atual.nome);
      const r = deps.executarAFD(p.afd, atual.cadeia);
      const certo = chuteAceita === r.aceita;
      total++;
      if (certo) { acertos++; sequencia++; recorde = Math.max(recorde, sequencia); } else sequencia = 0;
      acertosEl.textContent = `${acertos} de ${total}`;
      sequenciaEl.textContent = String(sequencia);
      recordeEl.textContent = String(recorde);

      veredito.textContent = certo ? 'Acertou!' : 'Errou.';
      veredito.classList.add(certo ? 'certo' : 'errado');
      const letras = Array.from(atual.cadeia);
      if (r.aceita) {
        explica.textContent = `O autômato aceita: leu tudo e parou em q${r.caminho[r.caminho.length - 1]}, um estado de aceitação.`;
      } else if (r.morreuEm !== -1) {
        const c = letras[r.morreuEm] === ' ' ? 'espaço' : `"${letras[r.morreuEm]}"`;
        explica.textContent = `O autômato rejeita: o ${c} na posição ${r.morreuEm + 1} não tem seta. Ali cabia ${r.esperado.join(' ou ') || 'nada'}.`;
      } else {
        explica.textContent = `O autômato rejeita: a cadeia acabou em q${r.caminho[r.caminho.length - 1]}, que não é de aceitação. Faltava ${r.esperado.join(' ou ')}.`;
      }
      bAceita.hidden = bRejeita.hidden = dica.hidden = true;
      bProxima.hidden = false;
      bProxima.focus({ preventScroll: true });
      raiox.mostrar({ padrao: p, texto: atual.cadeia, resultado: r, modo: 'tudo' });
    }

    bAceita.onclick = () => responder(true);
    bRejeita.onclick = () => responder(false);
    bProxima.onclick = proxima;
    // Atalhos: A = aceita, R = rejeita, Enter = próxima (só com a aba visível e fora de campos de texto).
    document.addEventListener('keydown', (e) => {
      if (!raiz.isConnected || raiz.offsetParent === null) return;
      if (e.target.closest && e.target.closest('input, textarea')) return;
      const t = e.key.toLowerCase();
      if (!respondida && t === 'a') responder(true);
      else if (!respondida && t === 'r') responder(false);
      else if (respondida && e.key === 'Enter' && e.target === document.body) proxima();
    });

    proxima();
    return { proxima };
  }

  const api = { montarDesafio, montarBaralho, sortear };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
