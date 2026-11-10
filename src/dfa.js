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

  // ---------- Minimização ----------
  // Ideia: dois estados são EQUIVALENTES se, para toda cadeia w, ou os dois aceitam w
  // ou os dois rejeitam. Estados equivalentes podem virar um só.
  //
  // Passos:
  //   1. Joga fora os estados inalcançáveis (BFS a partir do início).
  //   2. Coloca o estado morto como um estado de verdade (completa o AFD).
  //   3. Refinamento de partições (algoritmo de Moore): começa com dois grupos,
  //      {aceita} e {não aceita}, e vai separando estados do mesmo grupo que levam a
  //      grupos diferentes com algum símbolo. Quando nada mais se separa, cada grupo
  //      é um estado do AFD mínimo.
  //   4. O grupo do morto sai do resultado (junto com qualquer estado que não chega
  //      mais em aceitação, porque ele é equivalente ao morto).
  //
  // `classes[i]` diz quais estados do AFD original foram juntados no estado i do mínimo.
  function minimizar(afd) {
    // 1. Alcançáveis.
    const alcancavel = [afd.start];
    const visto = new Set([afd.start]);
    for (let k = 0; k < alcancavel.length; k++) {
      for (const para of afd.trans[alcancavel[k]].values()) {
        if (!visto.has(para)) { visto.add(para); alcancavel.push(para); }
      }
    }
    const simbolosSet = new Set();
    for (const q of alcancavel) for (const c of afd.trans[q].keys()) simbolosSet.add(c);
    const simbolos = [...simbolosSet].sort();

    // 2. Índices 0..R-1 são os estados alcançáveis, R é o morto.
    const R = alcancavel.length;
    const MORTO = R;
    const pos = new Map(alcancavel.map((q, i) => [q, i]));
    const aceitaMorto = !!afd.aceitaMorto;
    const ehAceita = (i) => (i === MORTO ? aceitaMorto : afd.aceita.has(alcancavel[i]));
    const delta = (i, c) => {
      if (i === MORTO) return MORTO;
      const para = afd.trans[alcancavel[i]].get(c);
      return para === undefined ? MORTO : pos.get(para);
    };

    // 3. Refinamento. grupo[i] = número do grupo do estado i.
    let grupo = [];
    for (let i = 0; i <= R; i++) grupo.push(ehAceita(i) ? 1 : 0);
    let qtd = new Set(grupo).size;
    for (;;) {
      // Assinatura: meu grupo + o grupo para onde vou com cada símbolo.
      const novoNumero = new Map();
      const novo = grupo.map((g, i) => {
        const ass = [g, ...simbolos.map((c) => grupo[delta(i, c)])].join(',');
        if (!novoNumero.has(ass)) novoNumero.set(ass, novoNumero.size);
        return novoNumero.get(ass);
      });
      grupo = novo;
      if (novoNumero.size === qtd) break; // ninguém se separou: estável
      qtd = novoNumero.size;
    }

    // 4. Numera os grupos em ordem de BFS a partir do início, pulando o do morto.
    const grupoMorto = grupo[MORTO];
    const membros = new Map();
    for (let i = 0; i < R; i++) {
      if (!membros.has(grupo[i])) membros.set(grupo[i], []);
      membros.get(grupo[i]).push(alcancavel[i]);
    }
    const representante = (g) => pos.get(membros.get(g)[0]);

    const extra = aceitaMorto ? { aceitaMorto: true } : {};
    if (grupo[0] === grupoMorto) {
      // O início é equivalente ao morto: a linguagem é vazia (ou Σ*, se o morto aceita).
      return {
        n: 1, start: 0, aceita: new Set(aceitaMorto ? [0] : []), trans: [new Map()],
        simbolos: [], classes: [[...membros.get(grupo[0])].sort((a, b) => a - b)], ...extra,
      };
    }

    const numero = new Map([[grupo[0], 0]]);
    const ordem = [grupo[0]];
    const trans = [];
    for (let k = 0; k < ordem.length; k++) {
      const m = new Map();
      const rep = representante(ordem[k]);
      for (const c of simbolos) {
        const g = grupo[delta(rep, c)];
        if (g === grupoMorto) continue;
        if (!numero.has(g)) { numero.set(g, ordem.length); ordem.push(g); }
        m.set(c, numero.get(g));
      }
      trans.push(m);
    }

    const aceita = new Set();
    ordem.forEach((g, i) => { if (ehAceita(representante(g))) aceita.add(i); });
    const usados = new Set();
    for (const m of trans) for (const c of m.keys()) usados.add(c);

    return {
      n: ordem.length, start: 0, aceita, trans,
      simbolos: simbolos.filter((c) => usados.has(c)),
      classes: ordem.map((g) => [...membros.get(g)].sort((a, b) => a - b)),
      ...extra,
    };
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

  // ---------- Conferência de equivalência ----------
  // Simulação direta do AFN (conjunto de estados ativos), sem passar pelo AFD.
  function aceitaAFN(afn, cadeia) {
    let ativos = fechoConjunto(afn, [afn.start]);
    for (const ch of Array.from(cadeia)) {
      ativos = fechoConjunto(afn, moverConjunto(afn, ativos, ch));
      if (ativos.length === 0) return false;
    }
    return ativos.includes(afn.accept);
  }

  // Gerador pseudoaleatório com semente (mesma semente = mesmas cadeias, bom para teste).
  function aleatorio(semente) {
    let x = semente >>> 0 || 1;
    return () => {
      x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
      return x / 4294967296;
    };
  }

  // Sorteia cadeias e confere se AFN, AFD e mínimo dão a mesma resposta para todas.
  // As cadeias usam os símbolos do autômato mais um caractere estranho, para também
  // testar o caminho do estado morto. Devolve { ok, testadas, divergencias }.
  function conferirEquivalencia(afn, afd, min, opcoes = {}) {
    const { quantidade = 500, tamanhoMax = 12, semente = 42 } = opcoes;
    const rand = aleatorio(semente);
    const letras = [...afd.simbolos, '#'];
    const divergencias = [];
    for (let i = 0; i < quantidade; i++) {
      const tam = Math.floor(rand() * (tamanhoMax + 1));
      let s = '';
      for (let j = 0; j < tam; j++) s += letras[Math.floor(rand() * letras.length)];
      const r = { cadeia: s, afn: aceitaAFN(afn, s), afd: executarAFD(afd, s).aceita, min: executarAFD(min, s).aceita };
      if (r.afn !== r.afd || r.afd !== r.min) divergencias.push(r);
    }
    return { ok: divergencias.length === 0, testadas: quantidade, divergencias };
  }

  const api = {
    afnParaAFD, minimizar, executarAFD, motivo, grafoAFD, conferirEquivalencia, aceitaAFN,
    fechoConjunto, moverConjunto, rotulo, porDestino,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
