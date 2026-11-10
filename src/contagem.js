// Contar cadeias: quantas cadeias um AFD aceita, e se a linguagem é vazia, finita ou infinita.
// Formatos em docs/CONTRATOS.md. É assim que o "quantas placas existem?" é respondido:
// pelo próprio autômato, sem fórmula feita à mão.
//
// Lembrete do contrato: o estado morto não aparece no AFD (transição ausente = morreu),
// e o universo Σ é o alfabeto inteiro do projeto, não só os caracteres das transições.
// Se afd.aceitaMorto for true (complemento), o morto é de aceitação.
//
// contarCadeias(afd, n, alfabeto?) → BigInt   cadeias de tamanho exatamente n aceitas
// classificar(afd, alfabeto?)      → { tipo: 'vazia' | 'finita' | 'infinita', maxTamanho }

(function () {
  // Σ: o alfabeto do parser (mesmo jeito que o nfa.js pega).
  const ALFABETO_PADRAO = typeof module !== 'undefined' && module.exports
    ? require('./parser').ALFABETO
    : window.Raio.ALFABETO;

  // Completa o AFD com o estado morto explícito (número afd.n).
  // Para cada estado devolve as "saídas agrupadas": { destino → quantos caracteres de Σ levam lá }.
  // Agrupar é o que deixa a conta rápida: 26 letras que vão para o mesmo estado viram um "×26".
  function completar(afd, alfabeto = ALFABETO_PADRAO) {
    const sigma = alfabeto instanceof Set ? alfabeto : new Set(alfabeto);
    const tam = BigInt(sigma.size);
    const MORTO = afd.n;
    const saidas = [];
    for (let q = 0; q < afd.n; q++) {
      const porDestino = new Map();
      let comSeta = 0n;
      for (const [c, t] of afd.trans[q]) {
        if (!sigma.has(c)) continue;
        porDestino.set(t, (porDestino.get(t) || 0n) + 1n);
        comSeta += 1n;
      }
      if (comSeta < tam) porDestino.set(MORTO, (porDestino.get(MORTO) || 0n) + (tam - comSeta));
      saidas.push(porDestino);
    }
    saidas.push(new Map([[MORTO, tam]])); // o morto nunca sai do morto
    const aceita = (q) => (q === MORTO ? !!afd.aceitaMorto : afd.aceita.has(q));
    return { saidas, aceita, total: afd.n + 1 };
  }

  // Programação dinâmica: cont[q] = quantas cadeias do tamanho atual param no estado q.
  // Começa com 1 cadeia (a vazia) no estado inicial; a cada passo, cada cadeia em q se
  // espalha pelas saídas de q, multiplicada por quantos caracteres levam a cada destino.
  // No fim, soma os estados de aceitação. BigInt porque os números ficam enormes.
  function contarCadeias(afd, n, alfabeto) {
    const { saidas, aceita, total } = completar(afd, alfabeto);
    let cont = new Array(total).fill(0n);
    cont[afd.start] = 1n;
    for (let passo = 0; passo < n; passo++) {
      const novo = new Array(total).fill(0n);
      for (let q = 0; q < total; q++) {
        if (cont[q] === 0n) continue;
        for (const [t, vezes] of saidas[q]) novo[t] += cont[q] * vezes;
      }
      cont = novo;
    }
    let soma = 0n;
    for (let q = 0; q < total; q++) if (aceita(q)) soma += cont[q];
    return soma;
  }

  // Vazia, finita ou infinita? Só importam os estados "úteis": alcançáveis a partir do
  // início E que ainda conseguem chegar numa aceitação.
  //   - nenhum estado útil de aceitação → vazia
  //   - existe um ciclo entre estados úteis → dá para repetir à vontade → infinita
  //   - senão, os úteis formam um grafo sem ciclos: a maior cadeia é o caminho mais
  //     longo do início até uma aceitação.
  function classificar(afd, alfabeto) {
    const { saidas, aceita, total } = completar(afd, alfabeto);
    const vizinhos = saidas.map((m) => [...m.keys()]);

    const alcancavel = new Array(total).fill(false);
    const pilha = [afd.start];
    alcancavel[afd.start] = true;
    while (pilha.length) {
      const q = pilha.pop();
      for (const t of vizinhos[q]) if (!alcancavel[t]) { alcancavel[t] = true; pilha.push(t); }
    }

    // Quem chega numa aceitação: busca para trás a partir dos estados de aceitação.
    const anteriores = Array.from({ length: total }, () => []);
    vizinhos.forEach((ts, q) => ts.forEach((t) => anteriores[t].push(q)));
    const chegaNaAceitacao = new Array(total).fill(false);
    for (let q = 0; q < total; q++) if (aceita(q)) { chegaNaAceitacao[q] = true; pilha.push(q); }
    while (pilha.length) {
      const q = pilha.pop();
      for (const p of anteriores[q]) if (!chegaNaAceitacao[p]) { chegaNaAceitacao[p] = true; pilha.push(p); }
    }

    const util = (q) => alcancavel[q] && chegaNaAceitacao[q];
    if (!util(afd.start)) return { tipo: 'vazia', maxTamanho: null };

    // Busca em profundidade nos úteis: achar uma aresta de volta = ciclo = infinita.
    // Sem ciclo, calcula o caminho mais longo (memorizado) até uma aceitação.
    const BRANCO = 0, CINZA = 1, PRETO = 2;
    const cor = new Array(total).fill(BRANCO);
    const maior = new Array(total).fill(-1); // maior tamanho de cadeia aceita saindo de q
    let infinita = false;
    function visitar(q) {
      cor[q] = CINZA;
      let melhor = aceita(q) ? 0 : -1;
      for (const t of vizinhos[q]) {
        if (!util(t)) continue;
        if (cor[t] === CINZA) { infinita = true; continue; }
        if (cor[t] === BRANCO) visitar(t);
        if (infinita) break;
        if (maior[t] >= 0) melhor = Math.max(melhor, maior[t] + 1);
      }
      cor[q] = PRETO;
      maior[q] = melhor;
    }
    visitar(afd.start);
    if (infinita) return { tipo: 'infinita', maxTamanho: null };
    return { tipo: 'finita', maxTamanho: maior[afd.start] };
  }

  // Total de cadeias aceitas (soma de todos os tamanhos). Só faz sentido se for finita;
  // devolve null se for infinita. Usado no "quantas placas existem?".
  function totalCadeias(afd, alfabeto) {
    const c = classificar(afd, alfabeto);
    if (c.tipo === 'vazia') return 0n;
    if (c.tipo === 'infinita') return null;
    let soma = 0n;
    for (let n = 0; n <= c.maxTamanho; n++) soma += contarCadeias(afd, n, alfabeto);
    return soma;
  }

  const api = { contarCadeias, classificar, totalCadeias };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
