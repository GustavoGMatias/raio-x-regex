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

  const LIMITE_REPETICAO = 100; // evita {1000000} explodir a AST

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

  const eps = () => ({ t: 'eps' });
  const car = (set) => ({ t: 'char', set });
  const cat = (a, b) => ({ t: 'cat', a, b });
  const alt = (a, b) => ({ t: 'alt', a, b });
  const star = (a) => ({ t: 'star', a });

  function repetir(a, min, max) {
    // max === Infinity => {min,}
    let r = null;
    const juntar = (x) => (r === null ? x : cat(r, x));
    for (let i = 0; i < min; i++) r = juntar(a);
    if (max === Infinity) return juntar(star(a));
    // (max - min) cópias opcionais aninhadas: a{0,3} = (a(a(a)?)?)?
    let opc = null;
    for (let i = 0; i < max - min; i++) opc = alt(opc === null ? a : cat(a, opc), eps());
    if (opc !== null) r = juntar(opc);
    return r === null ? eps() : r;
  }

  function parse(er) {
    if (typeof er !== 'string') throw new ErroER('a expressão deve ser um texto', 0);
    const chars = Array.from(er);
    let i = 0;

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
      if (negar) return car(conjunto((c) => !set.has(c)));
      return car(set);
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
      if (c === '.') { i++; return car(new Set(ALFABETO)); }
      if (c === '\\') return car(lerEscape(false).set);
      if (c === '*' || c === '+' || c === '?') {
        throw new ErroER(`'${c}' sem nada antes para repetir`, pos);
      }
      if (c === '{') throw new ErroER("'{' sem nada antes para repetir", pos);
      if (c === ')') throw new ErroER("')' sem '(' correspondente", pos);
      if (c === ']' || c === '}') throw new ErroER(`'${c}' solto; use '\\${c}' para o caractere literal`, pos);
      i++;
      return car(new Set([c]));
    }

    function parseRep() {
      let a = parseAtomo();
      while (!fim()) {
        const c = olhar();
        if (c === '*') { i++; a = star(a); }
        else if (c === '+') { i++; a = cat(a, star(a)); }
        else if (c === '?') { i++; a = alt(a, eps()); }
        else if (c === '{') { const { min, max } = lerChaves(); a = repetir(a, min, max); }
        else break;
      }
      return a;
    }

    function parseCat() {
      let r = null;
      while (!fim() && olhar() !== '|' && olhar() !== ')') {
        const x = parseRep();
        r = r === null ? x : cat(r, x);
      }
      return r === null ? eps() : r;
    }

    function parseAlt() {
      let r = parseCat();
      while (!fim() && olhar() === '|') {
        i++;
        r = alt(r, parseCat());
      }
      return r;
    }

    const ast = parseAlt();
    if (!fim()) {
      // só pode sobrar um ')' sem par
      throw new ErroER("')' sem '(' correspondente", i);
    }
    return ast;
  }

  const api = { parse, ErroER, ALFABETO };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
