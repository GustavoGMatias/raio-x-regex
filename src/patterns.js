// Padrões que o Chat e o Formulário reconhecem: nome, ER, cor e exemplos.
// Este arquivo só DESCREVE os padrões. Quem transforma a ER em AFD é o motor
// (parse → AFN → AFD → mínimo), ligado no main.js. Lá cada padrão ganha o campo afd.
//
// maiusculas: true quer dizer que o texto é convertido para maiúscula antes de
// passar pelo autômato. Assim "abc1d23" também é reconhecido, mas o autômato
// continua pequeno e só com maiúsculas (e a contagem dá o número real de placas).
//
// A ORDEM da lista importa: no varrer, se dois padrões casam o mesmo tamanho,
// ganha o que vem primeiro.

(function () {
  // Letras acentuadas do português, para a hashtag aceitar #automação.
  const ACENTOS = 'áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ';

  const padroes = [
    {
      nome: 'placa',
      // Placa Mercosul: 3 letras, 1 dígito, 1 letra, 2 dígitos (ABC1D23).
      // O autômato só conhece maiúsculas; as minúsculas entram pela conversão.
      er: '[A-Z]{3}[0-9][A-Z][0-9]{2}',
      maiusculas: true,
      cor: '#f59e0b',
      descricao: 'Placa Mercosul: 3 letras, 1 dígito, 1 letra e 2 dígitos',
      exemplos: ['ABC1D23', 'BRA2E19', 'XYZ9K88'],
      naoExemplos: ['ABC1D234', 'AB1C23', 'ABC-1234', 'ABC1223'],
    },
    {
      nome: 'telefone',
      // Começo opcional, de três jeitos:
      //   "+55 11 ", "+55 (11) " ou "+5511"  (com +55, o DDD é obrigatório)
      //   "(11) " ou "(11)"
      //   "11 "                            (sem parênteses, precisa do espaço)
      // Depois: 9 opcional (celular), 4 dígitos, hífen opcional e mais 4 dígitos.
      er: '(\\+55 ?(\\([0-9]{2}\\) ?|[0-9]{2} ?)|\\([0-9]{2}\\) ?|[0-9]{2} )?9?[0-9]{4}-?[0-9]{4}',
      cor: '#10b981',
      descricao: 'Telefone com +55 e DDD opcionais, fixo (8 dígitos) ou celular (9 dígitos)',
      exemplos: [
        '(11) 98765-4321', '(11)98765-4321', '11 98765-4321', '98765-4321', '3456-7890', '987654321',
        '+55 11 98765-4321', '+55 (11) 98765-4321', '+5511987654321',
      ],
      naoExemplos: ['(11 98765-4321', '98765-432', '1234-56789', '+55 98765-4321', '55 11 98765-4321'],
    },
    {
      nome: 'CEP',
      // 5 dígitos, hífen opcional, 3 dígitos.
      // CONFLITO: "34567890" (8 dígitos sem hífen) também é telefone. Os dois casam
      // o mesmo tamanho, então ganha quem vem antes na lista: o telefone.
      // No Formulário não há disputa, e o campo CEP aceita "01310100".
      er: '[0-9]{5}-?[0-9]{3}',
      cor: '#8b5cf6',
      descricao: 'CEP: 5 dígitos, hífen opcional e 3 dígitos',
      exemplos: ['01310-100', '58051-900', '01310100'],
      naoExemplos: ['0131-0100', '01310-10', '013100-100'],
    },
    {
      nome: 'CPF',
      // 3 dígitos . 3 dígitos . 3 dígitos - 2 dígitos, com a pontuação opcional.
      // Só confere o FORMATO: os dígitos verificadores não são calculados.
      er: '[0-9]{3}\\.?[0-9]{3}\\.?[0-9]{3}-?[0-9]{2}',
      cor: '#ef4444',
      descricao: 'CPF com ou sem pontuação (só o formato, sem dígito verificador)',
      exemplos: ['123.456.789-09', '12345678909', '123.456.78909'],
      naoExemplos: ['123.456.789-0', '123-456-789-09', '1234567890'],
    },
    {
      nome: 'data',
      // dia/mês/ano. Dia de 1 a 31 e mês de 1 a 12, com ou sem zero na frente.
      // Ano com 2 ou 4 dígitos. Não sabe que fevereiro não tem dia 31.
      er: '(0?[1-9]|[12][0-9]|3[01])/(0?[1-9]|1[0-2])/([0-9]{2}|[0-9]{4})',
      cor: '#3b82f6',
      descricao: 'Data no formato dia/mês/ano (o ano com 2 ou 4 dígitos)',
      exemplos: ['10/11/2026', '5/3/26', '31/12/1999', '01/01/2000'],
      naoExemplos: ['32/01/2026', '10/13/2026', '00/10/2026', '10/11/202', '10-11-2026'],
    },
    {
      nome: 'valor',
      // "R$", espaço opcional, o número (com pontos de milhar OU todo junto)
      // e os centavos opcionais depois da vírgula.
      er: 'R\\$ ?([0-9]{1,3}(\\.[0-9]{3})+|[0-9]+)(,[0-9]{2})?',
      cor: '#14b8a6',
      descricao: 'Valor em reais, com ou sem centavos e pontos de milhar',
      exemplos: ['R$ 1.234,56', 'R$1500', 'R$ 10,00', 'R$ 1.000.000', 'R$ 5'],
      naoExemplos: ['R$ ,50', 'R$', '1.234,56', 'R$ 1.23,00'],
    },
    {
      nome: 'e-mail',
      // nome@dominio.algumacoisa, terminando em pelo menos 2 letras (.br, .com).
      er: '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}',
      cor: '#ec4899',
      descricao: 'E-mail: nome@domínio, terminando em .com, .br etc.',
      exemplos: ['luciana@ufx.edu.br', 'fulano.silva+lfc@gmail.com', 'a@b.co'],
      naoExemplos: ['luciana@', '@ufx.br', 'luciana@ufx', 'luciana@ufx.b'],
    },
    {
      nome: 'link',
      // Começa com http://, https:// ou www., depois o domínio com pelo menos um ponto
      // e um caminho opcional. O caminho não pode terminar em pontuação, para que
      // em "veja https://ufx.br/lfc." o ponto final da frase fique de fora.
      er: '(https?://|www\\.)[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)+(/([A-Za-z0-9._~%/?=&#+-]*[A-Za-z0-9_~%/=&#+-])?)?',
      cor: '#6366f1',
      descricao: 'Link começando com http://, https:// ou www.',
      exemplos: ['https://ufx.br/lfc', 'http://site.com', 'www.google.com', 'https://a.com/busca?q=lfc&p=2'],
      naoExemplos: ['http://', 'google.com', 'https://localhost', 'https://ufx.br/lfc.'],
    },
    {
      nome: 'hashtag',
      // "#" seguido de uma ou mais letras (inclusive acentuadas), dígitos ou "_".
      er: '#[A-Za-z0-9_' + ACENTOS + ']+',
      cor: '#f97316',
      descricao: 'Hashtag: # seguido de letras, números ou _',
      exemplos: ['#lfc', '#automação', '#projeto_1'],
      naoExemplos: ['#', '# lfc', 'lfc'],
    },
  ];

  const api = { padroes };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
