# Contratos entre os módulos

Formatos de dados e funções que cada parte entrega. Se alguém precisar mudar um formato, avisa o grupo antes. Podem ajustar estes contratos na primeira conversa, o importante é fechar e seguir.

## Alfabeto

Caracteres ASCII imprimíveis (32 a 126) mais letras acentuadas do português. Um caractere fora disso leva ao estado morto.

O universo Σ é exatamente o alfabeto definido acima. As operações `complemento`, `produto`, `equivalentes` e `contarCadeias` trabalham sobre Σ inteiro, não apenas sobre os caracteres presentes nas transições (`simbolos`).

Ao completar um AFD, todo caractere de Σ sem transição definida conduz ao estado morto implícito. No complemento, esse estado passa a ser de aceitação, pois representa cadeias anteriormente rejeitadas.

## AST (saída do parser, Parte 1)

```
{ t: 'eps' }
{ t: 'char', set: Set<string> }      um conjunto de caracteres (ex.: [a-z] é um nó só)
{ t: 'cat',  a: AST, b: AST }
{ t: 'alt',  a: AST, b: AST }
{ t: 'star', a: AST }
```

Todo nó, de qualquer tipo, também tem:

- `id: number`, único na árvore (começa em 1)
- `trecho: [inicio, fim)`, a posição do pedaço da ER que o nó representa (serve para destacar o texto da expressão)

`+`, `?` e `{n,m}` são expandidos em cima desses cinco tipos. Os nós criados na expansão herdam o `trecho` do operador original.

## AFN (Parte 1)

```
{
  n: number,                 quantidade de estados
  start: number,
  accept: number,            um único estado de aceitação (Thompson)
  trans: [ { eps: number[], mov: [ { set: Set<string>, to: number } ] } ]   um item por estado
  origem: number[]           origem[s] = id do nó da AST que criou o estado s
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
  aceitaMorto?: boolean              (só no complemento) se true, morrer passa a significar aceitar
}
```

O estado morto não aparece no autômato. Transição ausente significa morreu. A única exceção é o resultado de `complemento`, que vem com `aceitaMorto: true`. Toda função que executa um AFD (`executarAFD`, `maisLongo`, `equivalentes`, `contarCadeias`) precisa respeitar esse campo.

O estado morto é implícito na representação de AFDs parciais: uma transição ausente significa que a execução chegou ao estado morto. Algoritmos de minimização, comparação e operações entre autômatos devem completar internamente o AFD antes de executar seus procedimentos. Após o processamento, o estado morto pode ser omitido da representação, desde que isso preserve a linguagem reconhecida. No complemento, ele deve ser mantido quando necessário, pois passa a ser um estado de aceitação.

Toda função que executa um AFD (`executarAFD`, `maisLongo`, `equivalentes`, `contarCadeias`) precisa respeitar `aceitaMorto: true`, quando presente.

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
| nfa | `passosThompson(ast) → [ { noId, operador, texto, estados } ]` | Construção fragmento por fragmento. `estados` são os estados do AFN criados nesse passo |
| nfa | `tracoAFN(afn, cadeia) → { inicial, passos, aceita, morreuEm }` | Cada passo: `{ ch, consome, mid, eps, depois }`. `morreuEm` é o índice do caractere em que não sobrou nenhum estado ativo, ou -1 |
| nfa | `grafoAFN(afn) → Grafo` | Para o visual |
| explicacao | `explicar(ast) → [ { noId, texto } ]` | Uma frase em português por nó (ex.: "`*` permite repetir zero ou mais vezes") |
| dfa | `afnParaAFD(afn) → AFD` | Subconjuntos |
| dfa | `minimizar(afd) → AFD` | AFD mínimo |
| dfa | `executarAFD(afd, cadeia) → { caminho, morreuEm, aceita, esperado }` | `morreuEm` é o índice do caractere sem transição, ou -1. `esperado` são os rótulos das transições que existiam no estado em que morreu (ou em que terminou), para montar o motivo da rejeição |
| dfa | `grafoAFD(afd) → Grafo` | Para o visual |
| exemplos | `gerarExemplos(afd, k) → { aceitas, rejeitadas }` | Até `k` cadeias de cada tipo (`string[]`). As aceitas são as mais curtas |
| arvore | `montarArvore(container, ast, { aoSelecionar }) → { destacar(ids) }` | Desenho 2D da árvore sintática. Clicar num nó chama `aoSelecionar(id)` |
| painel | `montarPainel(container, { afn, afd, min, ast }) → { destacarNos(ids), passo(i), executar(cadeia) }` | As três visões sincronizadas |
| linguagem | `equivalentes(afdA, afdB) → { iguais, contraexemplo, so }` | `contraexemplo` é a menor cadeia aceita por só um dos dois (`null` se iguais; `""` é a cadeia vazia). `so` é `'A'`, `'B'` ou `null` |
| linguagem | `complemento(afd) → AFD` | Devolve com `aceitaMorto: true` |
| linguagem | `produto(afdA, afdB, modo) → AFD` | `modo` é `'intersecao'`, `'uniao'` ou `'diferenca'`. Só os estados alcançáveis |
| contagem | `contarCadeias(afd, n) → BigInt` | Cadeias de tamanho exatamente `n` aceitas |
| contagem | `classificar(afd) → { tipo, maxTamanho }` | `tipo` é `'vazia'`, `'finita'` ou `'infinita'`. `maxTamanho` é o tamanho da maior cadeia (só se finita, senão `null`) |
| comparar | `montarComparar(container, { compilar, equivalentes, produto })` | Aba Comparar |
| scanner | `maisLongo(afd, texto, pos) → number` | Tamanho do maior prefixo aceito a partir de `pos` (0 se nenhum) |
| scanner | `varrer(texto, padroes) → [ { inicio, fim, padrao } ]` | Destaques de um texto. Cada padrão traz o seu `afd` já pronto |
| backtrack | `casarBacktracking(ast, cadeia, limite) → { aceita, passos, estourou }` | Para o Duelo |
| viz3d | `new Viz3D(canvas)`, `setGrafo(grafo)`, `setAtivos(ids)`, `animar(fases)` | Desenho e animação |

