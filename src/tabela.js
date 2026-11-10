// Tabela da conversão AFN -> AFD (ou AFD -> mínimo): estado, conteúdo e transições.
//
//   montarTabela(container, afd, { aoSelecionar })
//
// Para não virar uma tabela com 90 colunas (uma por caractere), símbolos que se
// comportam IGUAL em todos os estados viram uma coluna só. Ex.: na placa, as 26
// letras sempre levam ao mesmo lugar, então aparecem como uma coluna "[A-Z]".

(function () {
  const emNode = typeof module !== 'undefined' && module.exports;

  function rotulo(chars) {
    const r = emNode ? require('./dfa').rotulo : (typeof window !== 'undefined' && window.Raio && window.Raio.rotulo);
    return r ? r(chars) : [...chars].join(', ');
  }

  // ---------- Dados (função pura, testável no Node) ----------
  // Devolve { colunas: string[], linhas: [{ estado, inicial, aceita, conteudo, destinos }] }.
  //   conteudo: estados do AFN (subconjuntos) ou do AFD original (classes), ou null
  //   destinos[j]: estado de destino na coluna j, ou null (vai para o morto)
  function dadosTabela(afd) {
    const simbolos = new Set();
    for (const m of afd.trans) for (const c of m.keys()) simbolos.add(c);

    // Agrupa símbolos pela "assinatura": para onde levam a partir de cada estado.
    const grupos = new Map();
    for (const c of [...simbolos].sort()) {
      const ass = afd.trans.map((m) => (m.has(c) ? m.get(c) : '-')).join(',');
      if (!grupos.has(ass)) grupos.set(ass, []);
      grupos.get(ass).push(c);
    }
    const colunas = [...grupos.values()];

    const conteudoDe = afd.subconjuntos || afd.classes || null;
    const linhas = [];
    for (let q = 0; q < afd.n; q++) {
      linhas.push({
        estado: q,
        inicial: q === afd.start,
        aceita: afd.aceita.has(q),
        conteudo: conteudoDe ? conteudoDe[q] : null,
        destinos: colunas.map((cs) => (afd.trans[q].has(cs[0]) ? afd.trans[q].get(cs[0]) : null)),
      });
    }
    return {
      colunas: colunas.map(rotulo),
      tipoConteudo: afd.subconjuntos ? 'afn' : afd.classes ? 'afd' : null,
      linhas,
    };
  }

  // ---------- Estilo (injetado uma vez) ----------
  const CSS = `
.rx-tabela { overflow: auto; max-width: 100%; }
.rx-tabela table { border-collapse: collapse; font: 14px ui-monospace, monospace; }
.rx-tabela th, .rx-tabela td { border: 1px solid var(--rx-linha, #c8ced8); padding: 4px 10px; text-align: center; white-space: nowrap; }
.rx-tabela thead th { background: var(--rx-cab, #eef1f6); }
.rx-tabela td.morto { color: var(--rx-fraco, #9aa3b2); }
.rx-tabela td.conteudo { text-align: left; }
.rx-tabela tbody tr { cursor: pointer; }
.rx-tabela tbody tr:hover { background: var(--rx-hover, #f6f8fb); }
.rx-tabela tr.destacado { background: var(--rx-destaque-fundo, #ffe8d6); }
.rx-tabela .aceita { font-weight: 700; }
@media (prefers-color-scheme: dark) {
  .rx-tabela { --rx-linha: #3c4454; --rx-cab: #232a36; --rx-fraco: #6f7889; --rx-hover: #1f2530; --rx-destaque-fundo: #4a2a12; }
}`;

  function injetarEstilo(doc) {
    if (doc.getElementById('rx-tabela-estilo')) return;
    const st = doc.createElement('style');
    st.id = 'rx-tabela-estilo';
    st.textContent = CSS;
    doc.head.appendChild(st);
  }

  // ---------- Montagem no navegador ----------
  // Na coluna "estado": → marca o inicial e * marca os de aceitação (notação de livro).
  function montarTabela(container, afd, opcoes = {}) {
    const { aoSelecionar = () => {} } = opcoes;
    const doc = container.ownerDocument;
    injetarEstilo(doc);
    container.innerHTML = '';
    container.classList.add('rx-tabela');

    const dados = dadosTabela(afd);
    const tabela = doc.createElement('table');
    const cab = doc.createElement('thead');
    const trCab = doc.createElement('tr');
    const titulos = ['estado'];
    if (dados.tipoConteudo === 'afn') titulos.push('estados do AFN');
    if (dados.tipoConteudo === 'afd') titulos.push('estados do AFD');
    for (const t of [...titulos, ...dados.colunas]) {
      const th = doc.createElement('th');
      th.textContent = t;
      trCab.appendChild(th);
    }
    cab.appendChild(trCab);
    tabela.appendChild(cab);

    const corpo = doc.createElement('tbody');
    const linhasDom = [];
    for (const l of dados.linhas) {
      const tr = doc.createElement('tr');
      const td = (texto, classe) => {
        const c = doc.createElement('td');
        c.textContent = texto;
        if (classe) c.className = classe;
        tr.appendChild(c);
      };
      td((l.inicial ? '→ ' : '') + (l.aceita ? '*' : '') + 'q' + l.estado, l.aceita ? 'aceita' : '');
      if (dados.tipoConteudo) td('{' + l.conteudo.join(', ') + '}', 'conteudo');
      for (const d of l.destinos) td(d === null ? '—' : 'q' + d, d === null ? 'morto' : '');
      tr.title = l.destinos.includes(null) ? '— = vai para o estado morto' : '';
      tr.addEventListener('click', () => aoSelecionar(l.estado));
      corpo.appendChild(tr);
      linhasDom.push(tr);
    }
    tabela.appendChild(corpo);
    container.appendChild(tabela);

    function destacar(estados) {
      const acesos = new Set(estados || []);
      linhasDom.forEach((tr, q) => tr.classList.toggle('destacado', acesos.has(q)));
    }
    return { destacar };
  }

  const api = { montarTabela, dadosTabela };
  if (emNode) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
