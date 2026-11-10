// Explicação em português de cada nó da árvore sintática.
//
//   explicar(ast) → [ { noId, texto } ]    um item por nó, na ordem dos ids (pré-ordem)
//
// Os nós criados pela expansão de `+`, `?` e `{n,m}` são explicados pelo que são
// de fato na árvore (concatenação, união, estrela, vazio), porque é isso que o
// AFN vai construir.

(function () {
  const rotuloConjunto = typeof module !== 'undefined' && module.exports
    ? require('./nfa').rotuloConjunto
    : window.Raio.rotuloConjunto;

  function textoDoNo(no) {
    switch (no.t) {
      case 'eps':
        return 'Cadeia vazia (ε): casa sem ler nenhum caractere. Aparece, por exemplo, quando algo é opcional.';
      case 'char': {
        const r = rotuloConjunto(no.set);
        if (r === '.') return 'Casa qualquer caractere do alfabeto (o ponto).';
        if (no.set.size === 1) return `Casa exatamente o caractere ${r}.`;
        if (r.startsWith('[^')) return `Casa qualquer caractere fora de [${r.slice(2)}.`;
        if (r.startsWith('[')) return `Casa um caractere qualquer de ${r}.`;
        return `Casa um destes caracteres: ${r}.`;
      }
      case 'cat':
        return 'Concatenação: casa o primeiro pedaço e, logo em seguida, o segundo.';
      case 'alt':
        return 'União (|): casa o primeiro pedaço ou o segundo, o que servir.';
      case 'star':
        return '* permite repetir o pedaço zero ou mais vezes.';
      default:
        throw new Error(`nó de AST desconhecido: ${no.t}`);
    }
  }

  function explicar(ast) {
    const r = [];
    (function ir(no) {
      r.push({ noId: no.id, texto: textoDoNo(no) });
      if (no.a) ir(no.a);
      if (no.b) ir(no.b);
    })(ast);
    return r;
  }

  const api = { explicar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
