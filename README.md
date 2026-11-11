# Raio-X de Regex

Projeto 1 de Linguagens Formais e Computabilidade (UFPB, prof. Andrei Formiga): uma aplicação que mostra o **autômato finito que existe por trás** de coisas que usamos todo dia, como o destaque de uma placa ou de um telefone num chat.

Equipe: Gustavo, Sofia, Luciana e Pierre.

## A ideia

Todo mundo já viu um app pintar um link, um telefone ou um CPF sozinho, e ninguém pensa em como ele sabe. A resposta é um autômato finito. O Raio-X mostra a aplicação funcionando normalmente e, com um clique, abre o autômato 3D que está rodando por trás, lendo exatamente o mesmo texto.

O ponto central do trabalho é que **o motor de expressões regulares é nosso**: não usamos `re`, `RegExp` nem biblioteca pronta para reconhecer padrões. O fluxo é:

```
ER  →  AFN (Thompson)  →  AFD (subconjuntos)  →  AFD mínimo  →  simulação
```

## O que o app tem (5 abas)

1. **Chat.** Conversa de mensagens em que placa, telefone, CPF, e-mail, link, data, CEP, valor em reais e hashtag são destacados sozinhos. Clicar num destaque abre o autômato daquele padrão e reproduz o trecho reconhecido.
2. **Formulário.** Campos (CPF, placa, e-mail etc.) que mudam de cor enquanto a pessoa digita: **válido** (estado de aceitação), **incompleto** (estado vivo, ainda pode virar válido) ou **inválido** (estado morto). Mostra na prática o que é um estado morto.
3. **Desafio.** O app mostra uma cadeia, a pessoa escolhe se o autômato aceita ou rejeita, e ele revela a resposta e o motivo, lendo a cadeia símbolo por símbolo.
4. **Laboratório.** É a parte didática. O usuário digita qualquer ER (por exemplo `a(b|c)*`) e vê:
   - a **árvore sintática** da expressão, com uma frase explicando cada operador;
   - a **construção de Thompson passo a passo**, fragmento por fragmento;
   - o **AFN, o AFD e o AFD mínimo em 3D, sincronizados**: clicar num estado do AFD acende no AFN os estados que ele representa, e clicar num nó da árvore acende o pedaço correspondente do AFN;
   - a **execução de uma cadeia símbolo por símbolo**, com as bolinhas se dividindo no AFN e o motivo de aceitar ou rejeitar.
5. **Duelo.** Compara um matcher por backtracking com o nosso AFN e o AFD mínimo numa ER problemática, como `(a+)+b`. O backtracking explode (o contador de passos estoura o limite) e o AFN e o AFD continuam em linha reta.

## Padrões do chat e do formulário

| Padrão | ER (sintaxe do nosso parser) |
| --- | --- |
| Placa (Mercosul e antiga) | `[A-Z]{3}([0-9][A-Z][0-9]{2}\|-?[0-9]{4})` |
| Telefone | `(\([0-9]{2}\) ?9?[0-9]{4}-?[0-9]{4}\|9?[0-9]{4}-[0-9]{4})` |
| CPF | `[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}` |
| E-mail | `[A-Za-z0-9._]+@[A-Za-z0-9]+(\.[A-Za-z]+)+` |
| Link | `https?://[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)+(/[A-Za-z0-9._~\-/?=&%#]*)?` |
| Data | `[0-3]?[0-9]/[0-1]?[0-9]/[0-9]{4}` |
| CEP | `[0-9]{5}-[0-9]{3}` |
| Valor em reais | `R\$ ?[0-9]+(\.[0-9]{3})*(,[0-9]{2})?` |
| Hashtag | `#[A-Za-z0-9_]+` |

São ideias de partida. O grupo pode trocar, cortar ou criar outros.

## Escopo: mínimo e extras

**Mínimo (tem que funcionar):** parser de ER, AFN com Thompson passo a passo, AFD, minimização, simulação com o motivo, árvore sintática, abas Chat, Formulário e Laboratório, três visões sincronizadas, visual 3D, testes e vídeo.

**Extras (se der tempo):** aba Duelo, modo desafio, tabela de conversão, modo claro e escuro, exportar o autômato em SVG.

**Extras avançados (só depois do mínimo funcionando):**
- **Equivalência de ERs com contraexemplo:** `a(b|c)*` e `a(c|b)*` são iguais? E `ab*` contra `a(b|c)*`? Se não, o app mostra a menor cadeia que diferencia.
- **Contagem de cadeias:** quantas placas Mercosul existem (456.976.000), calculado pelo autômato. Também diz se a linguagem é finita ou infinita.
- **Complemento, interseção e diferença** entre autômatos, com o autômato produto em 3D (aba Comparar).

