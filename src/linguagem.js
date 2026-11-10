// Extra A: comparar linguagens regulares (formatos em docs/CONTRATOS.md).
//
//   equivalentes(afdA, afdB) -> { iguais, contraexemplo, so }
//   complemento(afd)         -> AFD com aceitaMorto: true
//   produto(afdA, afdB, modo)-> AFD (modo: 'intersecao' | 'uniao' | 'diferenca')
//
// Todas trabalham sobre o alfabeto Σ inteiro, não só sobre os símbolos que
// aparecem nas transições. O truque para não testar ~150 caracteres um por um:
// todo caractere que NENHUM dos dois autômatos usa se comporta igual (leva os
// dois ao morto), então basta testar UM representante desses caracteres.

(function () {
  // Σ: ASCII imprimível (32 a 126) + letras acentuadas do português (igual ao contrato).
  const ACENTOS = 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ';
  const ALFABETO = [];
  for (let c = 32; c <= 126; c++) ALFABETO.push(String.fromCharCode(c));
  for (const ch of ACENTOS) ALFABETO.push(ch);

  const MORTO = -1; // o estado morto implícito, agora como estado de verdade

  function simbolosDe(afd) {
    const s = new Set();
    for (const m of afd.trans) for (const c of m.keys()) s.add(c);
    return s;
  }

  // Símbolos que vale a pena testar: os usados por A ou B (em ordem) e, se sobrar
  // algum caractere de Σ que nenhum dos dois usa, um representante dele.
  function simbolosRelevantes(afdA, afdB) {
    const usados = new Set([...simbolosDe(afdA), ...simbolosDe(afdB)]);
    const lista = [...usados].sort();
    const preferidos = ['x', '#', '0', 'Z', '?', ' '];
    const resto = [...preferidos, ...ALFABETO].find((c) => !usados.has(c));
    if (resto !== undefined) lista.push(resto);
    return lista;
  }

  // Um passo de um AFD "completado": transição ausente leva ao MORTO, e do MORTO não se sai.
  const passo = (afd, q, c) => {
    if (q === MORTO) return MORTO;
    const p = afd.trans[q].get(c);
    return p === undefined ? MORTO : p;
  };
  const aceitaEm = (afd, q) => (q === MORTO ? !!afd.aceitaMorto : afd.aceita.has(q));

  // ---------- Equivalência ----------
  // Anda nos dois autômatos AO MESMO TEMPO (pares de estados), em largura. Se algum
  // par tem um estado que aceita e outro que não, a cadeia que levou até ali é
  // aceita por só um deles. Como a busca é em largura, é a MENOR cadeia assim.
  // Se nenhum par alcançável discorda, as linguagens são iguais.
  function equivalentes(afdA, afdB) {
    const simbolos = simbolosRelevantes(afdA, afdB);
    const chave = (p, q) => p + ',' + q;
    const inicio = [afdA.start, afdB.start];
    const caminho = new Map([[chave(...inicio), '']]);
    const fila = [inicio];
    for (let i = 0; i < fila.length; i++) {
      const [p, q] = fila[i];
      const s = caminho.get(chave(p, q));
      const a = aceitaEm(afdA, p), b = aceitaEm(afdB, q);
      if (a !== b) return { iguais: false, contraexemplo: s, so: a ? 'A' : 'B' };
      for (const c of simbolos) {
        const prox = [passo(afdA, p, c), passo(afdB, q, c)];
        const k = chave(...prox);
        if (!caminho.has(k)) { caminho.set(k, s + c); fila.push(prox); }
      }
    }
    return { iguais: true, contraexemplo: null, so: null };
  }

  // ---------- Complemento ----------
  // Troca aceita por não aceita em todos os estados, INCLUSIVE no morto: o que
  // morria (era rejeitado) passa a ser aceito. Por isso o resultado vem com
  // aceitaMorto: true, em vez de desenhar o morto com ~150 laços.
  function complemento(afd) {
    const aceita = new Set();
    for (let q = 0; q < afd.n; q++) if (!afd.aceita.has(q)) aceita.add(q);
    const r = {
      n: afd.n, start: afd.start, aceita,
      trans: afd.trans.map((m) => new Map(m)),
      simbolos: [...simbolosDe(afd)].sort(),
      aceitaMorto: !afd.aceitaMorto,
    };
    if (!r.aceitaMorto) delete r.aceitaMorto;
    return r;
  }

  // ---------- Autômato produto ----------
  // Cada estado é um par (estado de A, estado de B): simula os dois juntos.
  // A aceitação do par depende do modo:
  //   intersecao: os dois aceitam   uniao: algum aceita   diferenca: A aceita e B não
  // Isso prova que as linguagens regulares são fechadas nessas operações.
  // `pares[i]` diz de qual par veio o estado i (-1 é o morto).
  const OPERACOES = {
    intersecao: (a, b) => a && b,
    uniao: (a, b) => a || b,
    diferenca: (a, b) => a && !b,
  };

  function produto(afdA, afdB, modo) {
    const op = OPERACOES[modo];
    if (!op) throw new Error(`modo desconhecido: ${modo} (use intersecao, uniao ou diferenca)`);

    // Só os símbolos usados: um caractere que nenhum dos dois usa leva ao par
    // (morto, morto), que é exatamente o morto implícito do resultado.
    const simbolos = [...new Set([...simbolosDe(afdA), ...simbolosDe(afdB)])].sort();
    const mortoAceita = op(!!afdA.aceitaMorto, !!afdB.aceitaMorto);
    const ehMorto = (p, q) => p === MORTO && q === MORTO;

    const pares = [];
    const indice = new Map();
    const trans = [];
    function obter(p, q) {
      const k = p + ',' + q;
      if (!indice.has(k)) { indice.set(k, pares.length); pares.push([p, q]); trans.push(new Map()); }
      return indice.get(k);
    }

    obter(afdA.start, afdB.start);
    for (let i = 0; i < pares.length; i++) {
      const [p, q] = pares[i];
      for (const c of simbolos) {
        const p2 = passo(afdA, p, c), q2 = passo(afdB, q, c);
        if (ehMorto(p2, q2)) continue; // morto implícito
        trans[i].set(c, obter(p2, q2));
      }
    }

    const aceita = new Set();
    pares.forEach(([p, q], i) => { if (op(aceitaEm(afdA, p), aceitaEm(afdB, q))) aceita.add(i); });

    const r = { n: pares.length, start: 0, aceita, trans, simbolos, pares };
    if (mortoAceita) r.aceitaMorto = true;
    return r;
  }

  const api = { equivalentes, complemento, produto };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
