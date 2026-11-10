# Divisão de tarefas

Regra de ouro: **ninguém espera ninguém.** Cada parte recebe uma entrada em um formato combinado (\`CONTRATOS.md\`), entrega uma saída nesse formato, e tem exemplos prontos para testar sozinha. No final, juntar tudo é só ligar os módulos.

Troquem os nomes como quiserem. O importante é cada pessoa ser dona de uma parte e conseguir explicá-la no vídeo.

| Pessoa | Parte |
| --- | --- |
| Gustavo | 1. Parser de ER + AFN (Thompson passo a passo) + explicação por operador |
| Sofia | 2. AFD + minimização + exemplos + tabela + árvore sintática |
| Luciana | 3. Varredura de texto + Chat + Formulário + modo desafio |
| Pierre | 4. Visual 3D + painel com 3 visões sincronizadas + Laboratório + página base |

**(M)** = mínimo obrigatório, **(E)** = extra se der tempo.

## Usando o Claude (ou outro LLM) na sua parte

Podem usar, o professor permite e até incentiva. Três cuidados:

1. **Entendam o que foi gerado.** No vídeo cada um explica a própria parte, e o professor vai perceber se a explicação for rasa. Peçam para o Claude explicar cada função, e depois expliquem de volta com as suas palavras.
2. **Declarem o uso** no README e no vídeo (o que foi feito com ajuda e como).
3. **O roteiro do vídeo não deve ser gerado por LLM.**

Prompt de partida sugerido: _"Leia docs/CONTRATOS.md e a minha parte em docs/TAREFAS.md. Implemente só os arquivos da minha parte, respeitando os formatos do contrato, e teste com os exemplos prontos. Depois me explique o que cada função faz."_

---

## Parte 1: Gustavo (parser + AFN + passo a passo + explicação)

**Entrada:** uma ER em texto. Não depende de ninguém.
**Arquivos:** \`src/parser.js\`, \`src/nfa.js\`, \`src/explicacao.js\`, \`src/backtrack.js\`, \`src/duelo.js\`, \`tests/parser.test.js\`, \`tests/nfa.test.js\`
**Testa sozinho:** \`parse('a(b|c)*')\` e conferir a árvore (exemplo no contrato); rodar o AFN com \`tracoAFN\`.

1. **(M)** Ler ER simples (letras, \`|\`, \`*\`, parênteses) e montar a árvore (AST). **Cada nó tem um \`id\` e o \`trecho\` da ER que ele representa.**
2. **(M)** Acrescentar \`+\`, \`?\`, ponto, classes \`[a-z]\` e \`[^0-9]\`, escapes como \`\\.\`.
3. **(M)** Acrescentar \`{n}\` e \`{n,m}\` (a placa e o CPF precisam).
4. **(M)** Erros claros com posição (parêntese sem fechar, \`*\` sem nada antes).
5. **(M)** Thompson: árvore → AFN. O AFN guarda \`origem[s]\`, o \`id\` do nó da árvore que criou cada estado.
6. **(M)** \`passosThompson\`: a construção fragmento por fragmento, na ordem em que a árvore é montada, com um texto curto por passo.
7. **(M)** \`tracoAFN\`: simulação com os estados ativos a cada símbolo e o motivo de aceitar ou rejeitar.
8. **(M)** \`grafoAFN\`: o AFN no formato de grafo.
9. **(M)** \`explicar(ast)\`: uma frase por operador ("\`*\` permite repetir zero ou mais vezes"), em português, ligada ao \`id\` do nó.
10. **(E)** Backtracking sobre a árvore e a aba Duelo (\`duelo.js\`), que mostra os passos explodindo em \`(a+)+b\`. O lado do AFD é "um passo por caractere".

**Para dominar e explicar:** por que cada operador vira aquele pedaço de AFN, o que é fecho-ε, por que o backtracking é exponencial.

---

## Parte 2: Sofia (AFD + minimização + exemplos + tabela + árvore)

**Entrada:** um AFN no formato do contrato (exemplos escritos à mão em \`CONTRATOS.md\`) e uma árvore de exemplo. Não depende do parser.
**Arquivos:** \`src/dfa.js\`, \`src/exemplos.js\`, \`src/tabela.js\`, \`src/arvore.js\`, \`tests/dfa.test.js\`, \`tests/equivalencia.test.js\`
**Testa sozinha:** o AFN de exemplo vira o AFD esperado (também no contrato); a árvore de exemplo é desenhada.

1. **(M)** Fecho-ε e subconjuntos: AFN → AFD, guardando o conteúdo de cada estado em \`subconjuntos\`.
2. **(M)** \`executarAFD\`: caminho, onde a cadeia morreu e \`esperado\` (o que o estado aceitava ali), para montar o motivo da rejeição.
3. **(M)** Minimização, removendo inalcançáveis e o morto, guardando \`classes\`.
4. **(M)** \`grafoAFD\`: o AFD no formato de grafo.
5. **(M)** Teste de equivalência: cadeias aleatórias aceitas igualmente pelo AFN, AFD e mínimo.
6. **(M)** \`src/arvore.js\`: desenhar a árvore sintática em 2D, com \`destacar(ids)\` e clique em nó chamando \`aoSelecionar(id)\`. Testa numa página própria (\`demo-arvore.html\`) com a árvore de exemplo.
7. **(M)** \`gerarExemplos(afd, k)\`: cadeias aceitas (as mais curtas, por busca em largura) e rejeitadas (variações das aceitas).
8. **(E)** \`src/tabela.js\`: tabela HTML da conversão (estado, conteúdo, transições).

**Para dominar e explicar:** por que o AFD pode ter até 2^n estados, o que é dois estados serem equivalentes, estado morto contra estado que ainda pode aceitar.

---

## Parte 3: Luciana (varredura + Chat + Formulário + desafio)

**Entrada:** um AFD no formato do contrato. Para testar sozinha, escreve um AFD de padrão à mão (ou uma funçãozinha de teste que monta um AFD linear a partir de uma lista de classes). Não depende do motor.
**Arquivos:** \`src/scanner.js\`, \`src/patterns.js\`, \`src/chat.js\`, \`src/form.js\`, \`src/desafio.js\`, \`tests/scanner.test.js\`
**Testa sozinha:** \`varrer("a placa é ABC1D23", padroes)\` devolve o trecho certo.

1. **(M)** \`patterns.js\`: nome, ER, cor e exemplos. Começar pela placa e pelo telefone.
2. **(M)** \`maisLongo(afd, texto, pos)\`: maior prefixo aceito a partir de uma posição.
3. **(M)** \`varrer\`: em cada posição, qual padrão casa mais longo, resolvendo empates e conflitos (CEP contra telefone).
4. **(M)** Borda de palavra: \`ABC1D234\` não é placa.
5. **(M)** \`chat.js\`: aba Chat com mensagens de exemplo, destaque ao vivo na digitação e \`aoClicar(padrao, trecho)\` ligado ao painel no final. Testa em \`demo-chat.html\`.
6. **(M)** \`form.js\`: aba Formulário com os estados válido, incompleto e inválido, usando \`executarAFD\` recebido por parâmetro.
7. **(M)** Os outros padrões (CPF, e-mail, link, data, CEP, valor, hashtag).
8. **(E)** \`desafio.js\`: modo desafio mínimo. Mostra uma cadeia, a pessoa escolhe "aceita" ou "rejeita", e o autômato revela o resultado e o motivo. Usa \`gerarExemplos\` e \`executarAFD\` recebidos por parâmetro.

**Para dominar e explicar:** por que "maior casamento" (longest match), como um autômato vira um reconhecedor de tokens, o que é um analisador léxico.

---

## Parte 4: Pierre (visual 3D + painel + Laboratório + página base)

**Entrada:** grafos e autômatos de exemplo do contrato. Não depende do motor.
**Arquivos:** \`index.html\`, \`src/style.css\`, \`src/app.js\`, \`src/viz3d.js\`, \`src/painel.js\`, \`src/lab.js\`
**Testa sozinho:** carregar o grafo de exemplo e ver o desenho girando, as bolinhas andando e o "morreu aqui".

1. **(M)** \`index.html\` com as abas e o estilo. Cada aba é montada por uma função \`montar(container, deps)\` que cada pessoa exporta.
2. **(M)** \`Viz3D\`: estados, setas, estado inicial, aceitação com anel duplo, giro com o mouse, tudo no \`canvas\`.
3. **(M)** Posição automática dos estados para qualquer grafo.
4. **(M)** Setas curvas, laços e rótulos de transição.
5. **(M)** Animação das bolinhas (\`animar\`), com divisão no AFN, marca de "morreu aqui" e o texto do motivo.
6. **(M)** \`painel.js\`: **três visões sincronizadas** (AFN, AFD e mínimo). Clicar num estado do AFD acende no AFN os estados de \`subconjuntos\`, e clicar num estado do mínimo acende os de \`classes\`.
7. **(M)** \`painel.js\`: \`destacarNos(ids)\`, que acende no AFN os estados cuja \`origem\` está nos nós escolhidos da árvore.
8. **(M)** \`painel.js\`: **construção passo a passo**, que revela os estados do AFN conforme os passos de \`passosThompson\`.
9. **(M)** \`lab.js\`: aba Laboratório, que junta o campo de ER, a árvore, a explicação por operador, os passos de Thompson, o painel e o teste de cadeias. Recebe tudo por parâmetro. Enquanto o motor não está pronto, usa dados de exemplo.
10. **(E)** Modo claro e escuro, exportar o desenho em SVG.

**Para dominar e explicar:** como o grafo do autômato vira um desenho e o que cada elemento visual representa.

---

## Extras avançados (só depois do mínimo funcionando)

São funções puras que recebem AFDs e devolvem um resultado, então não dependem de ninguém. Quem terminar o mínimo antes pega uma. Donos sugeridos:

**Extra A: comparar linguagens (Sofia, \`src/linguagem.js\`)**
- \`equivalentes(afdA, afdB)\`: diz se duas ERs reconhecem a mesma linguagem. Se não, devolve a **menor cadeia** que só uma aceita e qual das duas aceita. Base: o AFD mínimo é único, então dois mínimos iguais significam linguagens iguais.
- \`complemento(afd)\`: completa com o estado morto e inverte a aceitação.
- \`produto(afdA, afdB, modo)\`: autômato produto, com \`modo\` igual a \`'intersecao'\`, \`'uniao'\` ou \`'diferenca'\`. Mostra que as linguagens regulares são fechadas nessas operações.

**Extra B: contar cadeias (Luciana, \`src/contagem.js\`)**
- \`contarCadeias(afd, n)\`: quantas cadeias de tamanho exatamente \`n\` o AFD aceita (programação dinâmica em cima do autômato, usando \`BigInt\`).
- \`classificar(afd)\`: diz se a linguagem é vazia, finita ou infinita.
- No Chat, mostrar "quantas placas existem?" calculado pelo autômato (a placa Mercosul dá 456.976.000).

**Extra C: aba Comparar (Pierre, \`src/comparar.js\`)**
- Dois campos de ER, resultado de \`equivalentes\`, e o autômato produto no painel 3D para a diferença e a interseção.

---

## Juntar tudo (todo mundo, no final)

1. Em \`src/main.js\`, ligar \`compilar = er → parse → construirAFN → afnParaAFD → minimizar\` e passar as funções para as abas.
2. Ligar o \`aoClicar\` do Chat ao painel e o \`aoSelecionar\` da árvore ao \`destacarNos\`.
3. Rodar o fluxo completo com a placa e com \`a(b|c)*\`.

Depois, cada um:
- [ ] Testes do próprio módulo passando (\`node --test\`).
- [ ] Preencher no README o uso de LLM.
- [ ] Gravar o próprio trecho do vídeo, com as próprias palavras (\`VIDEO.md\`).

## Regras de Git

- Uma branch por pessoa (\`parte-1-gustavo\`, \`parte-2-sofia\`, \`parte-3-luciana\`, \`parte-4-pierre\`).
- Cada um mexe só nos seus arquivos, então não dá conflito.
- Commits pequenos e frequentes. Integrar na \`main\` por pull request ou com um \`git pull\` antes de cada push.
