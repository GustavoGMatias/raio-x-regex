// AFN por construção de Thompson, simulação passo a passo e grafo para o desenho.
// Formatos em docs/CONTRATOS.md.

(function () {
  const ALFABETO = typeof module !== 'undefined' && module.exports
    ? require('./parser').ALFABETO
    : window.Raio.ALFABETO;

  // ---------- Construção de Thompson ----------
  // Cada pedaço da AST vira um fragmento com um estado inicial e um final.
  // A construção é feita num lugar só, que devolve o AFN e também os passos
  // (um por nó, na ordem em que a árvore é montada: filhos antes do pai).
  function montarAFN(ast) {
    const trans = [];
    const origem = [];   // origem[s] = id do nó da AST que criou o estado s
    const passos = [];
    const novo = (no) => { trans.push({ eps: [], mov: [] }); origem.push(no.id); return trans.length - 1; };
    const eps = (de, para) => trans[de].eps.push(para);
    const q = (s) => 'q' + s;

    function montar(no) {
      let frag;
      let texto;
      let operador;
      const criados = [];
      const criar = () => { const s = novo(no); criados.push(s); return s; };
      switch (no.t) {
        case 'eps': {
          const s = criar(), f = criar();
          eps(s, f);
          frag = { s, f };
          operador = 'ε';
          texto = `Fragmento vazio: ${q(s)} liga a ${q(f)} por um movimento vazio (ε), sem ler nenhum caractere.`;
          break;
        }
        case 'char': {
          const s = criar(), f = criar();
          trans[s].mov.push({ set: new Set(no.set), to: f });
          frag = { s, f };
          operador = rotuloConjunto(no.set);
          texto = `Fragmento para ${operador}: ${q(s)} lê ${operador} e vai para ${q(f)}.`;
          break;
        }
        case 'cat': {
          const A = montar(no.a), B = montar(no.b);
          eps(A.f, B.s);
          frag = { s: A.s, f: B.f };
          operador = 'concatenação';
          texto = `Concatenação: o final do primeiro fragmento (${q(A.f)}) liga por ε ao início do segundo (${q(B.s)}). Não cria estados novos.`;
          break;
        }
        case 'alt': {
          const s = criar();
          const A = montar(no.a), B = montar(no.b);
          const f = criar();
          eps(s, A.s); eps(s, B.s);
          eps(A.f, f); eps(B.f, f);
          frag = { s, f };
          operador = '|';
          texto = `União: o novo início ${q(s)} se divide por ε nos dois fragmentos (${q(A.s)} e ${q(B.s)}), e os finais deles (${q(A.f)} e ${q(B.f)}) se juntam no novo final ${q(f)}.`;
          break;
        }
        case 'star': {
          const s = criar();
          const A = montar(no.a);
          const f = criar();
          eps(s, A.s); eps(s, f);
          eps(A.f, A.s); eps(A.f, f);
          frag = { s, f };
          operador = '*';
          texto = `Estrela: o novo início ${q(s)} pode pular o fragmento (ε direto para ${q(f)}) ou entrar nele (${q(A.s)}); ao terminar, ${q(A.f)} volta ao início do fragmento para repetir ou sai para ${q(f)}.`;
          break;
        }
        default:
          throw new Error(`nó de AST desconhecido: ${no.t}`);
      }
      passos.push({ noId: no.id, operador, texto, estados: criados });
      return frag;
    }

    const { s, f } = montar(ast);
    return { afn: { n: trans.length, start: s, accept: f, trans, origem }, passos };
  }

  function construirAFN(ast) {
    return montarAFN(ast).afn;
  }

  // A construção fragmento por fragmento: [ { noId, operador, texto, estados } ].
  //   noId:     id do nó da AST que está sendo construído
  //   operador: 'ε', o conjunto de caracteres (ex.: 'a', '[a-z]'), 'concatenação', '|' ou '*'
  //   texto:    frase curta em português dizendo o que acontece
  //   estados:  estados do AFN criados nesse passo (vazio na concatenação, que só liga fragmentos)
  function passosThompson(ast) {
    return montarAFN(ast).passos;
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

  // Devolve { inicial, passos, aceita, morreuEm }.
  //   morreuEm: índice do caractere em que não sobrou nenhum estado ativo, ou -1
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
    const morreuEm = ativos.length === 0 ? passos.length - 1 : -1;
    return { inicial: ini.estados, passos, aceita: ativos.includes(afn.accept), morreuEm };
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

  const api = { construirAFN, passosThompson, fechoEps, tracoAFN, grafoAFN, rotuloConjunto };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
