// Scanner: acha padrões (placa, telefone, CPF...) dentro de um texto usando AFDs.
// Formatos em docs/CONTRATOS.md. Este arquivo NÃO importa o motor: recebe os AFDs prontos.
//
// Lembrete do contrato: o estado morto não aparece no AFD. Se um estado não tem
// transição para um caractere, ler esse caractere leva ao morto (a cadeia morre).
// Exceção: se afd.aceitaMorto for true (complemento), morrer passa a significar aceitar.

(function () {
  // Lista de todos os tamanhos de prefixo aceitos a partir de pos, do menor para o maior.
  //
  // Ideia (maior casamento / longest match): andamos pelo AFD lendo um caractere
  // por vez e, toda vez que caímos num estado de aceitação, anotamos o tamanho
  // lido até ali. Não paramos no primeiro aceite, porque um pedaço maior pode
  // ser aceito mais à frente. Só paramos quando a cadeia morre ou o texto acaba.
  function tamanhosAceitos(afd, texto, pos) {
    const tamanhos = [];
    let estado = afd.start;

    for (let i = pos; i < texto.length; i++) {
      const proximo = afd.trans[estado].get(texto[i]);

      if (proximo === undefined) {
        // Morreu: não tem seta para esse caractere.
        // No complemento (aceitaMorto), o morto aceita e nunca sai dele,
        // então todo prefixo daqui até o fim do texto também é aceito.
        if (afd.aceitaMorto) for (let j = i; j < texto.length; j++) tamanhos.push(j - pos + 1);
        return tamanhos;
      }

      estado = proximo;
      if (afd.aceita.has(estado)) tamanhos.push(i - pos + 1);
    }

    return tamanhos;
  }

  // Tamanho do maior prefixo de texto, a partir de pos, que o AFD aceita (0 se nenhum).
  function maisLongo(afd, texto, pos) {
    const tamanhos = tamanhosAceitos(afd, texto, pos);
    return tamanhos.length ? tamanhos[tamanhos.length - 1] : 0;
  }

  // ---------- Borda de palavra ----------
  // "Caractere de palavra" = letra (inclusive acentuada) ou dígito.
  function ehPalavra(c) {
    return c !== undefined && /[\p{L}\p{N}]/u.test(c);
  }

  // O trecho texto[inicio, fim) está "solto", sem estar colado em outra palavra?
  // Mesma regra do \b das ERs: uma ponta só é proibida se o caractere de dentro
  // E o de fora forem de palavra. Assim "ABC1D234" não é placa (o 3 está colado
  // no 4), mas "ligue(11)" acha o "(11)", porque "(" não é de palavra.
  function temBordas(texto, inicio, fim) {
    const bordaInicio = !(ehPalavra(texto[inicio - 1]) && ehPalavra(texto[inicio]));
    const bordaFim = !(ehPalavra(texto[fim - 1]) && ehPalavra(texto[fim]));
    return bordaInicio && bordaFim;
  }

  // Maior tamanho aceito a partir de pos que também respeita as bordas (0 se nenhum).
  // Se o maior estiver colado em outra palavra, tenta os menores.
  function maisLongoComBorda(afd, texto, pos) {
    const tamanhos = tamanhosAceitos(afd, texto, pos);
    for (let k = tamanhos.length - 1; k >= 0; k--) {
      if (temBordas(texto, pos, pos + tamanhos[k])) return tamanhos[k];
    }
    return 0;
  }

  // Converte para maiúscula caractere por caractere, sem mudar o tamanho do texto
  // (assim as posições continuam batendo). Ex.: "ß" vira "SS" em toUpperCase,
  // então caracteres assim ficam como estão.
  function maiusculo(texto) {
    let r = '';
    for (const c of texto) {
      const m = c.toUpperCase();
      r += m.length === c.length ? m : c;
    }
    return r;
  }

  // ---------- Varredura ----------
  // Acha todos os destaques de um texto. padroes = [ { nome, afd, ... } ].
  // Devolve [ { inicio, fim, padrao } ], com fim exclusivo e padrao sendo o próprio objeto.
  //
  // Regras (as mesmas de um analisador léxico):
  //  1. Em cada posição, testa todos os padrões; ganha o que casa o trecho mais longo.
  //  2. Empate de tamanho: ganha o que vem primeiro na lista (a ordem é a prioridade).
  //  3. Achou um trecho: pula para o fim dele (destaques nunca se sobrepõem).
  //  4. Nada casou: anda um caractere.
  //  5. Só vale trecho com borda de palavra nas duas pontas.
  //  6. Padrão com maiusculas: true lê o texto convertido para maiúscula.
  function varrer(texto, padroes) {
    const destaques = [];
    const textoMaiusculo = maiusculo(texto);
    let pos = 0;

    while (pos < texto.length) {
      let melhorTam = 0;
      let melhorPadrao = null;

      for (const padrao of padroes) {
        const t = padrao.maiusculas ? textoMaiusculo : texto;
        const tam = maisLongoComBorda(padrao.afd, t, pos);
        if (tam > melhorTam) { // ">" e não ">=": no empate, fica o primeiro da lista
          melhorTam = tam;
          melhorPadrao = padrao;
        }
      }

      if (melhorTam > 0) {
        destaques.push({ inicio: pos, fim: pos + melhorTam, padrao: melhorPadrao });
        pos += melhorTam;
      } else {
        pos += 1;
      }
    }

    return destaques;
  }

  const api = { maisLongo, varrer, temBordas, maiusculo };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
