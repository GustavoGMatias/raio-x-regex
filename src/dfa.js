// AFD: construção dos subconjuntos, execução com motivo, minimização e grafo.
// Formatos em docs/CONTRATOS.md.
//
// Lembrete do contrato: o estado morto NÃO aparece no AFD. Se um estado não tem
// transição para um caractere, ler esse caractere leva ao morto (a cadeia morre).

(function () {
  // ---------- Rótulos curtos para conjuntos de caracteres ----------
  // Junta caracteres seguidos em faixas: {a,b,c,d,x} vira "[a-dx]".
  function nomear(c) { return c === ' ' ? '␣' : c; }
  function escapar(c) { return c === ' ' ? '␣' : '-]^\\'.includes(c) ? '\\' + c : c; }

  function rotulo(chars) {
    const lista = [...chars];
    if (lista.length === 0) return '∅';
    if (lista.length === 1) return nomear(lista[0]);
    const cods = lista.map((c) => c.codePointAt(0)).sort((a, b) => a - b);
    const partes = [];
    let temFaixa = false;
    for (let i = 0; i < cods.length;) {
      let j = i;
      while (j + 1 < cods.length && cods[j + 1] === cods[j] + 1) j++;
      const a = escapar(String.fromCodePoint(cods[i]));
      const b = escapar(String.fromCodePoint(cods[j]));
      if (j - i >= 2) { partes.push(`${a}-${b}`); temFaixa = true; }
      else if (j > i) partes.push(a + b);
      else partes.push(a);
      i = j + 1;
    }
    // Poucos caracteres soltos ficam como "a, b"; o resto vira classe "[...]".
    if (!temFaixa && lista.length <= 3) {
      return cods.map((c) => nomear(String.fromCodePoint(c))).join(', ');
    }
    return '[' + partes.join('') + ']';
  }

  // Agrupa as transições de um estado por destino: Map<destino, caracteres[]>.
  function porDestino(mapa) {
    const grupos = new Map();
    for (const [ch, para] of mapa) {
      if (!grupos.has(para)) grupos.set(para, []);
      grupos.get(para).push(ch);
    }
    return grupos;
  }

  // ---------- Fecho-ε ----------
  // Todos os estados do AFN alcançáveis a partir de `estados` só por movimentos vazios.
  // Devolve um vetor ordenado (a ordem fixa serve de "nome" do subconjunto).
  function fechoConjunto(afn, estados) {
    const visto = new Set(estados);
    const pilha = [...estados];
    while (pilha.length) {
      const q = pilha.pop();
      for (const p of afn.trans[q].eps) {
        if (!visto.has(p)) { visto.add(p); pilha.push(p); }
      }
    }
    return [...visto].sort((a, b) => a - b);
  }

  // Estados do AFN alcançados ao ler `ch` a partir de `estados` (sem o fecho).
  function moverConjunto(afn, estados, ch) {
    const r = new Set();
    for (const q of estados) {
      for (const m of afn.trans[q].mov) if (m.set.has(ch)) r.add(m.to);
    }
    return [...r];
  }

  // ---------- AFN -> AFD (construção dos subconjuntos) ----------
  // Cada estado do AFD é um CONJUNTO de estados do AFN: "todos os lugares onde o AFN
  // poderia estar ao mesmo tempo". Começa no fecho-ε do início e, para cada caractere,
  // calcula fecho-ε(moverConjunto(S, c)). Conjunto vazio = estado morto, que não é guardado.
  function afnParaAFD(afn) {
    // Só interessam os caracteres que aparecem em alguma transição do AFN.
    const simbolosSet = new Set();
    for (const t of afn.trans) for (const m of t.mov) for (const c of m.set) simbolosSet.add(c);
    const simbolos = [...simbolosSet].sort();

    const subconjuntos = [];
    const trans = [];
    const indice = new Map(); // "0,1,4" -> número do estado do AFD
    const chave = (S) => S.join(',');

    function obter(S) {
      const k = chave(S);
      if (!indice.has(k)) {
        indice.set(k, subconjuntos.length);
        subconjuntos.push(S);
        trans.push(new Map());
        fila.push(S);
      }
      return indice.get(k);
    }

    const fila = [];
    const start = obter(fechoConjunto(afn, [afn.start]));
    while (fila.length) {
      const S = fila.shift();
      const de = indice.get(chave(S));
      for (const c of simbolos) {
        const alvo = moverConjunto(afn, S, c);
        if (alvo.length === 0) continue; // morto: não guarda
        trans[de].set(c, obter(fechoConjunto(afn, alvo)));
      }
    }

    const aceita = new Set();
    subconjuntos.forEach((S, i) => { if (S.includes(afn.accept)) aceita.add(i); });

    return { n: subconjuntos.length, start, aceita, trans, simbolos, subconjuntos };
  }

  // ---------- Execução ----------
  // Devolve { caminho, morreuEm, aceita, esperado }.
  //   caminho:  estados visitados, começando pelo inicial
  //   morreuEm: índice do caractere sem transição, ou -1
  //   esperado: rótulos das transições do estado onde morreu (ou onde terminou)
  function executarAFD(afd, cadeia) {
    let q = afd.start;
    const caminho = [q];
    const chars = Array.from(cadeia);
    let morreuEm = -1;
    for (let i = 0; i < chars.length; i++) {
      const prox = afd.trans[q].get(chars[i]);
      if (prox === undefined) { morreuEm = i; break; }
      q = prox;
      caminho.push(q);
    }
    const esperado = [...porDestino(afd.trans[q]).values()].map(rotulo);
    const aceita = morreuEm === -1 ? afd.aceita.has(q) : !!afd.aceitaMorto;
    return { caminho, morreuEm, aceita, esperado };
  }

  // Frase em português explicando o resultado de executarAFD (para a interface).
  function motivo(afd, cadeia, r = executarAFD(afd, cadeia)) {
    const chars = Array.from(cadeia);
    const ult = r.caminho[r.caminho.length - 1];
    const opcoes = r.esperado.length ? r.esperado.join(' ou ') : 'nada';
    if (r.morreuEm !== -1) {
      const lido = chars[r.morreuEm] === ' ' ? '␣' : chars[r.morreuEm];
      const base = `Na posição ${r.morreuEm}, o estado q${ult} não tem transição com '${lido}' ` +
        `(esperava ${opcoes}), então a cadeia foi para o estado morto.`;
      return r.aceita ? base + ' Neste autômato, o estado morto é de aceitação.' : base;
    }
    if (r.aceita) return `Leu a cadeia inteira e parou em q${ult}, que é de aceitação.`;
    return `Leu a cadeia inteira mas parou em q${ult}, que não é de aceitação` +
      (r.esperado.length ? ` (ainda faltava ler ${opcoes}).` : '.');
  }

  // ---------- Grafo para o desenho ----------
  // Transições entre o mesmo par de estados viram uma aresta só ("a, b" ou "[A-Z]").
  function grafoAFD(afd) {
    const states = [];
    for (let id = 0; id < afd.n; id++) {
      states.push({ id, label: 'q' + id, start: id === afd.start, accept: afd.aceita.has(id) });
    }
    const edges = [];
    for (let de = 0; de < afd.n; de++) {
      for (const [para, chars] of porDestino(afd.trans[de])) {
        edges.push({ from: de, to: para, label: rotulo(chars) });
      }
    }
    return { states, edges };
  }

  const api = { afnParaAFD, executarAFD, motivo, grafoAFD, fechoConjunto, moverConjunto, rotulo, porDestino };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
