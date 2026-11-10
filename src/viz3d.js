// Desenho 3D de autômatos num <canvas>, com projeção própria (sem biblioteca).
// Entrada: um Grafo no formato de docs/CONTRATOS.md.
//
//   const viz = new Viz3D(canvas, { aoClicarEstado(id) {...} });
//   viz.setGrafo(grafo);
//   viz.setAtivos([0, 1]);           estados acesos (onde estão as bolinhas)
//   viz.setDestacados([2]);          estados realçados por outra visão (sincronização)
//   viz.setVisiveis([0, 1, 2]);      só esses aparecem (construção passo a passo); null = todos
//   await viz.animar(fases);         ver o formato das fases em `animar`
//
// Viz3D.fasesAFN(traco, afn, cadeia) e Viz3D.fasesAFD(exec, afd, cadeia) convertem
// a saída de tracoAFN / executarAFD em fases prontas para `animar`.

(function () {
  const TAU = Math.PI * 2;
  const DIST_CAMERA = 4; // distância da câmera ao centro (o grafo cabe numa esfera de raio 1)

  // ---------- Layout automático ----------

  // Gerador pseudoaleatório com semente: o mesmo grafo sempre fica com o mesmo desenho.
  function aleatorio(semente) {
    let s = semente >>> 0 || 1;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }

  // Distância (em transições) de cada estado ao estado inicial, por busca em largura.
  // Estados inalcançáveis ficam numa camada depois da última.
  function profundidades(grafo) {
    const ids = grafo.states.map((s) => s.id);
    const adj = new Map(ids.map((id) => [id, []]));
    for (const e of grafo.edges) {
      if (e.from !== e.to && adj.has(e.from) && adj.has(e.to)) adj.get(e.from).push(e.to);
    }
    const prof = new Map();
    const inicios = grafo.states.filter((s) => s.start).map((s) => s.id);
    if (!inicios.length && ids.length) inicios.push(ids[0]);
    const fila = [...inicios];
    for (const i of inicios) prof.set(i, 0);
    while (fila.length) {
      const q = fila.shift();
      for (const p of adj.get(q)) {
        if (!prof.has(p)) { prof.set(p, prof.get(q) + 1); fila.push(p); }
      }
    }
    let max = 0;
    for (const v of prof.values()) max = Math.max(max, v);
    for (const id of ids) if (!prof.has(id)) prof.set(id, max + 1);
    return prof;
  }

  // Posição 3D de cada estado: Map<id, [x, y, z]>, centrada na origem e com raio máximo 1.
  // 1) cada camada da busca em largura vira uma "fatia" no eixo x (lê da esquerda para a direita);
  // 2) os estados de uma mesma camada começam num círculo no plano y-z;
  // 3) uma simulação de forças (estados se repelem, transições puxam como molas) ajeita o resto.
  function calcularLayout(grafo) {
    const ids = grafo.states.map((s) => s.id);
    const n = ids.length;
    const pos = new Map();
    if (!n) return pos;

    const prof = profundidades(grafo);
    const camadas = new Map();
    for (const id of ids) {
      const d = prof.get(id);
      if (!camadas.has(d)) camadas.set(d, []);
      camadas.get(d).push(id);
    }

    const sorteio = aleatorio(n * 7919 + grafo.edges.length * 31 + 17);
    const SEP = 1.1; // distância entre camadas
    for (const [d, lista] of camadas) {
      const k = lista.length;
      const raio = k === 1 ? 0 : 0.45 * Math.sqrt(k);
      lista.forEach((id, i) => {
        const ang = (i / k) * TAU + d * 0.9;
        pos.set(id, [
          d * SEP,
          raio * Math.cos(ang) + (sorteio() - 0.5) * 0.3,
          raio * Math.sin(ang) + (sorteio() - 0.5) * 0.3,
        ]);
      });
    }

    const P = ids.map((id) => pos.get(id));
    const indice = new Map(ids.map((id, i) => [id, i]));
    const molas = grafo.edges
      .filter((e) => e.from !== e.to && indice.has(e.from) && indice.has(e.to))
      .map((e) => [indice.get(e.from), indice.get(e.to)]);
    const alvoX = ids.map((id) => prof.get(id) * SEP);

    const ITER = n > 150 ? 100 : 250;
    for (let it = 0; it < ITER; it++) {
      const passoMax = 0.1 * (1 - it / ITER) + 0.005; // "temperatura" que vai esfriando
      const F = P.map(() => [0, 0, 0]);
      // repulsão entre todos os pares
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1], dz = P[i][2] - P[j][2];
          const d2 = dx * dx + dy * dy + dz * dz + 0.01;
          const d = Math.sqrt(d2);
          const f = 0.35 / d2;
          F[i][0] += (f * dx) / d; F[i][1] += (f * dy) / d; F[i][2] += (f * dz) / d;
          F[j][0] -= (f * dx) / d; F[j][1] -= (f * dy) / d; F[j][2] -= (f * dz) / d;
        }
      }
      // molas nas transições (comprimento natural 1)
      for (const [i, j] of molas) {
        const dx = P[j][0] - P[i][0], dy = P[j][1] - P[i][1], dz = P[j][2] - P[i][2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-6;
        const f = (d - 1) * 0.5;
        F[i][0] += (f * dx) / d; F[i][1] += (f * dy) / d; F[i][2] += (f * dz) / d;
        F[j][0] -= (f * dx) / d; F[j][1] -= (f * dy) / d; F[j][2] -= (f * dz) / d;
      }
      for (let i = 0; i < n; i++) {
        F[i][0] += (alvoX[i] - P[i][0]) * 0.3; // mantém a leitura da esquerda para a direita
        F[i][1] -= P[i][1] * 0.02;             // gravidade fraca para o centro
        F[i][2] -= P[i][2] * 0.02;
        const m = Math.hypot(F[i][0], F[i][1], F[i][2]);
        const s = m > passoMax ? passoMax / m : 1;
        P[i][0] += F[i][0] * s; P[i][1] += F[i][1] * s; P[i][2] += F[i][2] * s;
      }
    }

    // centraliza e normaliza para raio 1
    const c = [0, 0, 0];
    for (const p of P) { c[0] += p[0] / n; c[1] += p[1] / n; c[2] += p[2] / n; }
    let R = 0;
    for (const p of P) {
      p[0] -= c[0]; p[1] -= c[1]; p[2] -= c[2];
      R = Math.max(R, Math.hypot(p[0], p[1], p[2]));
    }
    if (R < 1e-9) R = 1;
    for (const p of P) { p[0] /= R; p[1] /= R; p[2] /= R; }
    return pos;
  }

  // ---------- Geometria 2D (depois da projeção) ----------

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  function quadratica(a, c, b, t) {
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
  }

  function cubica(p0, p1, p2, p3, t) {
    const u = 1 - t;
    const k0 = u * u * u, k1 = 3 * u * u * t, k2 = 3 * u * t * t, k3 = t * t * t;
    return [
      k0 * p0[0] + k1 * p1[0] + k2 * p2[0] + k3 * p3[0],
      k0 * p0[1] + k1 * p1[1] + k2 * p2[1] + k3 * p3[1],
    ];
  }

  function girar(v, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
  }

  // Ponto em t ∈ [0, 1] de uma poligonal, proporcional ao comprimento.
  function pontoNaPoligonal(pts, t) {
    if (pts.length === 1) return pts[0];
    const seg = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) { const d = dist(pts[i - 1], pts[i]); seg.push(d); total += d; }
    let alvo = Math.max(0, Math.min(1, t)) * total;
    for (let i = 0; i < seg.length; i++) {
      if (alvo <= seg[i] || i === seg.length - 1) {
        const k = seg[i] ? alvo / seg[i] : 0;
        return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
      }
      alvo -= seg[i];
    }
    return pts[pts.length - 1];
  }

  const chave = (de, para) => de + '>' + para;
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- A visualização ----------

  class Viz3D {
    constructor(canvas, opcoes = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.opcoes = { girarSozinho: true, ...opcoes };
      this.aoClicarEstado = opcoes.aoClicarEstado || null;

      this.grafo = { states: [], edges: [] };
      this.pos = new Map();
      this.profundidade = new Map();
      this.ativos = new Set();
      this.destacados = new Set();
      this.visiveis = null;
      this.marcaMorte = null;   // { ids, texto }
      this.texto = '';          // legenda (o motivo de aceitar/rejeitar, o passo atual...)
      this.tokens = [];         // bolinhas em movimento: { de, para }
      this.arestasQuentes = new Set();
      this.hover = null;

      this.yaw = -0.45;
      this.pitch = 0.3;
      this.zoom = 1;
      this.escala = 100;
      this.w = 0; this.h = 0;

      this._geracao = 0;
      this._frame = 0;
      this._ultimo = 0;
      this._proj = new Map();
      this._eventos();
      this._redimensionar();
      if (typeof ResizeObserver !== 'undefined') {
        this._ro = new ResizeObserver(() => this._redimensionar());
        this._ro.observe(canvas);
      }
    }

    // ----- API pública -----

    setGrafo(grafo) {
      this.parar();
      this.grafo = grafo || { states: [], edges: [] };
      this.pos = calcularLayout(this.grafo);
      this.profundidade = profundidades(this.grafo);
      this.ativos = new Set();
      this.destacados = new Set();
      this.visiveis = null;
      this.marcaMorte = null;
      this.texto = '';
      this.zoom = 1;
      this.raioBase = this.grafo.states.length > 40 ? 11 : this.grafo.states.length > 20 ? 14 : 17;
      this._ajustar();
      this._pedir();
    }

    setAtivos(ids) { this.ativos = new Set(ids || []); this._pedir(); }
    setDestacados(ids) { this.destacados = new Set(ids || []); this._pedir(); }
    setVisiveis(ids) { this.visiveis = ids == null ? null : new Set(ids); this._pedir(); }
    setTexto(texto) { this.texto = texto || ''; this._pedir(); }
    marcarMorte(ids, texto = 'morreu aqui') { this.marcaMorte = ids ? { ids, texto } : null; this._pedir(); }

    resetarVista() { this.yaw = -0.45; this.pitch = 0.3; this.zoom = 1; this._ajustar(); this._pedir(); }

    // Interrompe uma animação em andamento.
    parar() { this._geracao++; this.tokens = []; this.arestasQuentes = new Set(); this._pedir(); }

    // Toca uma sequência de fases. Cada fase:
    //   { arestas?: [{ de, para }],   bolinhas que andam por essas transições
    //     ativos: number[],           estados acesos ao fim da fase
    //     texto?: string,             legenda mostrada durante a fase
    //     morto?: number[] }          estados onde aparece "morreu aqui"
    // Devolve uma Promise: true se terminou, false se foi interrompida.
    async animar(fases, { duracao = 650, pausa = 300 } = {}) {
      this.parar();
      const geracao = this._geracao;
      const viva = () => geracao === this._geracao;
      this.marcaMorte = null;
      for (const fase of fases) {
        if (!viva()) return false;
        if (fase.texto != null) this.texto = fase.texto;
        const arestas = unicas(fase.arestas || []);
        if (arestas.length && duracao > 0) {
          this.tokens = arestas;
          this.arestasQuentes = new Set(arestas.map((a) => chave(a.de, a.para)));
          this.ativos = new Set();
          this._tokenInicio = agora();
          this._tokenDuracao = duracao;
          this._pedir();
          await esperar(duracao);
          if (!viva()) return false;
          this.tokens = [];
          this.arestasQuentes = new Set();
        }
        this.ativos = new Set(fase.ativos || []);
        if (fase.morto) this.marcaMorte = { ids: fase.morto, texto: 'morreu aqui' };
        this._pedir();
        await esperar(pausa);
      }
      return viva();
    }

    destruir() {
      this.parar();
      if (this._ro) this._ro.disconnect();
      cancelAnimationFrame(this._frame);
    }

    // ----- Fases prontas -----

    // A partir de tracoAFN(afn, cadeia): as bolinhas se dividem pelas transições
    // que consomem o símbolo e depois pelos movimentos vazios (fecho-ε).
    static fasesAFN(traco, afn, cadeia) {
      const chars = Array.from(cadeia);
      const fases = [{
        ativos: traco.inicial,
        texto: `Início: fecho-ε do estado inicial, ${traco.inicial.length} estado(s) ativo(s).`,
      }];
      let anteriores = traco.inicial;
      traco.passos.forEach((p, k) => {
        const leu = `Leu '${p.ch}' (símbolo ${k + 1} de ${chars.length})`;
        fases.push({ arestas: p.consome, ativos: p.mid, texto: leu + '.' });
        if (p.depois.length === 0) {
          fases.push({
            ativos: [],
            morto: anteriores,
            texto: `Rejeita: nenhum estado ativo tinha transição com '${p.ch}' (posição ${k}). Todas as bolinhas morreram.`,
          });
        } else if (p.eps.length) {
          fases.push({ arestas: p.eps, ativos: p.depois, texto: `${leu}, seguindo os movimentos vazios (ε).` });
        }
        anteriores = p.depois;
      });
      const morreu = traco.passos.length && traco.passos[traco.passos.length - 1].depois.length === 0;
      if (!morreu) {
        fases.push({
          ativos: anteriores,
          texto: traco.aceita
            ? `Aceita: a cadeia acabou com o estado de aceitação q${afn.accept} entre os ativos.`
            : `Rejeita: a cadeia acabou, mas nenhum estado ativo é de aceitação.`,
        });
      }
      return fases;
    }

    // A partir de executarAFD(afd, cadeia) = { caminho, morreuEm, aceita, esperado }.
    // `caminho` é a lista de estados visitados, começando pelo inicial.
    static fasesAFD(exec, afd, cadeia) {
      const chars = Array.from(cadeia);
      const cam = exec.caminho;
      const fases = [{ ativos: [cam[0]], texto: `Início no estado q${cam[0]}.` }];
      for (let i = 0; i + 1 < cam.length; i++) {
        fases.push({
          arestas: [{ de: cam[i], para: cam[i + 1] }],
          ativos: [cam[i + 1]],
          texto: `Leu '${chars[i]}': q${cam[i]} → q${cam[i + 1]}.`,
        });
      }
      const fim = cam[cam.length - 1];
      const esperado = exec.esperado && exec.esperado.length ? exec.esperado.join(' ou ') : 'nada';
      if (exec.morreuEm >= 0) {
        fases.push({
          ativos: [],
          morto: [fim],
          texto: `Rejeita: em q${fim} não há transição com '${chars[exec.morreuEm]}' (posição ${exec.morreuEm}). Esperava ${esperado}.`,
        });
      } else {
        fases.push({
          ativos: [fim],
          texto: exec.aceita
            ? `Aceita: a cadeia acabou em q${fim}, que é de aceitação.`
            : `Rejeita: a cadeia acabou em q${fim}, que não é de aceitação. Faltava ${esperado}.`,
        });
      }
      return fases;
    }

    // ----- Projeção -----

    _rodar(p) {
      const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      const x1 = p[0] * cy + p[2] * sy;
      const z1 = -p[0] * sy + p[2] * cy;
      const y2 = p[1] * cp - z1 * sp;
      const z2 = p[1] * sp + z1 * cp;
      const f = DIST_CAMERA / (DIST_CAMERA + z2);
      return { x: x1 * f, y: y2 * f, z: z2, f };
    }

    _projetar(p) {
      const r = this._rodar(p);
      const e = this.escala * this.zoom;
      return { x: this.w / 2 + r.x * e, y: this.h / 2 - r.y * e, z: r.z, f: r.f };
    }

    // Escolhe a escala para o grafo caber no canvas em qualquer ângulo do giro automático
    // (testa várias rotações em torno do eixo vertical, com a inclinação atual).
    _ajustar() {
      if (!this.w || !this.h) return;
      const yaw = this.yaw;
      let mx = 0.01, my = 0.01;
      for (let k = 0; k < 24; k++) {
        this.yaw = (k / 24) * TAU;
        for (const p of this.pos.values()) {
          const r = this._rodar(p);
          mx = Math.max(mx, Math.abs(r.x));
          my = Math.max(my, Math.abs(r.y));
        }
      }
      this.yaw = yaw;
      const margem = 60; // espaço para laços e para a seta do estado inicial
      const ex = (this.w / 2 - margem) / mx;
      const ey = (this.h / 2 - margem - 16) / my; // um pouco mais embaixo por causa da legenda
      this.escala = Math.max(20, Math.min(ex, ey, Math.min(this.w, this.h) * 0.7));
    }

    _redimensionar() {
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h) return;
      this.w = w; this.h = h; this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this._ajustar();
      this._pedir();
    }

    // ----- Interação -----

    _eventos() {
      const c = this.canvas;
      c.style.touchAction = 'none';
      const local = (ev) => { const r = c.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };

      c.addEventListener('pointerdown', (ev) => {
        const [x, y] = local(ev);
        this._arrasto = { x, y, yaw: this.yaw, pitch: this.pitch, moveu: false };
        c.setPointerCapture(ev.pointerId);
      });
      c.addEventListener('pointermove', (ev) => {
        const [x, y] = local(ev);
        const a = this._arrasto;
        if (a) {
          const dx = x - a.x, dy = y - a.y;
          if (Math.hypot(dx, dy) > 4) a.moveu = true;
          if (a.moveu) {
            this.yaw = a.yaw + dx * 0.01;
            this.pitch = Math.max(-1.4, Math.min(1.4, a.pitch + dy * 0.01));
            this._pedir();
          }
          return;
        }
        const id = this._acertar(x, y);
        if (id !== this.hover) {
          this.hover = id;
          c.style.cursor = id != null && this.aoClicarEstado ? 'pointer' : 'grab';
          this._pedir();
        }
      });
      c.addEventListener('pointerup', (ev) => {
        const a = this._arrasto;
        this._arrasto = null;
        if (a && !a.moveu && this.aoClicarEstado) {
          const [x, y] = local(ev);
          const id = this._acertar(x, y);
          this.aoClicarEstado(id); // null = clicou no vazio
        }
      });
      c.addEventListener('pointerenter', () => { this._mouseDentro = true; });
      c.addEventListener('pointerleave', () => {
        this._mouseDentro = false;
        if (this.hover != null) { this.hover = null; this._pedir(); }
        this._pedir();
      });
      c.addEventListener('wheel', (ev) => {
        ev.preventDefault();
        this.zoom = Math.max(0.3, Math.min(5, this.zoom * Math.exp(-ev.deltaY * 0.0015)));
        this._pedir();
      }, { passive: false });
      c.addEventListener('dblclick', () => this.resetarVista());
    }

    _acertar(x, y) {
      let melhor = null, melhorD = Infinity;
      for (const [id, p] of this._proj) {
        if (this.visiveis && !this.visiveis.has(id)) continue;
        const d = Math.hypot(p.x - x, p.y - y);
        const r = this.raioBase * p.f + 3;
        if (d <= r && p.z < melhorD) { melhor = id; melhorD = p.z; } // o mais à frente ganha
      }
      return melhor;
    }

    // ----- Laço de desenho -----

    _girando() {
      return this.opcoes.girarSozinho && !this._mouseDentro && !this._arrasto && this.grafo.states.length > 1;
    }

    _pedir() {
      if (this._frame || typeof requestAnimationFrame === 'undefined') return;
      this._frame = requestAnimationFrame((t) => this._quadro(t));
    }

    _quadro(t) {
      this._frame = 0;
      const dt = this._ultimo ? Math.min(50, t - this._ultimo) : 16;
      this._ultimo = t;
      if (this._girando()) this.yaw += dt * 0.00008;
      this._desenhar();
      if (this._girando() || this.tokens.length) this._pedir();
      else this._ultimo = 0;
    }

    _cores() {
      const s = getComputedStyle(this.canvas);
      const v = (nome, padrao) => s.getPropertyValue(nome).trim() || padrao;
      return {
        fundo: v('--viz-fundo', '#0f1420'),
        no: v('--viz-no', '#1c2333'),
        borda: v('--viz-borda', '#8b97b0'),
        texto: v('--viz-texto', '#e6ebf5'),
        aresta: v('--viz-aresta', '#5d6a85'),
        rotulo: v('--viz-rotulo', '#c9d2e3'),
        rotuloFundo: v('--viz-rotulo-fundo', '#141a28'),
        ativo: v('--viz-ativo', '#2ec4b6'),
        destaque: v('--viz-destaque', '#f4a259'),
        morto: v('--viz-morto', '#e5484d'),
        legendaFundo: v('--viz-legenda-fundo', 'rgba(15,20,32,0.85)'),
      };
    }

    _desenhar() {
      const ctx = this.ctx;
      const { w, h } = this;
      if (!w || !h) return;
      const C = this._cores();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.fundo;
      ctx.fillRect(0, 0, w, h);

      const estados = this.grafo.states;
      if (!estados.length) {
        ctx.fillStyle = C.rotulo;
        ctx.font = '14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Nenhum autômato para mostrar', w / 2, h / 2);
        return;
      }

      const visivel = (id) => !this.visiveis || this.visiveis.has(id);
      const proj = new Map();
      let fMin = Infinity, fMax = -Infinity;
      for (const s of estados) {
        const p = this._projetar(this.pos.get(s.id));
        proj.set(s.id, p);
        fMin = Math.min(fMin, p.f); fMax = Math.max(fMax, p.f);
      }
      this._proj = proj;
      const raio = (id) => this.raioBase * proj.get(id).f;
      const opacidade = (f) => (fMax - fMin < 1e-6 ? 1 : 0.45 + 0.55 * ((f - fMin) / (fMax - fMin)));

      // geometria das arestas
      const pares = new Set(this.grafo.edges.map((e) => chave(e.from, e.to)));
      const geo = new Map();
      for (const e of this.grafo.edges) {
        if (!visivel(e.from) || !visivel(e.to) || !proj.has(e.from) || !proj.has(e.to)) continue;
        geo.set(chave(e.from, e.to), this._geometria(e, proj, raio, pares));
      }
      this._geo = geo;

      // arestas
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const e of this.grafo.edges) {
        const g = geo.get(chave(e.from, e.to));
        if (!g) continue;
        const quente = this.arestasQuentes.has(chave(e.from, e.to));
        const cor = quente ? C.ativo : C.aresta;
        ctx.globalAlpha = quente ? 1 : opacidade(g.f);
        ctx.strokeStyle = cor;
        ctx.lineWidth = quente ? 2.6 : 1.5;
        ctx.beginPath();
        ctx.moveTo(g.pts[0][0], g.pts[0][1]);
        for (let i = 1; i < g.pts.length; i++) ctx.lineTo(g.pts[i][0], g.pts[i][1]);
        ctx.stroke();
        seta(ctx, g.pts[g.pts.length - 1], g.dir, 8, cor);
      }
      // rótulos das arestas por cima das linhas
      ctx.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const e of this.grafo.edges) {
        const g = geo.get(chave(e.from, e.to));
        if (!g || !e.label) continue;
        const quente = this.arestasQuentes.has(chave(e.from, e.to));
        ctx.globalAlpha = quente ? 1 : opacidade(g.f);
        // o espaço sozinho vira a palavra "espaço" (o símbolo ␣ é pequeno e parece um "_")
        const texto = e.label.split(', ').map((p) => (p === '␣' ? 'espaço' : p)).join(', ');
        pilula(ctx, texto, g.rotulo[0], g.rotulo[1], C.rotuloFundo, quente ? C.ativo : C.rotulo);
      }

      // seta de estado inicial (vem da esquerda)
      for (const s of estados) {
        if (!s.start || !visivel(s.id)) continue;
        const p = proj.get(s.id), r = raio(s.id);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = C.borda;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x - r - 28, p.y);
        ctx.lineTo(p.x - r - 3, p.y);
        ctx.stroke();
        seta(ctx, [p.x - r - 2, p.y], [1, 0], 9, C.borda);
      }

      // estados, do mais distante para o mais próximo
      const ordem = estados.filter((s) => visivel(s.id)).sort((a, b) => proj.get(b.id).z - proj.get(a.id).z);
      for (const s of ordem) {
        const p = proj.get(s.id), r = raio(s.id);
        const ativo = this.ativos.has(s.id);
        const destacado = this.destacados.has(s.id);
        ctx.globalAlpha = ativo || destacado ? 1 : opacidade(p.f);

        if (destacado) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 7, 0, TAU);
          ctx.fillStyle = C.destaque;
          ctx.globalAlpha = 0.25;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.save();
        if (ativo) { ctx.shadowColor = C.ativo; ctx.shadowBlur = 18; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fillStyle = ativo ? C.ativo : C.no;
        ctx.fill();
        ctx.restore();
        ctx.lineWidth = destacado ? 3 : this.hover === s.id ? 2.5 : 1.8;
        ctx.strokeStyle = destacado ? C.destaque : ativo ? C.ativo : C.borda;
        ctx.stroke();
        if (s.accept) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(3, r - 4), 0, TAU);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = ativo ? C.fundo : destacado ? C.destaque : C.borda;
          ctx.stroke();
        }
        ctx.fillStyle = ativo ? C.fundo : C.texto;
        ctx.font = `600 ${Math.max(9, Math.round(r * 0.68))}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.label, p.x, p.y + 0.5);
      }

      // bolinhas em movimento
      if (this.tokens.length) {
        const t = suavizar(Math.min(1, (agora() - this._tokenInicio) / this._tokenDuracao));
        ctx.globalAlpha = 1;
        for (const tk of this.tokens) {
          const g = geo.get(chave(tk.de, tk.para));
          let pt;
          if (g) pt = pontoNaPoligonal(g.pts, t);
          else if (proj.has(tk.de) && proj.has(tk.para)) {
            const a = proj.get(tk.de), b = proj.get(tk.para);
            pt = [a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t];
          } else continue;
          ctx.save();
          ctx.shadowColor = C.ativo;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], 6, 0, TAU);
          ctx.fillStyle = C.ativo;
          ctx.fill();
          ctx.restore();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = C.texto;
          ctx.stroke();
        }
      }

      // "morreu aqui"
      if (this.marcaMorte) {
        ctx.globalAlpha = 1;
        for (const id of this.marcaMorte.ids) {
          if (!proj.has(id) || !visivel(id)) continue;
          const p = proj.get(id), r = raio(id);
          ctx.strokeStyle = C.morto;
          ctx.lineWidth = 3;
          const k = r * 0.55;
          ctx.beginPath();
          ctx.moveTo(p.x - k, p.y - k); ctx.lineTo(p.x + k, p.y + k);
          ctx.moveTo(p.x + k, p.y - k); ctx.lineTo(p.x - k, p.y + k);
          ctx.stroke();
          ctx.font = '600 12px system-ui, sans-serif';
          pilula(ctx, this.marcaMorte.texto, p.x, p.y - r - 14, C.morto, '#fff');
        }
      }

      // legenda
      if (this.texto) {
        ctx.globalAlpha = 1;
        ctx.font = '14px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const linhas = quebrar(ctx, this.texto, Math.min(w - 32, 560));
        const lh = 19, pad = 10;
        const largura = Math.max(...linhas.map((l) => ctx.measureText(l).width)) + pad * 2;
        ctx.fillStyle = C.legendaFundo;
        retanguloRedondo(ctx, 12, h - 12 - linhas.length * lh - pad * 2 + 4, largura, linhas.length * lh + pad * 2 - 4, 8);
        ctx.fill();
        ctx.fillStyle = C.texto;
        linhas.forEach((l, i) => ctx.fillText(l, 12 + pad, h - 12 - linhas.length * lh - pad + 4 + i * lh));
      }
      ctx.globalAlpha = 1;
    }

    // Caminho na tela de uma transição: laço, reta ou curva.
    _geometria(e, proj, raio, pares) {
      const a = proj.get(e.from), b = proj.get(e.to);
      const ra = raio(e.from), rb = raio(e.to);
      const A = [a.x, a.y], B = [b.x, b.y];

      if (e.from === e.to) {
        // laço: sai para fora do grafo (longe do centro da tela)
        let u = sub(A, [this.w / 2, this.h / 2]);
        const m = Math.hypot(u[0], u[1]);
        u = m < 1 ? [0, -1] : [u[0] / m, u[1] / m];
        const p0 = [A[0] + girar(u, -0.5)[0] * ra, A[1] + girar(u, -0.5)[1] * ra];
        const p3 = [A[0] + girar(u, 0.5)[0] * ra, A[1] + girar(u, 0.5)[1] * ra];
        const p1 = [A[0] + girar(u, -0.75)[0] * ra * 3.4, A[1] + girar(u, -0.75)[1] * ra * 3.4];
        const p2 = [A[0] + girar(u, 0.75)[0] * ra * 3.4, A[1] + girar(u, 0.75)[1] * ra * 3.4];
        const pts = [];
        for (let i = 0; i <= 20; i++) pts.push(cubica(p0, p1, p2, p3, i / 20));
        return {
          pts,
          dir: sub(p3, p2),
          rotulo: [A[0] + u[0] * ra * 2.9, A[1] + u[1] * ra * 2.9],
          f: a.f,
        };
      }

      // curvatura: pares de ida e volta se separam; saltos entre camadas desviam dos estados do meio
      const dp = (this.profundidade.get(e.to) || 0) - (this.profundidade.get(e.from) || 0);
      let curv = 0;
      if (pares.has(chave(e.to, e.from))) curv = 0.2;
      else if (dp !== 1) curv = 0.28;
      const d = sub(B, A);
      const len = Math.hypot(d[0], d[1]) || 1;
      const perp = [-d[1] / len, d[0] / len];
      const C = [(A[0] + B[0]) / 2 + perp[0] * curv * len, (A[1] + B[1]) / 2 + perp[1] * curv * len];

      // corta o pedaço que fica dentro dos círculos dos estados
      let t0 = 0, t1 = 1;
      while (t0 < 0.5 && dist(quadratica(A, C, B, t0), A) < ra) t0 += 0.01;
      while (t1 > 0.5 && dist(quadratica(A, C, B, t1), B) < rb + 1) t1 -= 0.01;
      const pts = [];
      for (let i = 0; i <= 16; i++) pts.push(quadratica(A, C, B, t0 + ((t1 - t0) * i) / 16));
      return {
        pts,
        dir: sub(pts[16], pts[14]),
        rotulo: quadratica(A, C, B, 0.5),
        f: (a.f + b.f) / 2,
      };
    }
  }

  // ---------- Auxiliares de desenho ----------

  function agora() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
  function suavizar(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function unicas(arestas) {
    const vistas = new Set();
    return arestas.filter((a) => { const k = chave(a.de, a.para); if (vistas.has(k)) return false; vistas.add(k); return true; });
  }

  function seta(ctx, ponta, dir, tam, cor) {
    const m = Math.hypot(dir[0], dir[1]) || 1;
    const u = [dir[0] / m, dir[1] / m];
    const n = [-u[1], u[0]];
    ctx.beginPath();
    ctx.moveTo(ponta[0], ponta[1]);
    ctx.lineTo(ponta[0] - u[0] * tam + n[0] * tam * 0.5, ponta[1] - u[1] * tam + n[1] * tam * 0.5);
    ctx.lineTo(ponta[0] - u[0] * tam - n[0] * tam * 0.5, ponta[1] - u[1] * tam - n[1] * tam * 0.5);
    ctx.closePath();
    ctx.fillStyle = cor;
    ctx.fill();
  }

  function retanguloRedondo(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function pilula(ctx, texto, x, y, fundo, cor) {
    const w = ctx.measureText(texto).width + 10, h = 18;
    ctx.fillStyle = fundo;
    retanguloRedondo(ctx, x - w / 2, y - h / 2, w, h, 6);
    ctx.fill();
    ctx.fillStyle = cor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, x, y + 0.5);
  }

  function quebrar(ctx, texto, largura) {
    const linhas = [];
    for (const par of String(texto).split('\n')) {
      let atual = '';
      for (const p of par.split(' ')) {
        const tent = atual ? atual + ' ' + p : p;
        if (ctx.measureText(tent).width > largura && atual) { linhas.push(atual); atual = p; } else atual = tent;
      }
      linhas.push(atual);
    }
    return linhas;
  }

  const api = { Viz3D, calcularLayout, profundidades };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.Raio = window.Raio || {}; Object.assign(window.Raio, api); }
})();
