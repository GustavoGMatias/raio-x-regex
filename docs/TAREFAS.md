# Divisão de tarefas

Quatro partes de peso parecido. Troquem os nomes como quiserem, o que importa é que cada pessoa seja dona de uma parte e consiga explicá-la no vídeo.

| Pessoa | Parte |
| --- | --- |
| Gustavo | 1. Parser de ER + AFN (Thompson) + aba Duelo |
| Sofia | 2. AFD (subconjuntos) + minimização + simulação + testes de equivalência |
| Luciana | 3. Varredura de texto + padrões + abas Chat e Formulário |
| Pierre | 4. Visual 3D + aba Laboratório + painel do autômato |

## Parte 1: Parser de ER + AFN + Duelo

**Arquivos:** `src/parser.js`, `src/nfa.js`, `src/backtrack.js`, `tests/parser.test.js`, `tests/nfa.test.js`

- Ler uma ER em texto e montar a árvore (AST): união `|`, concatenação, `*`, `+`, `?`, parênteses, classes `[a-z]`, `[^0-9]`, ponto, escapes como `\.` e repetição `{n}` / `{n,m}`.
- Mensagens de erro claras com a posição (ex.: parêntese sem fechar).
- Construção de Thompson: transformar a árvore em AFN com movimentos vazios.
- Simulação do AFN que devolve o passo a passo (conjunto de estados ativos a cada símbolo), para o visual.
- Aba Duelo: matcher por backtracking sobre a mesma árvore, com contador de passos e limite.

**Para dominar e explicar:** por que cada operador vira aquele pedaço de AFN, o que é fecho-ε, por que o backtracking é exponencial em `(a+)+b`.

## Parte 2: AFD + minimização + simulação

**Arquivos:** `src/dfa.js`, `tests/dfa.test.js`, `tests/equivalencia.test.js`

- Construção dos subconjuntos: AFN para AFD, guardando qual conjunto de estados do AFN cada estado do AFD representa (o visual usa isso na tabela de conversão).
- Minimização do AFD (Moore ou Hopcroft), removendo estados inalcançáveis e o estado morto.
- Simulação do AFD que devolve o caminho de estados e onde a cadeia morreu, se morreu.
- Maior prefixo aceito a partir de uma posição (a varredura da Parte 3 usa isso).
- Teste de equivalência: gerar cadeias aleatórias e conferir que AFN, AFD e AFD mínimo aceitam exatamente as mesmas.

**Para dominar e explicar:** por que o AFD pode ter até 2^n estados, o que significa dois estados serem equivalentes, a diferença entre estado morto e estado que ainda pode aceitar.

## Parte 3: Varredura + padrões + Chat e Formulário

**Arquivos:** `src/scanner.js`, `src/patterns.js`, `src/chat.js`, `src/form.js`, `tests/scanner.test.js`

- Lista de padrões (tabela do README) compilados pelo motor, com cor e exemplos.
- Varredura de um texto inteiro: em cada posição, ver qual padrão casa mais longo, resolver empates e conflitos (ex.: CEP contra telefone) e respeitar bordas de palavra.
- Aba Chat: mensagens, caixa de digitação com destaque ao vivo, clique no destaque chama o painel do autômato (Parte 4).
- Aba Formulário: campos com estado válido, incompleto ou inválido.

**Para dominar e explicar:** por que "maior casamento" (longest match), como um autômato vira um reconhecedor de tokens, o que é um analisador léxico.

## Parte 4: Visual 3D + Laboratório + painel

**Arquivos:** `src/viz3d.js`, `src/painel.js`, `src/lab.js`, `index.html`, `src/style.css`, `src/app.js`

- Desenhar um autômato em 3D no `canvas`: posições dos estados, setas curvas, laços, estado inicial, estado de aceitação com anel duplo, rótulos de transição.
- Animação das bolinhas percorrendo as setas, com divisão no AFN e marca de "morreu aqui".
- Painel reutilizável: alterna entre AFN, AFD e AFD mínimo, mostra contagem de estados e tabela de conversão.
- Aba Laboratório: campo de ER, exemplos prontos, teste de cadeias.
- Estrutura da página, abas e estilo.

**Para dominar e explicar:** como o grafo do autômato vira um desenho, o que cada elemento visual representa.

## Todo mundo

- Escrever os testes do próprio módulo.
- Gravar o próprio trecho do vídeo (ver `VIDEO.md`).
- Preencher no README o que foi feito com ajuda de LLM.
- Mexer só nos arquivos da sua parte e combinar pelos formatos de `CONTRATOS.md`, para não dar conflito no Git.

## Ordem sugerida

1. **Primeiro, juntos:** combinar `CONTRATOS.md` (10 minutos). Com os formatos fechados, as 4 partes andam em paralelo.
2. **Cada um na sua parte**, começando pelo mínimo.
3. **Integração:** juntar tudo e rodar o fluxo completo com um padrão (a placa).
4. **Extras**, só depois que o mínimo estiver funcionando.
5. **Vídeo.**

## Regras de Git

- Uma branch por pessoa (`parte-1-gustavo`, `parte-2-sofia`, e assim por diante).
- Commits pequenos e frequentes. Integrar na `main` por pull request ou com um `git pull` antes de cada push.