## Como as partes se ligam sem depender umas das outras

Os módulos **não se importam entre si**. Quem precisa de uma função de outra parte a recebe por parâmetro:

- `montarLab(container, { compilar })`
- `montarChat(container, { varrer, aoClicar })`
- `montarForm(container, { executarAFD })`

Quem junta tudo é o `src/main.js`, no final. Enquanto isso, cada pessoa testa a sua parte com os exemplos abaixo.

## Exemplos prontos para testar sozinho

ER `(a|b)*ab` (termina em `ab`). Aceita `ab`, `aab`, `bbab`. Rejeita `a`, `ba`, `abb`.

**AFN** (escrito à mão, com um movimento vazio):

```
{
  n: 4, start: 0, accept: 3,
  trans: [
    { eps: [1], mov: [] },
    { eps: [], mov: [ { set: new Set(['a','b']), to: 1 }, { set: new Set(['a']), to: 2 } ] },
    { eps: [], mov: [ { set: new Set(['b']), to: 3 } ] },
    { eps: [], mov: [] }
  ]
}
```

**AFD mínimo esperado** (3 estados, `q2` aceita):

```
q0 --a--> q1     q0 --b--> q0
q1 --a--> q1     q1 --b--> q2
q2 --a--> q1     q2 --b--> q0
```

Em formato do contrato: `n: 3, start: 0, aceita: Set{2}, trans: [ Map{a→1,b→0}, Map{a→1,b→2}, Map{a→1,b→0} ]`.

**Grafo** desse AFD (entrada da Parte 4):

```
{
  states: [
    { id: 0, label: 'q0', start: true,  accept: false },
    { id: 1, label: 'q1', start: false, accept: false },
    { id: 2, label: 'q2', start: false, accept: true  }
  ],
  edges: [
    { from: 0, to: 1, label: 'a' }, { from: 0, to: 0, label: 'b' },
    { from: 1, to: 1, label: 'a' }, { from: 1, to: 2, label: 'b' },
    { from: 2, to: 1, label: 'a' }, { from: 2, to: 0, label: 'b' }
  ]
}
```

**AFD dos subconjuntos** do mesmo AFN (4 estados, `q3` aceita). Os estados `q0` e `q2` são equivalentes, por isso o mínimo tem 3:

```
{
  n: 4, start: 0, aceita: Set{3},
  trans: [ Map{a→1,b→2}, Map{a→1,b→3}, Map{a→1,b→2}, Map{a→1,b→2} ],
  subconjuntos: [ [0,1], [1,2], [1], [1,3] ]
}
```

No AFD mínimo, `classes: [ [0,2], [1], [3] ]`, ou seja, o `q0` do mínimo junta os estados 0 e 2 do AFD acima.

**Árvore** da ER `a(b|c)*`:

```
{ id: 1, t: 'cat', trecho: [0, 7],
  a: { id: 2, t: 'char', set: Set{'a'}, trecho: [0, 1] },
  b: { id: 3, t: 'star', trecho: [1, 7],
       a: { id: 4, t: 'alt', trecho: [2, 5],
            a: { id: 5, t: 'char', set: Set{'b'}, trecho: [2, 3] },
            b: { id: 6, t: 'char', set: Set{'c'}, trecho: [4, 5] } } } }
```

Aceita `a`, `ab`, `ac`, `abbc`, `accc`. Rejeita `b`, `ba`, `abcx`.

## Exemplos dos extras avançados

Todos usam o AFD mínimo da ER indicada.

| Chamada | Resultado esperado |
| --- | --- |
| `equivalentes(min('a(b\|c)*'), min('a(c\|b)*'))` | `{ iguais: true, contraexemplo: null, so: null }` |
| `equivalentes(min('ab*'), min('a(b\|c)*'))` | `{ iguais: false, contraexemplo: 'ac', so: 'B' }` |
| `equivalentes(min('(a\|b)*'), min('(a\|b)*ab'))` | `{ iguais: false, contraexemplo: '', so: 'A' }` |
| `contarCadeias(min('[0-9]{2}'), 2)` | `100n` |
| `contarCadeias(min('[0-9]{2}'), 3)` | `0n` |
| `contarCadeias(min('[A-Z]{3}[0-9][A-Z][0-9]{2}'), 7)` | `456976000n` (26³ × 10 × 26 × 10²) |
| `classificar(min('ab\|cd'))` | `{ tipo: 'finita', maxTamanho: 2 }` |
| `classificar(min('a*'))` | `{ tipo: 'infinita', maxTamanho: null }` |
| `classificar(min('[0-9]{2}'))` | `{ tipo: 'finita', maxTamanho: 2 }` |

Aqui `min(er)` quer dizer "a ER passada pelo parser, AFN, AFD e minimização". Enquanto o motor não está pronto, quem faz o extra monta os AFDs à mão no formato do contrato.

## Convenções

- Nomes e comentários em português.
- Cada arquivo de `src/` funciona no navegador e no Node (para os testes). Padrão sugerido: exportar com `module.exports` quando `module` existir e pendurar em `window.Raio` quando não.
