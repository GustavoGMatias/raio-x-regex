// Matcher por backtracking sobre a mesma AST (aba Duelo).
// Casa a cadeia INTEIRA, tentando alternativas em ordem e voltando quando falha,
// como os motores de regex comuns. Conta cada visita a um nó como um "passo".
// Quando passa de `limite` passos, desiste e devolve estourou = true.

(function () {
  class Estouro extends Error {}

  function casarBacktracking(ast, cadeia, limite = 1e6) {
    const s = Array.from(cadeia);
    let passos = 0;

    // m(no, i, k): tenta casar `no` a partir de i; para cada jeito de casar chama
    // a continuação k(j) com a nova posição. Devolve true assim que um jeito der certo.
    function m(no, i, k) {
      if (++passos > limite) throw new Estouro();
      switch (no.t) {
        case 'eps':
          return k(i);
        case 'char':
          return i < s.length && no.set.has(s[i]) && k(i + 1);
        case 'cat':
          return m(no.a, i, (j) => m(no.b, j, k));
        case 'alt':
          return m(no.a, i, k) || m(no.b, i, k);
        case 'star':
          // guloso: tenta mais uma volta primeiro; só aceita a volta se avançou
          // (evita laço infinito em (a*)*)
          return m(no.a, i, (j) => j > i && m(no, j, k)) || k(i);
        default:
          throw new Error(`nó de AST desconhecido: ${no.t}`);
      }
    }

    let aceita = false;
    let estourou = false;
    try {
      aceita = m(ast, 0, (j) => j === s.length);
    } catch (e) {
      if (e instanceof Estouro || e instanceof RangeError) { estourou = true; aceita = false; }
      else throw e;
    }
    return { aceita, passos: Math.min(passos, limite), estourou };
  }

  const api = { casarBacktracking };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
