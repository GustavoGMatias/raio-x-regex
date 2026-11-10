// Painel com as três visões sincronizadas: AFN, AFD (subconjuntos) e AFD mínimo.
//
//   const painel = montarPainel(container, { afn, afd, min, ast });
//   painel.destacarNos([3, 4]);    acende no AFN os estados criados por esses nós da árvore
//   painel.passo(2);               construção de Thompson: mostra só o AFN até o passo 2
//   await painel.executar('abbc'); roda a cadeia nas três visões ao mesmo tempo
//
// Sincronização (é o que o clique faz):
//   - estado do AFD  → acende no AFN os estados de afd.subconjuntos[d]
//   - estado do mín. → acende no AFD os estados de min.classes[m] (e no AFN os deles)
//   - estado do AFN  → acende os estados do AFD que o contêm (e as classes deles no mínimo)
//
// As funções dos outros módulos (grafoAFN, grafoAFD, tracoAFN, executarAFD,
// passosThompson) podem vir em `deps`; se não vierem, são procuradas em window.Raio.
// Para grafoAFD e executarAFD há substitutos provisórios no formato do contrato,
// para o painel funcionar antes da Parte 2 ficar pronta.

(function () {
  // ---------- Parte pura (testada no Node) ----------

  // Dado um clique em `id` na visão `visao` ('afn' | 'afd' | 'min'), devolve o que
  // acender em cada visão e uma frase explicando a relação.
  function relacionar(afd, min, visao, id) {
    const subs = (afd && afd.subconjuntos) || [];
    const classes = (min && min.classes) || [];
    const classeDe = (d) => classes.findIndex((c) => c.includes(d));
    const uniao = (listas) => [...new Set(listas.flat())].sort((a, b) => a - b);
    const nomes = (ids) => '{' + ids.map((i) => 'q' + i).join(', ') + '}';

    if (visao === 'afd') {
      const doAfn = subs[id] || [];
      const m = classeDe(id);
      return {
        afn: doAfn,
        afd: [id],
        min: m >= 0 ? [m] : [],
        texto:
          `q${id} do AFD representa ${nomes(doAfn)} do AFN (os estados em que o AFN pode estar ao mesmo tempo)` +
          (m >= 0 ? ` e foi juntado em q${m} do mínimo.` : ', e foi removido na minimização.'),
      };
    }
    if (visao === 'min') {
      const doAfd = classes[id] || [];
      return {
        afn: uniao(doAfd.map((d) => subs[d] || [])),
        afd: doAfd,
        min: [id],
        texto:
          doAfd.length > 1
            ? `q${id} do mínimo junta ${nomes(doAfd)} do AFD: são estados equivalentes, aceitam exatamente as mesmas continuações.`
            : `q${id} do mínimo corresponde só a q${doAfd[0]} do AFD: não havia outro estado equivalente a ele.`,
      };
    }
    // visao === 'afn'
    const doAfd = subs.map((s, d) => (s.includes(id) ? d : -1)).filter((d) => d >= 0);
    const doMin = [...new Set(doAfd.map(classeDe).filter((m) => m >= 0))].sort((a, b) => a - b);
    return {
      afn: [id],
      afd: doAfd,
      min: doMin,
      texto: doAfd.length
        ? `q${id} do AFN aparece nos estados ${nomes(doAfd)} do AFD.`
        : `q${id} do AFN não aparece em nenhum estado do AFD (ele só é atravessado por movimentos vazios).`,
    };
  }

  // Estados do AFN cuja origem está entre os nós escolhidos da árvore.
  function estadosDosNos(afn, ids) {
    if (!afn.origem) return [];
    const alvo = new Set(ids);
    const r = [];
    afn.origem.forEach((no, s) => { if (alvo.has(no)) r.push(s); });
    return r;
  }

  // Estados do AFN visíveis até o passo i da construção de Thompson (acumulado).
  function visiveisAte(passos, i) {
    const vis = new Set();
    for (let k = 0; k <= i && k < passos.length; k++) for (const s of passos[k].estados) vis.add(s);
    return [...vis].sort((a, b) => a - b);
  }

  // ---------- Substitutos provisórios (formato do contrato) ----------

  function grafoAFDProvisorio(afd, rotular) {
    const states = [];
    for (let id = 0; id < afd.n; id++) {
      states.push({ id, label: 'q' + id, start: id === afd.start, accept: afd.aceita.has(id) });
    }
    const edges = [];
    afd.trans.forEach((m, de) => {
      const porDestino = new Map();
      for (const [c, para] of m) {
        if (!porDestino.has(para)) porDestino.set(para, new Set());
        porDestino.get(para).add(c);
      }
      for (const [para, chars] of porDestino) {
        edges.push({ from: de, to: para, label: rotular ? rotular(chars) : [...chars].sort().join(', ') });
      }
    });
    return { states, edges };
  }

  function executarAFDProvisorio(afd, cadeia) {
    const caminho = [afd.start];
    const chars = Array.from(cadeia);
    for (let i = 0; i < chars.length; i++) {
      const q = caminho[caminho.length - 1];
      const p = afd.trans[q].get(chars[i]);
      if (p === undefined) {
        return { caminho, morreuEm: i, aceita: !!afd.aceitaMorto, esperado: [...afd.trans[q].keys()] };
      }
      caminho.push(p);
    }
    const fim = caminho[caminho.length - 1];
    return { caminho, morreuEm: -1, aceita: afd.aceita.has(fim), esperado: [...afd.trans[fim].keys()] };
  }

  // ---------- Interface ----------

  function montarPainel(container, { afn, afd, min, ast }, deps = {}) {
    const R = (typeof window !== 'undefined' && window.Raio) || {};
    const pegar = (nome, padrao) => deps[nome] || R[nome] || padrao;
    const Viz3D = pegar('Viz3D');
    const grafoAFN = pegar('grafoAFN');
    const grafoAFD = pegar('grafoAFD', (a) => grafoAFDProvisorio(a, R.rotuloConjunto));
    const tracoAFN = pegar('tracoAFN');
    const executarAFD = pegar('executarAFD', executarAFDProvisorio);
    const passosThompson = pegar('passosThompson');

    container.classList.add('painel3');
    container.innerHTML = `
      <div class="painel3-visoes">
        ${['afn', 'afd', 'min'].map((v) => `
          <section class="painel3-visao" data-visao="${v}">
            <header>
              <h3>${{ afn: 'AFN (Thompson)', afd: 'AFD (subconjuntos)', min: 'AFD mínimo' }[v]}</h3>
              <span class="mudo painel3-contagem"></span>
            </header>
            <canvas class="viz"></canvas>
          </section>`).join('')}
      </div>
      <p class="painel3-info mudo" aria-live="polite">Clique num estado de qualquer visão para ver o que ele representa nas outras.</p>`;

    const info = container.querySelector('.painel3-info');
    const automatos = { afn, afd, min };
    const viz = {};
    for (const v of ['afn', 'afd', 'min']) {
      const sec = container.querySelector(`[data-visao="${v}"]`);
      const canvas = sec.querySelector('canvas');
      viz[v] = new Viz3D(canvas, { aoClicarEstado: (id) => selecionar(v, id) });
      viz[v].setGrafo(v === 'afn' ? grafoAFN(afn) : grafoAFD(automatos[v]));
      sec.querySelector('.painel3-contagem').textContent = `${automatos[v].n} estados`;
    }

    function limpar() {
      for (const v of ['afn', 'afd', 'min']) viz[v].setDestacados([]);
    }

    function selecionar(visao, id) {
      if (id == null) {
        limpar();
        info.textContent = 'Clique num estado de qualquer visão para ver o que ele representa nas outras.';
        return;
      }
      const r = relacionar(afd, min, visao, id);
      viz.afn.setDestacados(r.afn);
      viz.afd.setDestacados(r.afd);
      viz.min.setDestacados(r.min);
      info.textContent = r.texto;
    }

    function destacarNos(ids) {
      if (!afn.origem) {
        console.warn('painel: o AFN não tem `origem`, não dá para ligar a árvore aos estados');
        return [];
      }
      const estados = estadosDosNos(afn, ids || []);
      limpar();
      viz.afn.setDestacados(estados);
      info.textContent = estados.length
        ? `Esses nós da árvore criaram os estados {${estados.map((s) => 'q' + s).join(', ')}} do AFN.`
        : '';
      return estados;
    }

    let passos = null;
    // passo(i): mostra o AFN só até o passo i. passo(null) volta a mostrar tudo.
    // Devolve { total, atual } para quem monta os controles (o Laboratório).
    function passo(i) {
      if (i == null) { viz.afn.setVisiveis(null); viz.afn.setTexto(''); return null; }
      if (!passosThompson) {
        console.warn('painel: passosThompson ainda não existe');
        return null;
      }
      if (!passos) passos = passosThompson(ast);
      const k = Math.max(0, Math.min(i, passos.length - 1));
      const atual = passos[k];
      viz.afn.parar();
      viz.afn.setAtivos([]);
      viz.afn.setVisiveis(visiveisAte(passos, k));
      viz.afn.setDestacados(atual.estados);
      viz.afn.setTexto(`Passo ${k + 1} de ${passos.length}: ${atual.texto}`);
      return { total: passos.length, atual };
    }

    async function executar(cadeia) {
      limpar();
      viz.afn.setVisiveis(null);
      const traco = tracoAFN(afn, cadeia);
      const exAfd = executarAFD(afd, cadeia);
      const exMin = executarAFD(min, cadeia);
      info.textContent = `Executando "${cadeia}" nas três visões. As três têm que concordar: reconhecem a mesma linguagem.`;
      await Promise.all([
        viz.afn.animar(Viz3D.fasesAFN(traco, afn, cadeia)),
        viz.afd.animar(Viz3D.fasesAFD(exAfd, afd, cadeia)),
        viz.min.animar(Viz3D.fasesAFD(exMin, min, cadeia)),
      ]);
      return { afn: traco.aceita, afd: exAfd.aceita, min: exMin.aceita };
    }

    function destruir() {
      for (const v of ['afn', 'afd', 'min']) viz[v].destruir();
      container.innerHTML = '';
    }

    return { destacarNos, passo, executar, selecionar, destruir, viz };
  }

  const api = { montarPainel, relacionar, estadosDosNos, visiveisAte, grafoAFDProvisorio, executarAFDProvisorio };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
