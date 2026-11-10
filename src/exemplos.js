// Gerador de cadeias aceitas e rejeitadas por um AFD (formato em docs/CONTRATOS.md).
//
// Aceitas: busca em largura (BFS) pelo autômato. Como a BFS anda em camadas
// (primeiro tudo de tamanho 0, depois 1, depois 2...), as primeiras cadeias que
// chegam a um estado de aceitação são as MAIS CURTAS.
//
// Rejeitadas: pequenas variações das aceitas (tirar o último símbolo, sobrar um no
// fim, trocar um por um caractere que o autômato não espera). Assim as rejeitadas
// ficam "quase certas", que é o que mais ensina.

(function () {
  const LIMITE_BUSCA = 20000; // teto de cadeias visitadas na BFS

  function aceitaAFD(afd, cadeia) {
    let q = afd.start;
    for (const ch of Array.from(cadeia)) {
      q = afd.trans[q].get(ch);
      if (q === undefined) return !!afd.aceitaMorto;
    }
    return afd.aceita.has(q);
  }

  // Transições agrupadas por destino. De cada grupo a BFS usa um caractere só
  // (senão [A-Z]{3} viraria 26³ ramos). O caractere escolhido varia com a posição
  // para os exemplos não saírem todos "AAA...".
  function gruposPorDestino(mapa) {
    const grupos = new Map();
    for (const [ch, para] of mapa) {
      if (!grupos.has(para)) grupos.set(para, []);
      grupos.get(para).push(ch);
    }
    for (const chars of grupos.values()) chars.sort();
    return grupos;
  }

  function cadeiasAceitas(afd, k) {
    const achadas = []; // { s, passos } onde passos[p] = caracteres possíveis na posição p
    const fila = [{ q: afd.start, s: '', passos: [] }];
    for (let i = 0; i < fila.length && achadas.length < k && i < LIMITE_BUSCA; i++) {
      const { q, s, passos } = fila[i];
      if (afd.aceita.has(q)) achadas.push({ s, passos });
      let j = 0;
      for (const [para, chars] of gruposPorDestino(afd.trans[q])) {
        const ch = chars[(passos.length * 7 + i + j++) % chars.length];
        fila.push({ q: para, s: s + ch, passos: [...passos, chars] });
      }
    }

    // Se faltou (ex.: só existe UM caminho até a aceitação, como na placa), cria
    // variantes trocando cada caractere por outro do MESMO grupo: o caminho no
    // autômato é o mesmo, então a cadeia continua aceita.
    const aceitas = achadas.map((a) => a.s);
    const vistas = new Set(aceitas);
    for (let v = 1; v <= 50 && aceitas.length < k; v++) {
      for (const { passos } of achadas) {
        if (aceitas.length >= k) break;
        const s = passos.map((chars, p) => chars[(p * 7 + v * (p + 3)) % chars.length]).join('');
        if (!vistas.has(s)) { vistas.add(s); aceitas.push(s); }
      }
    }
    return aceitas;
  }

  // Um caractere que nenhuma transição usa (leva direto ao morto).
  function foraDoAlfabeto(afd) {
    const usados = new Set();
    for (const m of afd.trans) for (const c of m.keys()) usados.add(c);
    for (const c of ['#', '!', 'x', '0', 'Z', '?', '~', '@']) if (!usados.has(c)) return c;
    for (let c = 33; c <= 126; c++) {
      const ch = String.fromCharCode(c);
      if (!usados.has(ch)) return ch;
    }
    return null;
  }

  function gerarExemplos(afd, k = 5) {
    const aceitas = cadeiasAceitas(afd, k);

    const simbolos = new Set();
    for (const m of afd.trans) for (const c of m.keys()) simbolos.add(c);
    const algum = [...simbolos].sort()[0];
    const estranho = foraDoAlfabeto(afd);

    // Candidatas a rejeitadas, das mais parecidas com as aceitas para as menos.
    const candidatas = [];
    for (const s of aceitas) {
      const cs = Array.from(s);
      if (cs.length) candidatas.push(cs.slice(0, -1).join(''));          // faltou o fim
      if (algum) candidatas.push(s + algum);                               // sobrou no fim
      if (estranho && cs.length) {                                         // trocou um no meio
        const i = Math.floor(cs.length / 2);
        candidatas.push([...cs.slice(0, i), estranho, ...cs.slice(i + 1)].join(''));
      }
      if (estranho) candidatas.push(s + estranho);
      if (cs.length) candidatas.push(cs.slice(1).join(''));               // faltou o começo
    }
    candidatas.push('');
    for (const c of [...simbolos].sort()) candidatas.push(c, c + c);
    if (estranho) candidatas.push(estranho);

    const rejeitadas = [];
    const vistas = new Set();
    for (const s of candidatas) {
      if (rejeitadas.length >= k) break;
      if (vistas.has(s)) continue;
      vistas.add(s);
      if (!aceitaAFD(afd, s)) rejeitadas.push(s);
    }
    return { aceitas, rejeitadas };
  }

  const api = { gerarExemplos };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