## Reconhecer não é validar

O aplicativo reconhece formatos, não necessariamente valida seus significados. Uma placa pode corresponder ao padrão sintático sem representar um veículo existente. Da mesma forma, um CPF pode corresponder à máscara de 11 dígitos sem possuir dígitos verificadores válidos.

Tecnicamente, a linguagem dos CPFs válidos é finita e, portanto, regular. Entretanto, representar sua validação por um AFD explícito pode exigir uma quantidade muito grande de estados. Na prática, a validação é realizada de maneira mais eficiente por operações aritméticas sobre os dígitos verificadores.

É um bom ponto para mostrar no vídeo os limites do que um autômato faz bem.

## Tecnologia

JavaScript puro, sem framework e sem etapa de build. Abre direto no navegador (`index.html`). Os testes rodam com o Node: `node --test tests/`. O reconhecimento é todo nosso: o `RegExp` do JavaScript não é usado no app, só nos testes, como oráculo para conferir que o nosso motor dá as mesmas respostas. O 3D é feito em `canvas`, com projeção própria, para funcionar offline na hora de gravar o vídeo.

## Estrutura do repositório

```
raio-x-regex/
├── index.html
├── src/            motor e interface (um arquivo por módulo, ver docs/TAREFAS.md)
├── tests/          testes do motor
├── assets/         imagens e prints
├── docs/
│   ├── TAREFAS.md  quem faz o quê
│   ├── CONTRATOS.md formatos de dados entre os módulos
│   └── VIDEO.md    checklist do vídeo
└── README.md
```

## Uso de ferramentas baseadas em LLM

O professor exige que o grupo diga se usou LLM e como. Cada pessoa descreve abaixo o uso na sua parte. O roteiro do vídeo **não** deve ser gerado por LLM: cada pessoa escreve e fala o seu trecho com as próprias palavras.

### Parte 1: Gustavo (parser, AFN, backtracking e Duelo)

**Ferramenta:** Claude Code (assistente de IA da Anthropic), usado como agente dentro do repositório.

**O que a IA fez (a maior parte do código da Parte 1):**
- `src/parser.js`: o parser de expressões regulares, com `id` e `trecho` nos nós da árvore e mensagens de erro com posição.
- `src/nfa.js`: a construção de Thompson, `tracoAFN`, `passosThompson` e `grafoAFN`.
- `src/backtrack.js`: o matcher por backtracking com contador de passos e limite.
- `src/explicacao.js` e `src/duelo.js` (a aba Duelo).
- Os testes dessas partes (`tests/parser.test.js`, `nfa.test.js`, `backtrack.test.js`, `explicacao.test.js`, `duelo.test.js`), inclusive a comparação com o `RegExp` do JS usada como oráculo.
- Como o Pierre ficou doente, a IA também escreveu o Laboratório (`src/lab.js`), o `src/main.js` e a ligação das abas no `index.html`, em cima do que o Pierre já tinha feito.
- Uma revisão geral do projeto e as correções dela: limites contra travamento do Laboratório, remoção do `RegExp` do código do app e a coluna do AFD no Duelo. A revisão incluiu um teste com expressões aleatórias comparando o motor com o `RegExp` do JS.

**O que o Gustavo fez:**
- Usou agentes de codificação (Claude) para gerar a maior parte do código do projeto, incluindo o parser, a construção de Thompson, o AFD e a interface, e pediu os testes automatizados que conferem o motor.
- Definiu a ideia do projeto, a divisão em quatro partes independentes com contratos entre os módulos e as tarefas de cada integrante.
- Revisou o resultado de cada etapa, rodou o aplicativo e os testes e conferiu o comportamento antes de aprovar.
- Estudou os conceitos da sua parte (ER → árvore sintática, construção de Thompson, movimentos vazios e execução do AFN) para conseguir explicá-los no vídeo com as próprias palavras.
- O roteiro do vídeo foi rascunhado com ajuda do Claude e depois reescrito por cada integrante com as próprias palavras.

### Parte 2, Parte 3 e Parte 4

_(Sofia, Luciana e Pierre: descrevam aqui, cada um, o uso de LLM na sua parte.)_

## Como rodar

- **O app:** abra o `index.html` no navegador. Não precisa de servidor, de build nem de instalação. O visual usa fontes do Google Fonts; sem internet o site cai para a fonte do sistema e continua funcionando.
- **Os testes:** com o Node 18 ou mais novo, na pasta do projeto, rode `node --test tests/`.
- **Limites:** o Laboratório recusa expressões que gerariam um AFD com mais de 600 estados ou uma árvore com mais de 4000 nós, com uma mensagem explicando (é a explosão exponencial da construção dos subconjuntos, a mesma de que o vídeo fala).
