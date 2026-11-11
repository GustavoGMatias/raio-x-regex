// Parser de expressões regulares -> AST (ver docs/CONTRATOS.md).
//
// Gramática:
//   alt  := cat ('|' cat)*
//   cat  := rep*                       (vazio vira { t: 'eps' })
//   rep  := atom ('*' | '+' | '?' | '{n}' | '{n,}' | '{n,m}')*
//   atom := '(' alt ')' | '[' classe ']' | '.' | '\' escape | caractere
//
// A AST só tem cinco tipos: eps, char, cat, alt, star.
// `+`, `?` e `{n,m}` são expandidos em cima deles.

(function () {
  const ACENTOS = 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ';

  // Alfabeto: ASCII imprimível (32 a 126) + letras acentuadas do português.
  const ALFABETO = new Set();
  for (let c = 32; c <= 126; c++) ALFABETO.add(String.fromCharCode(c));
  for (const ch of ACENTOS) ALFABETO.add(ch);

  const LIMITE_REPETICAO = 100; // por {}: evita {1000000} explodir a AST
  // O limite acima vale para cada {} sozinho; repetições aninhadas multiplicam
  // ((a{100}){100}){100} seria um milhão de cópias), então também há um teto no
  // tamanho total da árvore depois de expandir as repetições.
  const LIMITE_NOS = 4000;
  let nosCriados = 0;

  class ErroER extends Error {
    constructor(mensagem, pos) {
      super(`${mensagem} (posição ${pos})`);
      this.name = 'ErroER';
      this.pos = pos;
    }
  }

  function conjunto(predicado) {
    const s = new Set();
    for (const ch of ALFABETO) if (predicado(ch)) s.add(ch);
    return s;
  }

  const ehDigito = (c) => c >= '0' && c <= '9';
  const ehLetra = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || ACENTOS.includes(c);

  // Conjuntos dos escapes de classe (\d, \w, \s e suas negações).
  const CLASSES_ESCAPE = {
    d: () => conjunto(ehDigito),
    D: () => conjunto((c) => !ehDigito(c)),
    w: () => conjunto((c) => ehDigito(c) || ehLetra(c) || c === '_'),
    W: () => conjunto((c) => !(ehDigito(c) || ehLetra(c) || c === '_')),
    s: () => new Set([' ']),
    S: () => conjunto((c) => c !== ' '),
  };

  // Todo nó tem `trecho: [inicio, fim)`, a posição do pedaço da ER que ele representa.
  // O `id` é colocado no fim do parse, em pré-ordem (ver numerar).
  function novoNo(no) {
    if (++nosCriados > LIMITE_NOS) {
      const pos = no.trecho ? no.trecho[0] : 0;
      throw new ErroER(`expressão grande demais: depois de expandir as repetições a árvore passa de ${LIMITE_NOS} nós`, pos);
    }
    return no;
  }
  const eps = (trecho) => novoNo({ t: 'eps', trecho });
  const car = (set, trecho) => novoNo({ t: 'char', set, trecho });
  const cat = (a, b, trecho) => novoNo({ t: 'cat', a, b, trecho });
  const alt = (a, b, trecho) => novoNo({ t: 'alt', a, b, trecho });
  const star = (a, trecho) => novoNo({ t: 'star', a, trecho });

  // Cópia da subárvore: cada cópia de `a` numa repetição ganha ids próprios.
  function clonar(no) {
    const c = novoNo({ t: no.t, trecho: [...no.trecho] });
    if (no.set) c.set = new Set(no.set);
    if (no.a) c.a = clonar(no.a);
    if (no.b) c.b = clonar(no.b);
    return c;
  }

  // `trecho` é o do operador inteiro (átomo + operador): os nós criados na
  // expansão herdam esse trecho; as cópias do átomo mantêm o trecho do átomo.
  function repetir(a, min, max, trecho) {
    // max === Infinity => {min,}
    let r = null;
    let usouOriginal = false;
    const copia = () => { if (!usouOriginal) { usouOriginal = true; return a; } return clonar(a); };
    const juntar = (x) => (r === null ? x : cat(r, x, [...trecho]));
    for (let i = 0; i < min; i++) r = juntar(copia());
    if (max === Infinity) return juntar(star(copia(), [...trecho]));
    // (max - min) cópias opcionais aninhadas: a{0,3} = (a(a(a)?)?)?
    let opc = null;
    for (let i = 0; i < max - min; i++) {
      opc = alt(opc === null ? copia() : cat(copia(), opc, [...trecho]), eps([...trecho]), [...trecho]);
    }
    if (opc !== null) r = juntar(opc);
    return r === null ? eps([...trecho]) : r;
  }

  // Numera os nós em pré-ordem (pai antes dos filhos, a antes de b), a partir de 1.
  function numerar(raiz) {
    let n = 0;
    (function ir(no) {
      no.id = ++n;
      if (no.a) ir(no.a);
      if (no.b) ir(no.b);
    })(raiz);
    return raiz;
  }

  function parse(er) {
    if (typeof er !== 'string') throw new ErroER('a expressão deve ser um texto', 0);
    const chars = Array.from(er);
    let i = 0;
    nosCriados = 0;

    const fim = () => i >= chars.length;
    const olhar = () => chars[i];

    function lerEscape(dentroDeClasse) {
      const pos = i; // posição da barra
      i++;
      if (fim()) throw new ErroER("'\\' no fim da expressão, falta o caractere escapado", pos);
      const c = chars[i++];
      if (CLASSES_ESCAPE[c]) return { set: CLASSES_ESCAPE[c]() };
      if (c === 'n' || c === 't' || c === 'r') {
        throw new ErroER(`escape '\\${c}' não é suportado (o alfabeto não tem quebra de linha ou tab)`, pos);
      }
      return { set: new Set([c]) };
    }

    function parseClasse() {
      const abre = i;
      i++; // '['
      let negar = false;
      if (!fim() && olhar() === '^') { negar = true; i++; }
      const set = new Set();
      let primeiro = true;
      while (true) {
        if (fim()) throw new ErroER("'[' sem ']' correspondente", abre);
        if (olhar() === ']' && !primeiro) { i++; break; }
        primeiro = false;
        const posItem = i;
        let ini;
        if (olhar() === '\\') {
          const e = lerEscape(true);
          if (e.set.size !== 1) { for (const x of e.set) set.add(x); continue; }
          ini = [...e.set][0];
        } else {
          ini = chars[i++];
        }
        // intervalo a-z (o '-' final ou inicial é literal)
        if (!fim() && olhar() === '-' && chars[i + 1] !== undefined && chars[i + 1] !== ']') {
          i++;
          let fimIv;
          if (olhar() === '\\') {
            const e = lerEscape(true);
            if (e.set.size !== 1) throw new ErroER('limite de intervalo inválido', posItem);
            fimIv = [...e.set][0];
          } else {
            fimIv = chars[i++];
          }
          if (ini.codePointAt(0) > fimIv.codePointAt(0)) {
            throw new ErroER(`intervalo '${ini}-${fimIv}' está invertido`, posItem);
          }
          for (let c = ini.codePointAt(0); c <= fimIv.codePointAt(0); c++) {
            const ch = String.fromCodePoint(c);
            if (ALFABETO.has(ch)) set.add(ch);
          }
        } else {
          set.add(ini);
        }
      }
      if (negar) return car(conjunto((c) => !set.has(c)), [abre, i]);
      return car(set, [abre, i]);
    }

    function lerInteiro() {
      const ini = i;
      while (!fim() && ehDigito(olhar())) i++;
      return i === ini ? null : parseInt(chars.slice(ini, i).join(''), 10);
    }

    // Tenta ler {n}, {n,} ou {n,m}. Devolve null se não for um quantificador.
    function lerChaves() {
      const abre = i;
      i++; // '{'
      const min = lerInteiro();
      if (min === null) throw new ErroER("esperava um número depois de '{'", i);
      let max = min;
      if (!fim() && olhar() === ',') {
        i++;
        const m = lerInteiro();
        max = m === null ? Infinity : m;
      }
      if (fim() || olhar() !== '}') throw new ErroER("'{' sem '}' correspondente", abre);
      i++;
      if (max < min) throw new ErroER(`repetição {${min},${max}} tem máximo menor que o mínimo`, abre);
      const maior = max === Infinity ? min : max;
      if (maior > LIMITE_REPETICAO) {
        throw new ErroER(`repetição acima do limite de ${LIMITE_REPETICAO}`, abre);
      }
      return { min, max };
    }

    function parseAtomo() {
      const c = olhar();
      const pos = i;
      if (c === '(') {
        i++;
        const no = parseAlt();
        if (fim() || olhar() !== ')') throw new ErroER("'(' sem ')' correspondente", pos);
        i++;
        return no;
      }
      if (c === '[') return parseClasse();
      if (c === '.') { i++; return car(new Set(ALFABETO), [pos, i]); }
      if (c === '\\') { const e = lerEscape(false); return car(e.set, [pos, i]); }
      if (c === '*' || c === '+' || c === '?') {
        throw new ErroER(`'${c}' sem nada antes para repetir`, pos);
      }
      if (c === '{') throw new ErroER("'{' sem nada antes para repetir", pos);
      if (c === ')') throw new ErroER("')' sem '(' correspondente", pos);
      if (c === ']' || c === '}') throw new ErroER(`'${c}' solto; use '\\${c}' para o caractere literal`, pos);
      i++;
      return car(new Set([c]), [pos, i]);
    }

    function parseRep() {
      const ini = i; // o trecho de um operador começa no início do átomo (com o parêntese, se houver)
      let a = parseAtomo();
      while (!fim()) {
        const c = olhar();
        if (c === '*') { i++; a = star(a, [ini, i]); }
        else if (c === '+') { i++; a = repetir(a, 1, Infinity, [ini, i]); }
        else if (c === '?') { i++; a = repetir(a, 0, 1, [ini, i]); }
        else if (c === '{') { const { min, max } = lerChaves(); a = repetir(a, min, max, [ini, i]); }
        else break;
      }
      return a;
    }

    function parseCat() {
      const ini = i;
      let r = null;
      while (!fim() && olhar() !== '|' && olhar() !== ')') {
        const x = parseRep();
        r = r === null ? x : cat(r, x, [ini, i]);
      }
      return r === null ? eps([i, i]) : r;
    }

    function parseAlt() {
      const ini = i;
      let r = parseCat();
      while (!fim() && olhar() === '|') {
        i++;
        r = alt(r, parseCat(), [ini, i]);
      }
      return r;
    }

    const ast = parseAlt();
    if (!fim()) {
      // só pode sobrar um ')' sem par
      throw new ErroER("')' sem '(' correspondente", i);
    }
    return numerar(ast);
  }

  const api = { parse, ErroER, ALFABETO };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
