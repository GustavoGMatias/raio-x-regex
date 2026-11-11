# Checklist do vídeo

O professor pediu: apresentar o projeto, comentar como foi o desenvolvimento e **dizer se usaram LLMs e como**. Ele também deixou claro que **não recomenda usar LLM para escrever o roteiro**. Então este arquivo é só uma lista do que cobrir. Cada pessoa escreve e fala o seu trecho com as próprias palavras.

## Estrutura sugerida (cerca de 6 a 8 minutos)

1. **Abertura (10 s de demo, sem teoria):** o chat destacando placa e telefone sozinho. "Como ele sabe?"
2. **Revelação:** abrir o autômato 3D lendo a mesma cadeia.
3. **Demo central (Laboratório):** digitar `a(b|c)*` e percorrer, nesta ordem:
   1. Exibir a árvore sintática.
   2. Mostrar a construção de Thompson, passo a passo.
   3. Apresentar o AFN resultante.
   4. Converter e apresentar o AFD.
   5. Mostrar o AFD mínimo.
   6. Testar `abbc`, acompanhando o caminho percorrido e explicando por que a cadeia é aceita.

   Esse é o momento principal do vídeo, então ensaiem bastante. Se houver tempo, testar também `a` para demonstrar que `(b|c)*` pode ocorrer zero vezes.
4. **O que é o que estamos vendo:** ER, AFN, AFD, AFD mínimo, e por que isso é "linguagem regular".
5. **Cada pessoa explica a sua parte** (1 a 2 minutos cada), com o código ou a tela aberta.
6. **Aplicações e extras:** formulário (válido, incompleto, inválido) e, só dos que ficarem prontos, Duelo, comparação de ERs e contagem de cadeias.
7. **Limites:** reconhecer um formato não é validar o significado (o caso do CPF, no README).
8. **Processo:** como o grupo se dividiu, dificuldades, o que deu errado.
9. **Uso de LLM:** dizer claramente se usaram, em quais partes e como.

## O que cada pessoa precisa conseguir dizer

- **Parte 1:** como a ER vira árvore e cada operador vira um pedaço de AFN (o passo a passo de Thompson). O que é movimento vazio. Como o AFN executa uma cadeia com vários caminhos ao mesmo tempo. Por que o backtracking explode.
- **Parte 2:** como o AFN vira AFD (o que cada estado do AFD representa). Por que o AFD pode crescer muito. O que a minimização faz e por que o resultado é único. Como a árvore sintática se liga ao autômato.
- **Parte 3:** como um autômato reconhece um padrão dentro de um texto grande. Por que o maior casamento. O que significa "incompleto" contra "inválido" no formulário.
- **Parte 4:** o que cada elemento do desenho representa (estado inicial, aceitação, setas, estado ativo, estado morto). Como as três visões se sincronizam.

## Antes de gravar

- [ ] A demo roda sem internet.
- [ ] Os testes passam (`node --test`).
- [ ] O README diz como rodar e declara o uso de LLM.
- [ ] Cada pessoa treinou o seu trecho uma vez.
