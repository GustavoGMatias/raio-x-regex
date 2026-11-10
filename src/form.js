// Aba Formulário: cada campo é validado por um AFD enquanto a pessoa digita.
// Três estados, todos tirados do resultado de executarAFD (src/dfa.js, da Sofia):
//   válido      o AFD leu tudo e parou num estado de aceitação
//   incompleto  não morreu, mas ainda não chegou na aceitação (falta digitar)
//   inválido    morreu: algum caractere não tinha transição
//
// montarForm(container, deps)
//   deps.executarAFD (obrigatório) executarAFD(afd, cadeia) → { caminho, morreuEm, aceita, esperado }
//   deps.padroes     padrões já com o campo afd (se não vier, usa deps.compilar)
//   deps.compilar    er → AFD mínimo, usado para compilar window.Raio.padroes
// Precisa de src/raiox.js carregado antes (o cartão do raio-x ao lado dos campos).
// Opcional: deps.Viz3D e deps.grafoAFD (ou em window.Raio) para o autômato em 3D.

(function () {
  // Campos do formulário: qual padrão valida cada um.
  const CAMPOS = [
    { padrao: 'placa', rotulo: 'Placa do carro', dica: 'ABC1D23' },
    { padrao: 'CPF', rotulo: 'CPF', dica: '123.456.789-09' },
    { padrao: 'telefone', rotulo: 'Telefone', dica: '(83) 98765-4321' },
    { padrao: 'CEP', rotulo: 'CEP', dica: '58051-900' },
    { padrao: 'data', rotulo: 'Data do acidente', dica: '15/11/2026' },
    { padrao: 'e-mail', rotulo: 'E-mail', dica: 'nome@exemplo.com' },
  ];

  // ---------- Parte sem tela (testada no Node) ----------

  // Classifica o que foi digitado, a partir do resultado de executarAFD.
  // Devolve { estado, mensagem }, com estado 'vazio', 'valido', 'incompleto' ou 'invalido'.
  function estadoCampo(texto, r) {
    if (texto === '') return { estado: 'vazio', mensagem: 'Digite para testar.' };
    // Caractere solto vai entre aspas ('"."'), para não sumir no meio da frase.
    const opcoes = r.esperado.length
      ? r.esperado.map((e) => (Array.from(e).length === 1 ? `"${e}"` : e)).join(' ou ')
      : 'nada';

    if (r.morreuEm !== -1) {
      // Posição contada a partir de 1, que é como as pessoas contam.
      const ch = Array.from(texto)[r.morreuEm];
      const lido = ch === ' ' ? 'espaço' : `"${ch}"`;
      return {
        estado: 'invalido',
        mensagem: `Inválido: o ${lido} na posição ${r.morreuEm + 1} não era esperado. ` +
          (r.esperado.length ? `Ali cabia ${opcoes}.` : 'Ali o texto já devia ter acabado.'),
      };
    }
    if (r.aceita) {
      return { estado: 'valido', mensagem: 'Válido: o autômato leu tudo e parou num estado de aceitação.' };
    }
    return { estado: 'incompleto', mensagem: `Incompleto: até aqui está certo, falta continuar com ${opcoes}.` };
  }

  // ---------- Parte com tela ----------
  //
  // Layout (referência: cardápio com linhas finas + tela azul): os campos são
  // linhas de uma tabela, em duas colunas; embaixo, o cartão azul do raio-x
  // (src/raiox.js) mostra o autômato lendo o campo atual, ao vivo. Duas colunas
  // deixam os campos baixinhos, para o cartão aparecer logo abaixo deles.

  const CSS = `
  .rx-form { max-width: 1120px; margin: 0 auto; }
  .rx-form-corpo { display: grid; grid-template-columns: minmax(0, 1fr); gap: 32px; }
  .rx-campos { margin: 0; padding: 0; border: 0; min-width: 0; border-top: 1.5px solid var(--rx-texto);
    display: grid; grid-template-columns: minmax(0, 1fr); column-gap: 48px; }
  @media (min-width: 900px) { .rx-campos { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
  .rx-linha { display: grid; grid-template-columns: 130px minmax(0, 1fr); column-gap: 16px; row-gap: 4px;
    align-items: center; padding: 14px 0; border-bottom: 1px solid var(--rx-linha); }
  .rx-linha label { font-weight: 700; font-size: 16px; }
  .rx-linha.atual label { color: var(--azul); }
  .rx-linha input { width: 100%; box-sizing: border-box; font: 17px var(--rx-mono); padding: 9px 14px; color: inherit;
    background: var(--rx-campo); border: 1.5px solid var(--rx-linha); border-radius: 999px; }
  .rx-linha input::placeholder { color: var(--rx-mudo); opacity: 0.6; }
  .rx-linha input:focus { outline: none; border-color: var(--azul); }
  .rx-nota { grid-column: 2; font: 600 14px/1.3 var(--rx-fonte); color: var(--rx-mudo); padding-left: 14px; }
  .rx-nota:empty { display: none; }
  .rx-linha[data-estado="valido"] input { border-color: var(--rx-ok); }
  .rx-linha[data-estado="valido"] .rx-nota { color: var(--rx-ok); }
  .rx-linha[data-estado="incompleto"] input { border-color: var(--rx-quase); }
  .rx-linha[data-estado="incompleto"] .rx-nota { color: var(--rx-quase); }
  .rx-linha[data-estado="invalido"] input { border-color: var(--rx-erro); }
  .rx-linha[data-estado="invalido"] .rx-nota { color: var(--rx-erro); }
  .rx-rodape { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-top: 22px; }
  .rx-resumo { margin: 0; font-weight: 700; font-size: 16px; }
  .rx-botoes { display: flex; gap: 10px; }
  @media (max-width: 520px) {
    .rx-linha { grid-template-columns: minmax(0, 1fr); }
    .rx-nota { grid-column: 1; }
  }
  `;

  function injetarCSS() {
    if (document.getElementById('rx-estilo-form')) return;
    const s = document.createElement('style');
    s.id = 'rx-estilo-form';
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
    if (!deps.compilar) throw new Error('montarForm precisa de deps.padroes (com afd) ou deps.compilar');
    // compilar pode devolver o AFD direto ou { er, ast, afn, afd, min } (o do main.js).
    return base.map((p) => { const r = deps.compilar(p.er); return { ...p, afd: r && r.min ? r.min : r }; });
  }

  // Nota curta embaixo do campo (a explicação longa fica no raio-x).
  function nota(estado, r, texto) {
    if (estado === 'vazio') return '';
    if (estado === 'valido') return '✓ Válido';
    if (estado === 'incompleto') return '… Incompleto, falta mais um pouco';
    const c = Array.from(texto)[r.morreuEm];
    return `✗ Inválido: o "${c === ' ' ? 'espaço' : c}" não cabe aqui`;
  }

  function montarForm(container, deps = {}) {
    if (typeof deps.executarAFD !== 'function') throw new Error('montarForm precisa de deps.executarAFD');
    const R = (typeof window !== 'undefined' && window.Raio) || {};
    const criarRaioX = deps.criarRaioX || R.criarRaioX;
    if (typeof criarRaioX !== 'function') throw new Error('montarForm precisa de src/raiox.js carregado');
    injetarCSS();
    const padroes = prepararPadroes(deps);

    container.innerHTML = '';
    const raiz = el('form', 'rx-form rx-tema');
    raiz.noValidate = true;
    const corpo = el('div', 'rx-form-corpo');
    const esquerda = el('div');
    const campos = el('fieldset', 'rx-campos');
    const legenda = el('legend', '', 'Dados do acidente');
    legenda.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)';
    campos.appendChild(legenda);
    const rodape = el('div', 'rx-rodape');
    const resumo = el('p', 'rx-resumo');
    resumo.setAttribute('aria-live', 'polite');
    const botoes = el('div', 'rx-botoes');
    const limpar = el('button', 'rx-pilula', 'Limpar');
    limpar.type = 'button';
    const enviar = el('button', 'rx-pilula cheia', 'Enviar');
    enviar.type = 'submit';
    botoes.append(limpar, enviar);
    rodape.append(resumo, botoes);
    esquerda.append(campos, rodape);
    const painel = el('div');
    corpo.append(esquerda, painel);
    raiz.append(
      R.cabecalho ? R.cabecalho('Formulário', 'Cada campo é conferido por um autômato enquanto você digita.') : '',
      corpo,
    );
    container.appendChild(raiz);

    const raiox = criarRaioX(painel, { Viz3D: deps.Viz3D || R.Viz3D, grafoAFD: deps.grafoAFD || R.grafoAFD });
    const linhas = []; // { campo, padrao, linha, input, estado, resultado }
    let atual = null;

    function atualizarResumo() {
      const validos = linhas.filter((l) => l.estado === 'valido').length;
      resumo.textContent = validos === linhas.length
        ? 'Tudo certo, pode enviar.'
        : `${validos} de ${linhas.length} campos válidos`;
      enviar.disabled = validos !== linhas.length;
    }

    // Mostra no raio-x o campo escolhido. Ao trocar de campo, percorre o caminho inteiro;
    // enquanto digita no mesmo campo, só o passo novo anda.
    function mostrarNoPainel(l, animar) {
      if (atual && atual !== l) atual.linha.classList.remove('atual');
      atual = l;
      l.linha.classList.add('atual');
      raiox.mostrar({ padrao: l.padrao, texto: l.input.value, resultado: l.resultado, modo: animar });
    }

    CAMPOS.forEach((c, i) => {
      const padrao = padroes.find((p) => p.nome === c.padrao);
      if (!padrao) return;

      const linha = el('div', 'rx-linha');
      const id = 'rx-campo-' + i;
      const label = el('label', '', c.rotulo);
      label.htmlFor = id;
      const input = el('input');
      input.id = id;
      input.placeholder = 'ex.: ' + c.dica;
      input.autocomplete = 'off';
      input.spellcheck = false;
      const n = el('div', 'rx-nota');
      linha.append(label, input, n);
      campos.appendChild(linha);
      const l = { campo: c, padrao, linha, input, estado: 'vazio', resultado: null };
      linhas.push(l);

      l.validar = function validar() {
        // Placa: converte para maiúscula enquanto digita, sem tirar o cursor do lugar.
        if (padrao.maiusculas && input.value !== input.value.toUpperCase()) {
          const a = input.selectionStart, b = input.selectionEnd;
          input.value = input.value.toUpperCase();
          input.setSelectionRange(a, b);
        }
        const texto = input.value;
        l.resultado = deps.executarAFD(padrao.afd, texto);
        const { estado, mensagem } = estadoCampo(texto, l.resultado);
        l.estado = estado;
        linha.dataset.estado = estado;
        n.textContent = nota(estado, l.resultado, texto);
        input.setAttribute('aria-invalid', String(estado === 'invalido'));
        input.title = estado === 'vazio' ? '' : mensagem;
        atualizarResumo();
      };

      input.addEventListener('input', () => { l.validar(); mostrarNoPainel(l, 'ultimo'); });
      input.addEventListener('focus', () => { if (atual !== l) mostrarNoPainel(l, 'tudo'); });
      l.validar();
    });

    limpar.onclick = () => {
      for (const l of linhas) { l.input.value = ''; l.validar(); }
      if (linhas.length) mostrarNoPainel(linhas[0], 'tudo');
    };
    raiz.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!enviar.disabled) resumo.textContent = 'Enviado! Todos os campos passaram pelos autômatos.';
    });

    if (linhas.length) mostrarNoPainel(linhas[0], 'tudo');
    atualizarResumo();
  }

  const api = { montarForm, estadoCampo, CAMPOS };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
