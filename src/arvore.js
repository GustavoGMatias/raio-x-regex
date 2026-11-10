// Desenho 2D da árvore sintática (AST) em SVG, com clique e destaque.
// Formato da AST em docs/CONTRATOS.md.
//
//   const arv = montarArvore(container, ast, { aoSelecionar, er });
//   arv.destacar([3, 4]);   // acende os nós 3 e 4
//
// aoSelecionar(id, idsDaSubarvore) é chamado no clique. O segundo parâmetro traz o
// nó e todos os seus descendentes, que é o que o painel precisa para acender o
// pedaço inteiro do AFN que aquele nó gerou.

(function () {
  const emNode = typeof module !== 'undefined' && module.exports;
  const SVG = 'http://www.w3.org/2000/svg';

  const ESPACO_X = 52;   // distância horizontal entre folhas
  const ESPACO_Y = 64;   // distância entre níveis
  const RAIO = 19;
  const MARGEM = 28;

  const NOMES = {
    eps: 'ε (cadeia vazia)',
    char: 'símbolo',
    cat: 'concatenação',
    alt: 'união (|)',
    star: 'fecho de Kleene (*)',
  };

  function rotuloConjunto(set) {
    const r = emNode ? require('./dfa').rotulo : (typeof window !== 'undefined' && window.Raio && window.Raio.rotulo);
    return r ? r(set) : [...set].join('');
  }

  // Texto que aparece dentro do círculo.
  function textoDoNo(no) {
    switch (no.t) {
      case 'eps': return 'ε';
      case 'cat': return '·';
      case 'alt': return '|';
      case 'star': return '*';
      case 'char': return rotuloConjunto(no.set);
      default: return '?';
    }
  }

  function filhos(no) {
    if (no.t === 'cat' || no.t === 'alt') return [no.a, no.b];
    if (no.t === 'star') return [no.a];
    return [];
  }

  // ---------- Layout (função pura, testável no Node) ----------
  // Cada folha ganha a próxima coluna livre, da esquerda para a direita; um nó
  // interno fica no meio dos filhos. A linha é a profundidade. Assim nenhuma
  // aresta se cruza e a leitura da esquerda para a direita segue a ER.
  // Devolve { nos: [{ id, x, y, texto, tipo, trecho, pai, no }], largura, altura }.
  function layoutArvore(ast) {
    const nos = [];
    let proximaColuna = 0;
    let proximoId = 1;
    const usados = new Set();
    (function coletar(no) { if (no.id != null) usados.add(no.id); filhos(no).forEach(coletar); })(ast);
    const novoId = () => { while (usados.has(proximoId)) proximoId++; usados.add(proximoId); return proximoId; };

    let maxProf = 0;
    function visitar(no, prof, pai) {
      const id = no.id != null ? no.id : novoId();
      const item = { id, x: 0, y: prof, texto: textoDoNo(no), tipo: no.t, trecho: no.trecho || null, pai, no };
      nos.push(item);
      maxProf = Math.max(maxProf, prof);
      const fs = filhos(no).map((f) => visitar(f, prof + 1, id));
      item.x = fs.length ? (fs[0].x + fs[fs.length - 1].x) / 2 : proximaColuna++;
      return item;
    }
    visitar(ast, 0, null);

    for (const n of nos) {
      n.x = MARGEM + RAIO + n.x * ESPACO_X;
      n.y = MARGEM + RAIO + n.y * ESPACO_Y;
    }
    return {
      nos,
      largura: 2 * (MARGEM + RAIO) + Math.max(0, proximaColuna - 1) * ESPACO_X,
      altura: 2 * (MARGEM + RAIO) + maxProf * ESPACO_Y,
    };
  }

  // ids de um nó e de todos os descendentes.
  function idsDaSubarvore(layout, id) {
    const r = [id];
    for (let i = 0; i < r.length; i++) {
      for (const n of layout.nos) if (n.pai === r[i]) r.push(n.id);
    }
    return r;
  }

  // ---------- Estilo (injetado uma vez) ----------
  const CSS = `
.rx-arvore { overflow: auto; max-width: 100%; }
.rx-arvore svg { display: block; font-family: system-ui, sans-serif; }
.rx-arvore .aresta { stroke: var(--rx-linha, #9aa3b2); stroke-width: 1.6; transition: stroke .15s; }
.rx-arvore .no { cursor: pointer; }
.rx-arvore .no circle { fill: var(--rx-no, #ffffff); stroke: var(--rx-borda, #5b6577); stroke-width: 1.6; transition: fill .15s, stroke .15s; }
.rx-arvore .no.folha circle { fill: var(--rx-folha, #eef4ff); }
.rx-arvore .no text { fill: var(--rx-texto, #1d2330); font-size: 13px; text-anchor: middle; dominant-baseline: central; pointer-events: none; }
.rx-arvore .no text.op { font-size: 17px; font-weight: 700; }
.rx-arvore .no .id { fill: var(--rx-fraco, #8a93a3); font-size: 9px; }
.rx-arvore .no:hover circle { stroke: var(--rx-destaque, #e8590c); }
.rx-arvore .no.destacado circle { fill: var(--rx-destaque-fundo, #ffe8d6); stroke: var(--rx-destaque, #e8590c); stroke-width: 2.4; }
.rx-arvore .aresta.destacada { stroke: var(--rx-destaque, #e8590c); stroke-width: 2.4; }
.rx-arvore .no.selecionado circle { stroke-width: 3.5; }
@media (prefers-color-scheme: dark) {
  .rx-arvore { --rx-linha: #5d6678; --rx-no: #1f2430; --rx-folha: #1b2a40; --rx-borda: #aab3c5;
    --rx-texto: #e8ecf3; --rx-fraco: #7d8697; --rx-destaque: #ff922b; --rx-destaque-fundo: #4a2a12; }
}`;

  function injetarEstilo(doc) {
    if (doc.getElementById('rx-arvore-estilo')) return;
    const st = doc.createElement('style');
    st.id = 'rx-arvore-estilo';
    st.textContent = CSS;
    doc.head.appendChild(st);
  }

  function el(doc, nome, attrs = {}) {
    const e = doc.createElementNS(SVG, nome);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  }

  // ---------- Montagem no navegador ----------
  function montarArvore(container, ast, opcoes = {}) {
    const { aoSelecionar = () => {}, er = null } = opcoes;
    const doc = container.ownerDocument;
    injetarEstilo(doc);
    container.innerHTML = '';
    container.classList.add('rx-arvore');

    const layout = layoutArvore(ast);
    const svg = el(doc, 'svg', {
      width: layout.largura, height: layout.altura,
      viewBox: `0 0 ${layout.largura} ${layout.altura}`, role: 'img',
      'aria-label': 'Árvore sintática da expressão regular',
    });

    const porId = new Map(layout.nos.map((n) => [n.id, n]));
    const arestas = new Map(); // id do filho -> <line>
    const grupos = new Map();  // id -> <g>

    // Arestas primeiro, para ficarem por baixo dos círculos.
    for (const n of layout.nos) {
      if (n.pai == null) continue;
      const p = porId.get(n.pai);
      const linha = el(doc, 'line', { class: 'aresta', x1: p.x, y1: p.y, x2: n.x, y2: n.y });
      svg.appendChild(linha);
      arestas.set(n.id, linha);
    }

    for (const n of layout.nos) {
      const folha = n.tipo === 'char' || n.tipo === 'eps';
      const g = el(doc, 'g', { class: 'no' + (folha ? ' folha' : ''), 'data-id': n.id, tabindex: 0 });
      g.appendChild(el(doc, 'circle', { cx: n.x, cy: n.y, r: RAIO }));

      const curto = n.texto.length > 6 ? n.texto.slice(0, 5) + '…' : n.texto;
      const t = el(doc, 'text', { x: n.x, y: n.y, class: folha ? '' : 'op' });
      t.textContent = curto;
      g.appendChild(t);

      const tid = el(doc, 'text', { x: n.x + RAIO + 2, y: n.y - RAIO + 2, class: 'id' });
      tid.textContent = n.id;
      g.appendChild(tid);

      // Dica ao passar o mouse: tipo do nó, conteúdo e o trecho da ER que ele representa.
      const dica = el(doc, 'title');
      let txt = `#${n.id} ${NOMES[n.tipo] || n.tipo}`;
      if (n.tipo === 'char') txt += `: ${n.texto}`;
      if (er && n.trecho) txt += `\ntrecho: ${er.slice(n.trecho[0], n.trecho[1])}`;
      dica.textContent = txt;
      g.appendChild(dica);

      const escolher = () => {
        for (const outro of grupos.values()) outro.classList.remove('selecionado');
        g.classList.add('selecionado');
        aoSelecionar(n.id, idsDaSubarvore(layout, n.id));
      };
      g.addEventListener('click', escolher);
      g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); escolher(); } });

      svg.appendChild(g);
      grupos.set(n.id, g);
    }

    container.appendChild(svg);

    // Acende os nós pedidos (e as arestas entre dois nós acesos).
    function destacar(ids) {
      const acesos = new Set(ids || []);
      for (const [id, g] of grupos) g.classList.toggle('destacado', acesos.has(id));
      for (const [id, linha] of arestas) {
        linha.classList.toggle('destacada', acesos.has(id) && acesos.has(porId.get(id).pai));
      }
    }

    return { destacar, layout };
  }

  const api = { montarArvore, layoutArvore, idsDaSubarvore };
  if (emNode) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
