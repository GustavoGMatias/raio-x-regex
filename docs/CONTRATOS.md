# Contratos entre os módulos

Formatos de dados e funções que cada parte entrega. Se alguém precisar mudar um formato, avisa o grupo antes. Podem ajustar estes contratos na primeira conversa, o importante é fechar e seguir.

## Alfabeto

Caracteres ASCII imprimíveis (32 a 126) mais letras acentuadas do português. Um caractere fora disso leva ao estado morto.

## AST (saída do parser, Parte 1)

```
{ t: 'eps' }
{ t: 'char', set: Set<string> }      um conjunto de caracteres (ex.: [a-z] é um nó só)
{ t: 'cat',  a: AST, b: AST }
{ t: 'alt',  a: AST, b: AST }
{ t: 'star', a: AST }
```

`+`, `?` e `{n,m}` são expandidos em cima desses cinco tipos.

## AFN (Parte 1)

```
{
  n: number,                 quantidade de estados
  start: number,
  accept: number,            um único estado de aceitação (Thompson)
  trans: [ { eps: number[], mov: [ { set: Set<string>, to: number } ] } ]   um item por estado
}
```

## AFD (Parte 2)

```
{
  n: number,
  start: number,
  aceita: Set<number>,
  trans: Map<string, number>[],      um Map por estado; falta de entrada = vai para o morto
  simbolos: string[],                caracteres que aparecem em alguma transição
  subconjuntos: number[][]           (só no AFD dos subconjuntos) estados do AFN de cada estado
  classes: number[][]                (só no AFD mínimo) estados do AFD original de cada estado
}
```

O estado morto não aparece no autômato. Transição ausente significa morreu.

## Grafo para o desenho (Partes 1 e 2 produzem, Parte 4 consome)

```
{
  states: [ { id: number, label: string, start: boolean, accept: boolean } ],
  edges:  [ { from: number, to: number, label: string } ]    transições iguais entre o mesmo par viram uma aresta só ("a, b" ou "[A-Z]")
}
```

## Funções

| Módulo | Função | Faz |
| --- | --- | --- |
| parser | `parse(er) → AST` | Lança `ErroER` com `pos` se a ER for inválida |
| nfa | `construirAFN(ast) → AFN` | Thompson |
| nfa | `tracoAFN(afn, cadeia) → { inicial, passos, aceita }` | Cada passo: `{ ch, consome, mid, eps, depois }` |
| nfa | `grafoAFN(afn) → Grafo` | Para o visual |
| dfa | `afnParaAFD(afn) → AFD` | Subconjuntos |
| dfa | `minimizar(afd) → AFD` | AFD mínimo |
| dfa | `executarAFD(afd, cadeia) → { caminho, morreuEm, aceita }` | `morreuEm` é o índice do caractere sem transição, ou -1 |
| dfa | `maisLongo(afd, texto, pos) → number` | Tamanho do maior prefixo aceito a partir de `pos` (0 se nenhum) |
| dfa | `grafoAFD(afd) → Grafo` | Para o visual |
| scanner | `compilar(er) → { er, ast, afn, afd, min }` | Passa pelo pipeline todo |
| scanner | `varrer(texto, padroes) → [ { inicio, fim, padrao } ]` | Destaques de um texto |
| backtrack | `casarBacktracking(ast, cadeia, limite) → { aceita, passos, estourou }` | Para o Duelo |
| viz3d | `new Viz3D(canvas)`, `setGrafo(grafo)`, `setAtivos(ids)`, `animar(fases)` | Desenho e animação |

## Convenções

- Nomes e comentários em português.
- Cada arquivo de `src/` funciona no navegador e no Node (para os testes). Padrão sugerido: exportar com `module.exports` quando `module` existir e pendurar em `window.Raio` quando não.
