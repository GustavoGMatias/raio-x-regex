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
  ];

  const api = { padroes };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
