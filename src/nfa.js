// AFN por construção de Thompson, simulação passo a passo e grafo para o desenho.
// Formatos em docs/CONTRATOS.md.

(function () {
  const ALFABETO = typeof module !== 'undefined' && module.exports
    ? require('./parser').ALFABETO
    : window.Raio.ALFABETO;

  // ---------- Construção de Thompson ----------
  // Cada pedaço da AST vira um fragmento com um estado inicial e um final.
  function construirAFN(ast) {
    const trans = [];
    const novo = () => { trans.push({ eps: [], mov: [] }); return trans.length - 1; };
    const eps = (de, para) => trans[de].eps.push(para);

    function montar(no) {
      switch (no.t) {
        case 'eps': {
          const s = novo(), f = novo();
          eps(s, f);
          return { s, f };
        }
        case 'char': {
          const s = novo(), f = novo();
          trans[s].mov.push({ set: new Set(no.set), to: f });
          return { s, f };
        }
        case 'cat': {
          const A = montar(no.a), B = montar(no.b);
          eps(A.f, B.s);
          return { s: A.s, f: B.f };
        }
        case 'alt': {
          const s = novo();
          const A = montar(no.a), B = montar(no.b);
          const f = novo();
          eps(s, A.s); eps(s, B.s);
          eps(A.f, f); eps(B.f, f);
          return { s, f };
        }
        case 'star': {
          const s = novo();
          const A = montar(no.a);
          const f = novo();
          eps(s, A.s); eps(s, f);
          eps(A.f, A.s); eps(A.f, f);
          return { s, f };
        }
        default:
          throw new Error(`nó de AST desconhecido: ${no.t}`);
      }
    }

    const { s, f } = montar(ast);
    return { n: trans.length, start: s, accept: f, trans };
  }

  // ---------- Simulação ----------
  // Fecho-ε de um conjunto de estados. Devolve também as arestas ε percorridas
  // (para o visual animar a "divisão" das bolinhas).
  function fechoEps(afn, estados) {
    const visto = new Set(estados);
    const pilha = [...estados];
    const arestas = [];
    while (pilha.length) {
      const q = pilha.pop();
      for (const p of afn.trans[q].eps) {
        arestas.push({ de: q, para: p });
        if (!visto.has(p)) { visto.add(p); pilha.push(p); }
      }
    }
    return { estados: [...visto].sort((a, b) => a - b), arestas };
  }

  // Devolve { inicial, passos, aceita }.
  //   inicial: estados ativos antes de ler qualquer símbolo (fecho-ε do início)
  //   passos[k] (um por caractere lido, até a cadeia morrer):
  //     ch:      o caractere lido
  //     consome: [{ de, para }] transições que consumiram `ch`
  //     mid:     estados logo após consumir, antes do fecho-ε
  //     eps:     [{ de, para }] arestas ε percorridas no fecho
  //     depois:  estados ativos ao fim do passo (fecho-ε de mid)
  //   Se `depois` ficar vazio a cadeia morreu; o traço para ali.
  function tracoAFN(afn, cadeia) {
    const ini = fechoEps(afn, [afn.start]);
    let ativos = ini.estados;
    const passos = [];
    for (const ch of Array.from(cadeia)) {
      const consome = [];
      const mid = new Set();
      for (const q of ativos) {
        for (const m of afn.trans[q].mov) {
          if (m.set.has(ch)) { consome.push({ de: q, para: m.to }); mid.add(m.to); }
        }
      }
      const midOrd = [...mid].sort((a, b) => a - b);
      const fc = fechoEps(afn, midOrd);
      passos.push({ ch, consome, mid: midOrd, eps: fc.arestas, depois: fc.estados });
      ativos = fc.estados;
      if (ativos.length === 0) break;
    }
    return { inicial: ini.estados, passos, aceita: ativos.includes(afn.accept) };
  }

  // ---------- Grafo para o desenho ----------
  // Escreve um conjunto de caracteres de forma curta: "a", "a, b", "[a-z]", ".", "[^0-9]".
  function rotuloConjunto(set) {
    if (set.size === 0) return '∅';
    if (set.size >= ALFABETO.size) return '.';
    const comp = new Set();
    for (const c of ALFABETO) if (!set.has(c)) comp.add(c);
    if (set.size > comp.size && comp.size > 0) return '[^' + faixas(comp) + ']';
    if (set.size === 1) return nomear([...set][0]);
    const f = faixas(set);
    return set.size <= 3 && !/-/.test(f.replace(/\\-/g, '')) ? [...set].sort().map(nomear).join(', ') : '[' + f + ']';
  }

  function nomear(c) { return c === ' ' ? '␣' : c; }

  function faixas(set) {
    const cods = [...set].map((c) => c.codePointAt(0)).sort((a, b) => a - b);
    const partes = [];
    for (let i = 0; i < cods.length;) {
      let j = i;
      while (j + 1 < cods.length && cods[j + 1] === cods[j] + 1) j++;
      const a = esc(String.fromCodePoint(cods[i])), b = esc(String.fromCodePoint(cods[j]));
      partes.push(j - i >= 2 ? `${a}-${b}` : j - i === 1 ? a + b : a);
      i = j + 1;
    }
    return partes.join('');
  }

  function esc(c) { return c === ' ' ? '␣' : '-]^\\'.includes(c) ? '\\' + c : c; }

  // Transições com o mesmo par (de, para) viram uma aresta só.
  function grafoAFN(afn) {
    const states = [];
    for (let id = 0; id < afn.n; id++) {
      states.push({ id, label: 'q' + id, start: id === afn.start, accept: id === afn.accept });
    }
    const edges = [];
    for (let de = 0; de < afn.n; de++) {
      const porDestino = new Map(); // para -> { eps, chars:Set }
      const pegar = (para) => {
        if (!porDestino.has(para)) porDestino.set(para, { eps: false, chars: new Set() });
        return porDestino.get(para);
      };
      for (const p of afn.trans[de].eps) pegar(p).eps = true;
      for (const m of afn.trans[de].mov) for (const c of m.set) pegar(m.to).chars.add(c);
      for (const [para, d] of porDestino) {
        const partes = [];
        if (d.eps) partes.push('ε');
        if (d.chars.size) partes.push(rotuloConjunto(d.chars));
        edges.push({ from: de, to: para, label: partes.join(', ') });
      }
    }
    return { states, edges };
  }

  const api = { construirAFN, fechoEps, tracoAFN, grafoAFN, rotuloConjunto };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
