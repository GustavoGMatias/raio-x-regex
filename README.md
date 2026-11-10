# Raio-X de Regex

Projeto 1 de Linguagens Formais e Computabilidade (UFPB, prof. Andrei Formiga): uma aplicação que mostra o **autômato finito que existe por trás** de coisas que usamos todo dia, como o destaque de uma placa ou de um telefone num chat.

Equipe: Gustavo, Sofia, Luciana e Pierre.

## A ideia

Todo mundo já viu um app pintar um link, um telefone ou um CPF sozinho, e ninguém pensa em como ele sabe. A resposta é um autômato finito. O Raio-X mostra a aplicação funcionando normalmente e, com um clique, abre o autômato 3D que está rodando por trás, lendo exatamente o mesmo texto.

O ponto central do trabalho é que **o motor de expressões regulares é nosso**: não usamos `re`, `RegExp` nem biblioteca pronta para reconhecer padrões. O fluxo é:

```
ER  →  AFN (Thompson)  →  AFD (subconjuntos)  →  AFD mínimo  →  simulação
```

## O que o app tem (4 abas)

1. **Chat.** Conversa de mensagens em que placa, telefone, CPF, e-mail, link, data, CEP, valor em reais e hashtag são destacados sozinhos. Clicar num destaque abre o autômato daquele padrão e reproduz o trecho reconhecido.
2. **Formulário.** Campos (CPF, placa, e-mail etc.) que mudam de cor enquanto a pessoa digita: **válido** (estado de aceitação), **incompleto** (estado vivo, ainda pode virar válido) ou **inválido** (estado morto). Mostra na prática o que é um estado morto.
3. **Laboratório.** O usuário digita qualquer ER e vê o AFN, o AFD e o AFD mínimo em 3D, com a contagem de estados de cada um e a tabela de conversão. Dá para testar cadeias e ver as bolinhas se dividindo no AFN.
4. **Duelo.** Compara o nosso AFD com um matcher por backtracking numa ER problemática, como `(a+)+b`. O backtracking explode e o AFD continua instantâneo.

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

**Mínimo (tem que funcionar):** parser de ER, AFN, AFD, minimização, simulação, abas Chat e Laboratório, visual 3D, testes e vídeo.

**Extras (se der tempo):** aba Formulário, aba Duelo, tabela de conversão passo a passo, modo claro e escuro, exportar o autômato em JSON ou SVG.

## Tecnologia

JavaScript puro, sem framework e sem etapa de build. Abre direto no navegador (`index.html`). Os testes rodam com o Node: `node --test`. O 3D é feito em `canvas`, com projeção própria, para funcionar offline na hora de gravar o vídeo.

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

Preencher antes de gravar o vídeo, porque o professor exige que o grupo diga se usou e como: _(escrever aqui o que foi feito com ajuda de LLM e o que foi feito sem)_.

O roteiro do vídeo **não** deve ser gerado por LLM. Cada pessoa escreve e fala o seu trecho com as próprias palavras.

## Como rodar

_(preencher quando o projeto estiver pronto)_
