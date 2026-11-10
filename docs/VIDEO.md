# Checklist do vídeo

O professor pediu: apresentar o projeto, comentar como foi o desenvolvimento e **dizer se usaram LLMs e como**. Ele também deixou claro que **não recomenda usar LLM para escrever o roteiro**. Então este arquivo é só uma lista do que cobrir. Cada pessoa escreve e fala o seu trecho com as próprias palavras.

## Estrutura sugerida (cerca de 6 a 8 minutos)

1. **Abertura (10 s de demo, sem teoria):** o chat destacando placa e telefone sozinho. "Como ele sabe?"
2. **Revelação:** abrir o autômato 3D lendo a mesma cadeia.
3. **O que é o que estamos vendo:** ER, AFN, AFD, AFD mínimo, e por que isso é "linguagem regular".
4. **Cada pessoa explica a sua parte** (1 a 2 minutos cada), com o código ou a tela aberta.
5. **Aplicações:** formulário (válido, incompleto, inválido) e Duelo (AFD contra backtracking).
6. **Processo:** como o grupo se dividiu, dificuldades, o que deu errado.
7. **Uso de LLM:** dizer claramente se usaram, em quais partes e como.

## O que cada pessoa precisa conseguir dizer

- **Parte 1:** como cada operador da ER vira um pedaço de AFN. O que é movimento vazio. Por que o backtracking explode.
- **Parte 2:** como o AFN vira AFD. Por que o AFD pode crescer muito. O que a minimização faz e por que o resultado é único.
- **Parte 3:** como um autômato reconhece um padrão dentro de um texto grande. Por que o maior casamento.
- **Parte 4:** o que cada elemento do desenho representa (estado inicial, aceitação, setas, estado ativo, estado morto).

## Antes de gravar

- [ ] A demo roda sem internet.
- [ ] Os testes passam (`node --test`).
- [ ] O README diz como rodar e declara o uso de LLM.
- [ ] Cada pessoa treinou o seu trecho uma vez.
