// Liga os módulos. É o último arquivo carregado.
//
//   compilar(er) → { er, ast, afn, afd, min }     ER → parse → AFN → AFD → mínimo
//
// Os módulos não se importam entre si: cada aba recebe o que precisa por `deps`
// (window.Raio.deps), que o app.js entrega a montarLab, montarChat, montarForm...

(function () {
  const emNode = typeof module !== 'undefined' && module.exports;
  const R = emNode
    ? Object.assign({}, require('./parser'), require('./nfa'), require('./dfa'))
    : window.Raio;

  function compilar(er) {
    const ast = R.parse(er);               // lança ErroER com `pos` se a ER for inválida
    const afn = R.construirAFN(ast);
    const afd = R.afnParaAFD(afn);
    const min = R.minimizar(afd);
    return { er, ast, afn, afd, min };
  }

  if (emNode) {
    module.exports = { compilar };
    return;
  }

  R.compilar = compilar;

  // Padrões do Chat e do Formulário (Parte 3): cada um ganha o AFD mínimo já pronto.
  // Quem não existir ainda simplesmente não entra.
  if (Array.isArray(R.padroes)) {
    for (const p of R.padroes) {
      try { p.afd = compilar(p.er).min; }
      catch (e) { console.error(`padrão "${p.nome}" não compilou:`, e); }
    }
  }

  // Tudo o que as abas podem precisar, num lugar só.
  R.deps = Object.assign({}, R, { compilar });
})();
