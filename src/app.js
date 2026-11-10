// Página base: barra de abas e montagem preguiçosa de cada aba.
//
// Cada aba é montada por uma função `montarX(container, deps)` exportada pela
// dona da aba (em window.Raio). `deps` vem de window.Raio.deps, que o src/main.js
// preenche no final (compilar, varrer, executarAFD...). Enquanto a função não
// existe, a aba mostra um aviso de "em construção".

(function () {
  const ABAS = [
    { id: 'chat', titulo: 'Chat', funcao: 'montarChat', dono: 'Parte 3 (Luciana)' },
    { id: 'form', titulo: 'Formulário', funcao: 'montarForm', dono: 'Parte 3 (Luciana)' },
    { id: 'desafio', titulo: 'Desafio', funcao: 'montarDesafio', dono: 'Parte 3 (Luciana)' },
    { id: 'lab', titulo: 'Laboratório', funcao: 'montarLab', dono: 'Parte 4 (Pierre)' },
    { id: 'duelo', titulo: 'Duelo', funcao: 'montarDuelo', dono: 'Parte 1 (Gustavo)' },
  ];

  function iniciarApp({ nav, conteudo, abas = ABAS, deps = () => (window.Raio && window.Raio.deps) || {} }) {
    const montadas = new Set();
    const paineis = new Map();
    const botoes = new Map();

    for (const aba of abas) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'aba';
      botao.role = 'tab';
      botao.id = 'aba-' + aba.id;
      botao.textContent = aba.titulo;
      botao.setAttribute('aria-controls', 'painel-' + aba.id);
      botao.addEventListener('click', () => { location.hash = aba.id; });
      nav.appendChild(botao);
      botoes.set(aba.id, botao);

      const painel = document.createElement('section');
      painel.className = 'painel-aba';
      painel.id = 'painel-' + aba.id;
      painel.role = 'tabpanel';
      painel.setAttribute('aria-labelledby', botao.id);
      painel.hidden = true;
      conteudo.appendChild(painel);
      paineis.set(aba.id, painel);
    }

    function montar(aba) {
      const painel = paineis.get(aba.id);
      const f = window.Raio && window.Raio[aba.funcao];
      if (typeof f !== 'function') {
        painel.innerHTML =
          `<div class="vazio"><h2>${aba.titulo}</h2>` +
          `<p>Em construção: <code>${aba.funcao}(container, deps)</code> ainda não foi carregada.</p>` +
          `<p class="mudo">Responsável: ${aba.dono}</p></div>`;
        return;
      }
      try {
        f(painel, deps());
      } catch (erro) {
        console.error(erro);
        painel.innerHTML = `<div class="vazio erro"><h2>${aba.titulo}</h2><p>Erro ao montar a aba:</p><pre></pre></div>`;
        painel.querySelector('pre').textContent = String(erro && erro.stack || erro);
      }
    }

    function mostrar(id) {
      const aba = abas.find((a) => a.id === id) || abas[0];
      for (const a of abas) {
        const ativa = a.id === aba.id;
        paineis.get(a.id).hidden = !ativa;
        botoes.get(a.id).setAttribute('aria-selected', String(ativa));
      }
      // monta só na primeira vez que a aba aparece (o canvas precisa estar visível para ter tamanho)
      if (!montadas.has(aba.id)) { montadas.add(aba.id); montar(aba); }
    }

    window.addEventListener('hashchange', () => mostrar(location.hash.slice(1)));
    mostrar(location.hash.slice(1));
    window.Raio.appIniciado = true;
    return { mostrar };
  }

  const api = { iniciarApp, ABAS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    window.Raio = window.Raio || {};
    Object.assign(window.Raio, api);
    document.addEventListener('DOMContentLoaded', () => {
      if (window.Raio.appIniciado) return;
      const nav = document.getElementById('abas');
      const conteudo = document.getElementById('conteudo');
      if (nav && conteudo) iniciarApp({ nav, conteudo });
    });
  }
})();
