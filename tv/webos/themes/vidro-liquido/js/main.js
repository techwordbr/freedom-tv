(function () {
  var TECLA = {
    ESQ: 37, CIMA: 38, DIR: 39, BAIXO: 40, OK: 13,
    VOLTAR: 10009, ESC: 27, APAGAR: 8,
    VERDE: 404, AMARELO: 405, AZUL: 406,
    F: 70, M: 77, S: 83 // atalhos no teclado do PC
  };
  var PASSO_X = 166, VISIVEIS_X = 8;               // fileiras da tela Início
  var COLUNAS = 8, PASSO_Y = 212, VISIVEIS_Y = 3;   // grade das outras seções
  var FAVORITOS_PADRAO = ['org.tizen.netflix-app', 'org.tizen.primevideo', 'MCmYXNxgcu.DisneyPlus',
    '9Ur5IzDKqV.TizenYouTube', '5b8c3eb16b.BeamCTVDev', 'org.tizen.globoplayapp', 'com.samsung.tv.aria-video',
    'rJyOSqC6Up.PPlusIntl', 'rJeHak5zRg.Spotify'];

  // Categorias do menu: nossas, montadas pelo nome do app (o Tizen não informa categoria)
  var CATEGORIAS = {
    filmes: { titulo: 'Filmes e Séries', palavras: ['netflix', 'prime', 'disney', 'hbo', 'max', 'apple tv', 'globoplay', 'telecine', 'star+', 'paramount', 'pluto', 'youtube', 'crunchyroll', 'mubi'] },
    tv: { titulo: 'TV ao Vivo', palavras: ['pluto', 'sbt', 'globoplay', 'tv plus', 'band', 'record', 'cnn', 'live'] },
    jogos: { titulo: 'Jogos', palavras: ['xbox', 'game', 'jogo', 'geforce', 'luna'] },
    musica: { titulo: 'Música', palavras: ['spotify', 'deezer', 'music', 'música', 'tidal', 'radio', 'rádio'] }
  };

  function $(id) { return document.getElementById(id); }
  var tela = $('tela');
  var camadas = [$('camada-a'), $('camada-b')];
  var lente = $('lente'), dicas = $('dicas'), toast = $('toast');
  var itensMenu = Array.prototype.slice.call(document.querySelectorAll('#menu .item'));
  var interno = { fav: $('linha-fav'), todos: $('linha-todos'), grade: $('grade') };
  var linhasEl = $('linhas'), nota = $('nota');
  var A = Ajustes.atual;

  var apps = [], porId = {}, favoritos = [];
  var lista = { fav: [], todos: [], grade: [] };      // apps mostrados em cada área
  var cartoes = { fav: [], todos: [], grade: [] };
  var indice = { menu: 0, fav: 0, todos: 0, grade: 0 };
  var desloc = { fav: 0, todos: 0, grade: 0 };        // quanto cada área rolou
  var secao = 'inicio', zona = 'fav';
  var movendo = false, ajustesAberto = false, opcaoAtual = 0;

  // ---------- Utilidades ----------
  // Posição de um elemento dentro da tela (ignora animações, só o layout)
  function posicao(el) {
    var x = 0, y = 0;
    while (el && el !== tela) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    return { x: x, y: y };
  }

  function limitar(v, n) { return Math.max(0, Math.min(n - 1, v)); }

  // Posição real na tela de um app de uma área, já descontando a rolagem
  function posicaoNaTela(z, k) {
    var p = posicao(cartoes[z][k].icone);
    if (z === 'grade') p.y -= desloc.grade * PASSO_Y; else p.x -= desloc[z] * PASSO_X;
    return p;
  }

  // O vidro "Equilibrado" pinta o fundo desfocado alinhado com a posição de cada painel
  function posicionarVidros() {
    var vidros = tela.querySelectorAll('.vidro');
    for (var i = 0; i < vidros.length; i++) {
      var p = posicao(vidros[i]);
      vidros[i].style.setProperty('--bx', -p.x + 'px');
      vidros[i].style.setProperty('--by', -p.y + 'px');
    }
  }

  function aviso(msg, erro) {
    toast.textContent = msg;
    toast.classList.toggle('erro', !!erro);
    var p = posicao(toast);
    toast.style.setProperty('--bx', -p.x + 'px');
    toast.style.setProperty('--by', -p.y + 'px');
    toast.classList.add('visivel');
    clearTimeout(aviso.t);
    aviso.t = setTimeout(function () { toast.classList.remove('visivel'); }, 2600);
  }

  function categoriaDe(app) {
    var nome = app.nome.toLowerCase();
    for (var c in CATEGORIAS) {
      if (CATEGORIAS[c].palavras.some(function (p) { return nome.indexOf(p) >= 0; })) return CATEGORIAS[c].titulo;
    }
    return 'Aplicativo';
  }

  // ---------- Aparência ----------
  function aplicarAjustes() {
    tela.className = 'fx-' + A.vidro + ' anim-' + A.animacao + (ajustesAberto ? ' ajustes-aberto' : '');
    // a TV não aceita calc() dentro de rgba(): os números saem prontos daqui
    var a = .02 + (100 - A.transparencia) * .0022;
    tela.style.setProperty('--a', a.toFixed(3));
    tela.style.setProperty('--leve', (.62 + a).toFixed(3));
    tela.style.setProperty('--brilho', (A.reflexos / 100 * .6).toFixed(2));
    if (A.fundo !== fundoAtual.escolha || A.troca !== fundoAtual.troca) iniciarFundo();
  }

  // ---------- Fundo: fotos prontas que se revezam ----------
  // A.fundo: 0 = revezar todas, 1..N = sempre a mesma foto
  var fundoAtual = { escolha: -1, troca: 0, camada: 0, foto: 1, timer: 0 };

  function mostrarFoto(n) {
    fundoAtual.foto = n;
    var nova = camadas[1 - fundoAtual.camada];
    nova.style.backgroundImage = 'url("' + Fundo.foto(n) + '")';
    nova.classList.add('visivel');
    camadas[fundoAtual.camada].classList.remove('visivel');
    fundoAtual.camada = 1 - fundoAtual.camada;
    // "../" porque o endereço dentro da variável é lido a partir da pasta css/
    tela.style.setProperty('--vidro', 'url("../' + Fundo.vidro(n) + '")');
    // deixa a próxima foto já baixada e decodificada, para a troca não engasgar
    if (A.fundo === 0) {
      var proxima = new Image();
      proxima.src = Fundo.foto(n % Fundo.FOTOS + 1);
      fundoAtual.proxima = proxima;
    }
  }

  function iniciarFundo() {
    var f = fundoAtual;
    f.escolha = A.fundo;
    f.troca = A.troca;
    clearInterval(f.timer);
    mostrarFoto(A.fundo || 1);
    if (A.fundo === 0) {
      f.timer = setInterval(function () { mostrarFoto(f.foto % Fundo.FOTOS + 1); }, A.troca * 1000);
    }
  }

  function ajustarEscala() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    tela.style.transform = s === 1 ? '' : 'scale(' + s + ')';
  }

  // ---------- Cartões de app ----------
  function criarCartao(app) {
    var el = document.createElement('div');
    el.className = 'app';
    var ic = document.createElement('div');
    ic.className = 'icone';
    ic.style.backgroundColor = app.cor; // só aparece se o app não tiver ícone
    var marca = document.createElement('span');
    marca.className = 'marca' + (app.nome.length > 9 ? ' longa' : '');
    marca.textContent = app.nome;
    ic.appendChild(marca);
    if (app.icones.length || Apps.carregarIcone) {
      var img = new Image(), tentativa = 0;
      // se um ícone não carregar, tenta o próximo; sem nenhum, fica o quadro com o nome
      img.onerror = function () {
        if (++tentativa < app.icones.length) img.src = app.icones[tentativa];
        else if (Apps.carregarIcone && !img.buscaLocal) buscarLocal();
      };
      img.onload = function () {
        ic.insertBefore(img, ic.firstChild);
        ic.classList.add('com-imagem');
        marca.style.display = 'none';
      };
      function buscarLocal() {
        img.buscaLocal = true;
        Apps.carregarIcone(app, function (src) { img.src = src; });
      }
      if (app.icones.length) img.src = app.icones[0]; else buscarLocal();
    }
    var estrela = document.createElement('span');
    estrela.className = 'estrela';
    estrela.textContent = '★';
    ic.appendChild(estrela);
    var nome = document.createElement('div');
    nome.className = 'nome';
    nome.textContent = app.nome;
    el.appendChild(ic);
    el.appendChild(nome);
    el.icone = ic;
    return el;
  }

  function desenharArea(z) {
    interno[z].innerHTML = '';
    cartoes[z] = lista[z].map(function (app) {
      var c = criarCartao(app);
      var desativado = window.FreedomWifiModal && window.FreedomWifiModal.isAppDisabled(app.id);
      if (desativado) {
        c.classList.add('desativado');
        var nomeEl = c.querySelector('.nome');
        if (nomeEl) nomeEl.textContent = app.nome + ' (Desativado)';
      }
      if (favoritos.indexOf(app.id) >= 0) c.classList.add('favorito');
      c.addEventListener('mouseenter', function () {
        if (ajustesAberto || movendo) return;
        var k = cartoes[z].indexOf(c);
        if (zona === z && indice[z] === k) return;
        zona = z; indice[z] = k; focar();
      });
      c.addEventListener('click', function () {
        if (ajustesAberto || movendo) return;
        if (desativado) abrirMenuEditarApp();
        else abrirApp();
      });
      interno[z].appendChild(c);
      return c;
    });
    indice[z] = limitar(indice[z], cartoes[z].length);
  }

  function atualizarListasVisiveis() {
    var ativos = apps.filter(function (a) {
      return !(window.FreedomWifiModal && (window.FreedomWifiModal.isAppRemoved(a.id) || window.FreedomWifiModal.isAppDisabled(a.id)));
    });
    gradeCache = {};   // lists changed: sections are built again
    lista.todos = ativos;
    desenharArea('todos');
    favoritos = favoritos.filter(function (id) {
      return porId[id] && !(window.FreedomWifiModal && (window.FreedomWifiModal.isAppRemoved(id) || window.FreedomWifiModal.isAppDisabled(id)));
    });
    atualizarFavoritos();
    if (secao !== 'inicio') mostrarSecao(secao);
    focar();
  }

  function appsDaSecao(s) {
    var validos = apps.filter(function (a) { return !(window.FreedomWifiModal && window.FreedomWifiModal.isAppRemoved(a.id)); });
    if (s === 'apps') {
      // Show active apps first, then disabled apps at the end so user can re-enable or uninstall them!
      var ativos = validos.filter(function (a) { return !(window.FreedomWifiModal && window.FreedomWifiModal.isAppDisabled(a.id)); });
      var inativos = validos.filter(function (a) { return window.FreedomWifiModal && window.FreedomWifiModal.isAppDisabled(a.id); });
      return ativos.concat(inativos);
    }
    var cat = CATEGORIAS[s];
    return validos.filter(function (a) {
      if (window.FreedomWifiModal && window.FreedomWifiModal.isAppDisabled(a.id)) return false;
      return categoriaDe(a) === cat.titulo || cat.palavras.some(function (p) { return a.nome.toLowerCase().indexOf(p) >= 0; });
    });
  }

  function atualizarFavoritos() {
    gradeCache = {};
    lista.fav = favoritos.map(function (id) { return porId[id]; });
    desenharArea('fav');
    ['todos', 'grade'].forEach(function (z) {
      cartoes[z].forEach(function (c, k) { c.classList.toggle('favorito', favoritos.indexOf(lista[z][k].id) >= 0); });
    });
  }

  // ---------- Seções do menu ----------
  var gradeCache = {}, trocaTimer = null;   // section grids already built (Augusto 26/11: 'leve travado' going down the menu)
  function mostrarSecao(s) {
    if (!s) return; // itens de ação (loja, ajustes da TV, personalizar) não trocam a seção
    secao = s;
    itensMenu.forEach(function (it) { it.classList.toggle('ativo', it.getAttribute('data-secao') === s); });
    $('inicio').classList.toggle('escondida', s !== 'inicio');
    $('secao-grade').classList.toggle('escondida', s === 'inicio');
    if (s !== 'inicio') {
      var guardada = gradeCache[s];
      lista.grade = guardada ? guardada.lista : appsDaSecao(s);
      desloc.grade = 0;
      indice.grade = 0;
      interno.grade.style.transform = '';
      if (guardada) {   // already built: put the same cards back, nothing is recreated
        var frag = document.createDocumentFragment();
        guardada.cartoes.forEach(function (c) { c.classList.remove('foco', 'movendo'); frag.appendChild(c); });
        interno.grade.innerHTML = ''; interno.grade.appendChild(frag); cartoes.grade = guardada.cartoes;
      } else {
        desenharArea('grade');
        gradeCache[s] = { lista: lista.grade, cartoes: cartoes.grade };
      }
      $('titulo-grade').textContent = s === 'apps' ? 'Todos os apps' : CATEGORIAS[s].titulo;
      $('vazio-grade').textContent = lista.grade.length ? '' : 'Nenhum app desta categoria está instalado.';
    }
    posicionarVidros();
  }

  // ---------- Foco ----------
  function appFocado() {
    return zona === 'menu' || zona === 'entradas' || zona === 'antena' ? null : lista[zona][indice[zona]];
  }

  function rolarPara(z) {
    var i = indice[z];
    if (z === 'grade') {
      var linha = Math.floor(i / COLUNAS);
      if (linha < desloc.grade) desloc.grade = linha;
      if (linha >= desloc.grade + VISIVEIS_Y) desloc.grade = linha - VISIVEIS_Y + 1;
      interno.grade.style.transform = 'translate3d(0,' + (-desloc.grade * PASSO_Y) + 'px,0)';
    } else {
      if (i < desloc[z]) desloc[z] = i;
      if (i >= desloc[z] + VISIVEIS_X) desloc[z] = i - VISIVEIS_X + 1;
      interno[z].style.transform = 'translate3d(' + (-desloc[z] * PASSO_X) + 'px,0,0)';
    }
  }

  function saudacao() {
    var h = new Date().getHours();
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  }

  function atualizarDestaque(app) {
    if (app) {
      $('destaque-rotulo').textContent = zona === 'fav' ? 'Seus aplicativos' : 'Todos os apps';
      $('destaque-titulo').textContent = app.nome;
      $('destaque-sub').textContent = categoriaDe(app);
      $('destaque-acao').innerHTML = '<b>OK</b>Abrir';
    } else {
      $('destaque-rotulo').textContent = 'Início';
      $('destaque-titulo').textContent = saudacao();
      $('destaque-sub').textContent = 'Seus apps, do seu jeito, sem propaganda.';
      $('destaque-acao').innerHTML = '<b>▶</b>Escolher um app';
    }
  }

  // O foco é redesenhado no máximo uma vez por quadro: segurar a seta só atualiza
  // a posição na memória, e a tela mostra o resultado no quadro seguinte
  function focar() {
    if (focar.pendente) return;
    focar.pendente = true;
    requestAnimationFrame(function () { focar.pendente = false; desenharFoco(); });
  }

  function desenharFoco() {
    var antigos = tela.querySelectorAll('.foco, .movendo');
    for (var i = 0; i < antigos.length; i++) {
      if (!antigos[i].classList.contains('opcao')) antigos[i].classList.remove('foco', 'movendo');
    }

    var el, p, escala = 1, sobe = 0, app = appFocado();
    if (zona === 'entradas') { el = $('entradas'); p = posicao(el); } else if (zona === 'antena') { el = $('cartao-antena'); p = posicao(el); } else if (zona === 'menu') {
      el = itensMenu[indice.menu];
      el.classList.add('foco');
      p = posicao(el);
      escala = 1;
      sobe = 0;
    } else {
      var cartao = cartoes[zona][indice[zona]];
      if (!cartao) { lente.style.opacity = 0; atualizarDicas(); return; }
      rolarPara(zona);
      cartao.classList.add('foco');
      if (movendo) { cartao.classList.add('movendo'); sobe = 20; }
      el = cartao.icone;
      p = posicaoNaTela(zona, indice[zona]);
    }

    // Tamanho e estilo da lente só mudam ao trocar de área; no dia a dia ela só desliza
    var w = el.offsetWidth, h = el.offsetHeight;
    var estilo = zona + w + 'x' + h + movendo;
    if (lente.estilo !== estilo) {
      lente.estilo = estilo;
      lente.style.width = w + 'px';
      lente.style.height = h + 'px';
      lente.style.borderRadius = zona === 'menu' ? '31px' : '34px';
      lente.classList.toggle('no-menu', zona === 'menu');
      lente.classList.toggle('movendo', movendo);
      atualizarDicas();
    }
    lente.style.transform = 'translate3d(' + p.x + 'px,' + (p.y - sobe) + 'px,0) scale(' + escala + ')';
    lente.style.opacity = 1;

    // O destaque (texto grande) só é redesenhado quando o foco para de andar:
    // segurar a seta não redesenha o painel a cada passo
    if (secao === 'inicio') {
      clearTimeout(focar.destaque);
      focar.destaque = setTimeout(function () { atualizarDestaque(app); }, 140);
    }
  }

  function maisProximo(z, x, inicio, fim) {
    var melhor = inicio, distancia = Infinity;
    for (var k = inicio; k < fim; k++) {
      var d = Math.abs(posicaoNaTela(z, k).x + 75 - x);
      if (d < distancia) { distancia = d; melhor = k; }
    }
    return melhor;
  }

  function entrarNoConteudo() {
    if (secao === 'inicio') zona = cartoes.fav.length ? 'fav' : 'todos';
    else if (cartoes.grade.length) zona = 'grade';
    focar();
  }

  function navegar(dx, dy) {
    // TV / Antena card (above HDMI): ▲ from HDMI, ▼ back to HDMI, ◀ to the menu (Augusto 26/11: not reachable before)
    if (zona === 'antena') { if (dy > 0) { zona='entradas'; focar(); } else if (dx < 0) { zona='menu'; focar(); } return; }
    if (zona === 'entradas') { if (dy > 0) entrarNoConteudo(); else if (dy < 0 && $('cartao-antena')) { zona='antena'; focar(); } else if (dx < 0) { zona='menu'; focar(); } return; }
    if (!movendo && dy < 0 && (zona === 'fav' || (zona === 'todos' && !favoritos.length)) && secao === 'inicio') { zona='entradas'; focar(); return; }
    if (zona === 'menu') {
      if (dy) {
        indice.menu = limitar(indice.menu + dy, itensMenu.length);
        var alvo = itensMenu[indice.menu].getAttribute('data-secao');
        clearTimeout(trocaTimer);
        trocaTimer = setTimeout(function () { trocaTimer = null; mostrarSecao(alvo); }, 160);
      }
      if (dx > 0) { firmarSecao(); return entrarNoConteudo(); }
      return focar();
    }

    if (movendo) { if (dx) moverFavorito(dx); return; }

    var i = indice[zona];
    if (zona === 'grade') {
      var col = i % COLUNAS, n = cartoes.grade.length;
      if (dx < 0 && col === 0) { zona = 'menu'; return focar(); }
      if (dx && i + dx >= 0 && i + dx < n && Math.floor((i + dx) / COLUNAS) === Math.floor(i / COLUNAS)) indice.grade = i + dx;
      if (dy < 0 && i >= COLUNAS) indice.grade = i - COLUNAS;
      if (dy > 0 && Math.floor(i / COLUNAS) < Math.floor((n - 1) / COLUNAS)) indice.grade = Math.min(i + COLUNAS, n - 1);
      return focar();
    }

    // fileiras da tela Início
    if (dx < 0 && i === 0) { zona = 'menu'; return focar(); }
    if (dx) indice[zona] = limitar(i + dx, cartoes[zona].length);
    var destino = dy < 0 && zona === 'todos' ? 'fav' : dy > 0 && zona === 'fav' ? 'todos' : null;
    if (destino && cartoes[destino].length) {
      var x = posicaoNaTela(zona, i).x + 75;
      indice[destino] = maisProximo(destino, x, desloc[destino], Math.min(cartoes[destino].length, desloc[destino] + VISIVEIS_X + 1));
      zona = destino;
    }
    focar();
  }

  // ---------- Ações ----------
  function abrirApp() {
    var app = appFocado();
    if (!app) return;
    if (window.FreedomWifiModal && window.FreedomWifiModal.isAppDisabled(app.id)) {
      abrirMenuEditarApp();
      return;
    }
    var c = cartoes[zona][indice[zona]];
    c.classList.remove('abrindo');
    void c.offsetWidth;
    c.classList.add('abrindo');
    Apps.abrir(app.id, function (abriu) {
      if (!abriu) aviso('Abrindo: ' + app.nome);
    }, function (err) {
      aviso('Este aplicativo não está disponível nesta TV: ' + app.nome, true);
    });
  }

  function alternarFavorito() {
    var app = appFocado();
    if (!app || movendo) return;
    var k = favoritos.indexOf(app.id);
    if (k >= 0) { favoritos.splice(k, 1); aviso(app.nome + ' saiu dos favoritos'); }
    else { favoritos.push(app.id); aviso(app.nome + ' entrou nos favoritos'); }
    Ajustes.salvarFavoritos(favoritos);
    atualizarFavoritos();
    if (zona === 'fav' && !favoritos.length) zona = 'todos';
    focar();
  }

  function salvarOrdemTodos() {
    try { localStorage.setItem('tvstudio.apps.order.v1', JSON.stringify(lista.todos.map(function (a) { return a.id; }))); } catch (_) {}
  }

  function salvarOrdemTodos() {
    try { localStorage.setItem('tvstudio.apps.order.v1', JSON.stringify(lista.todos.map(function (a) { return a.id; }))); } catch (_) {}
  }

  function salvarOrdemTodos() {
    try { localStorage.setItem('tvstudio.apps.order.v1', JSON.stringify(lista.todos.map(function (a) { return a.id; }))); } catch (_) {}
  }

  function salvarOrdemTodos() {
    try { localStorage.setItem('tvstudio.apps.order.v1', JSON.stringify(lista.todos.map(function (a) { return a.id; }))); } catch (_) {}
  }

  function salvarOrdemTodos() {
    try { localStorage.setItem('tvstudio.apps.order.v1', JSON.stringify(lista.todos.map(function (a) { return a.id; }))); } catch (_) {}
  }

  function salvarOrdemTodos() {
    try { localStorage.setItem('tvstudio.apps.order.v1', JSON.stringify(lista.todos.map(function (a) { return a.id; }))); } catch (_) {}
  }

  function salvarOrdemTodos() {
    try { localStorage.setItem('tvstudio.apps.order.v1', JSON.stringify(lista.todos.map(function (a) { return a.id; }))); } catch (_) {}
  }

  function salvarOrdemTodos() {
    try { localStorage.setItem('tvstudio.apps.order.v1', JSON.stringify(lista.todos.map(function (a) { return a.id; }))); } catch (_) {}
  }

  function salvarOrdemTodos() {
    try { localStorage.setItem('tvstudio.apps.order.v1', JSON.stringify(lista.todos.map(function (a) { return a.id; }))); } catch (_) {}
  }

  function alternarMover() {
    if ((zona !== 'fav' && zona !== 'todos') || !lista[zona] || !lista[zona].length) return;
    movendo = !movendo;
    if (!movendo) {
      if (zona === 'fav') Ajustes.salvarFavoritos(favoritos);
      else salvarOrdemTodos();
      aviso('Nova posição salva');
    } else {
      aviso('Use ◀ ▶ para mover e OK para soltar');
    }
    focar();
  }

  function moverFavorito(dx) {
    var z = (zona === 'fav' || zona === 'todos') ? zona : 'fav';
    var arr = z === 'fav' ? favoritos : lista.todos;
    var i = indice[z], j = i + dx;
    if (j < 0 || j >= arr.length) return;
    var a = cartoes[z][i], b = cartoes[z][j];
    if (dx > 0) interno[z].insertBefore(b, a); else interno[z].insertBefore(a, b);
    cartoes[z][i] = b; cartoes[z][j] = a;
    if (z === 'fav') {
      var t = favoritos[i]; favoritos[i] = favoritos[j]; favoritos[j] = t;
      lista.fav = favoritos.map(function (id) { return porId[id]; });
      Ajustes.salvarFavoritos(favoritos);
    } else {
      var ta = lista.todos[i]; lista.todos[i] = lista.todos[j]; lista.todos[j] = ta;
      salvarOrdemTodos();
    }
    indice[z] = j;
    focar();
  }

  function abrirMenuEditarApp() {
    var app = appFocado();
    if (!app) return;
    if (window.FreedomWifiModal) {
      window.FreedomWifiModal.openAppEdit(app.nome, {
        appId: app.id,
        isFav: favoritos.indexOf(app.id) >= 0,
        onStartMove: (zona === 'fav' || zona === 'todos') ? function () {
          movendo = true;
          aviso('Use ◀ ▶ para mover ' + app.nome + ' e OK para confirmar');
          focar();
        } : null,
        onToggleFav: function () { alternarFavorito(); },
        onOpen: function () { abrirApp(); },
        onChanged: function (msg) {
          atualizarListasVisiveis();
          if (msg) aviso(msg);
        }
      });
    } else {
      alternarMover();
    }
  }

  var OPCOES = [
    { rotulo: 'Papel de parede', chave: 'fundo', valores: [0, 1, 2, 3], nomes: ['Revezar as fotos', 'Curvas de luz (principal)', 'Ondas', 'Montanhas'] },
    { rotulo: 'Trocar foto a cada', chave: 'troca', valores: [20, 60, 300], nomes: ['20 segundos', '1 minuto', '5 minutos'] },
    // "Máximo" (desfoque em tempo real) e "Efeitos extras" ficaram de fora: travam a TV
    { rotulo: 'Efeito de vidro', chave: 'vidro', valores: ['leve', 'equilibrado'], nomes: ['Leve', 'Vidro fosco'] },
    { rotulo: 'Transparência', chave: 'transparencia', barra: true },
    { rotulo: 'Reflexos e brilho', chave: 'reflexos', barra: true },
    { rotulo: 'Animações', chave: 'animacao', valores: ['suaves', 'rapidas', 'desligadas'], nomes: ['Suaves', 'Rápidas', 'Desligadas'] },
    { rotulo: 'Restaurar padrão', acao: 'restaurar' },
    { rotulo: 'Fechar', acao: 'fechar' }
  ];
  if (Apps.redirecionarHome) {
    OPCOES.splice(OPCOES.length-2,0,{rotulo:'Botão Home · experimental',acao:'home'});
  }
  var homeKey = 'tvstudio.returnHome';
  var changingHome = false;
  function configurarHome(enabled) {
    if(changingHome)return;
    changingHome=true;
    aviso(enabled?'Aceite a conexão na TV, se solicitado.':'Desligando retorno…');
    Apps.redirecionarHome(enabled,function(message){
      changingHome=false; localStorage.setItem(homeKey,enabled?'1':'0');aviso(message);desenharAjustes();
    },function(error){
      changingHome=false;localStorage.removeItem(homeKey);aviso(error.message,true);desenharAjustes();
    });
  }
  // Enable on first use; preserve an explicit choice to turn it off.
  if(Apps.redirecionarHome && localStorage.getItem(homeKey)!=='0') configurarHome(true);
  var NOTAS = {
    home: 'OK liga ou desliga o retorno ao tema quando a LG abrir o Home. Pode aparecer a tela da LG por um instante.',
    fundo: '"Revezar as fotos" troca de foto sozinho com o tempo. Ou escolha uma foto fixa.',
    troca: 'Tempo que cada foto fica na tela antes de dar lugar à próxima.',
    vidro: 'Vidro fosco: o fundo aparece desfocado atrás dos painéis. Leve: painéis escuros, o mais rápido de todos.',
    transparencia: 'Quanto mais alto, mais o fundo aparece através do vidro.',
    reflexos: 'Brilho das bordas de luz dos painéis de vidro.',
    animacao: 'Suaves têm o efeito de mola do vidro líquido. Rápidas e Desligadas deixam tudo mais seco.'
  };

  function desenharAjustes() {
    linhasEl.innerHTML = OPCOES.map(function (o, k) {
      var lado = '';
      if (o.acao === 'home') lado = localStorage.getItem(homeKey)==='1'?'Desligar':'Ativar';
      else if (o.barra) lado = '<span class="barra"><i style="width:' + A[o.chave] + '%"></i></span><span class="num">' + A[o.chave] + '%</span>';
      else if (!o.acao) lado = '<span class="seta">◀</span><span class="valor">' + o.nomes[o.valores.indexOf(A[o.chave])] + '</span><span class="seta">▶</span>';
      return '<div class="opcao' + (k === opcaoAtual ? ' foco' : '') + '"><span>' + o.rotulo + '</span><span class="lado">' + lado + '</span></div>';
    }).join('');
    var o = OPCOES[opcaoAtual];
    nota.textContent = o.acao === 'restaurar' ? 'OK volta tudo ao visual original. Seus favoritos são mantidos.'
      : o.acao === 'fechar' ? 'OK fecha este painel (o botão Voltar também fecha).' : NOTAS[o.chave || o.acao];
  }

  function mudarAjuste(dx) {
    var o = OPCOES[opcaoAtual];
    if (o.acao) return;
    if (o.barra) A[o.chave] = Math.max(0, Math.min(100, A[o.chave] + dx * 10));
    else {
      var k = o.valores.indexOf(A[o.chave]);
      A[o.chave] = o.valores[(k + dx + o.valores.length) % o.valores.length];
    }
    // O texto muda na hora; a tela só é refeita quando você para de apertar,
    // assim passar por vários papéis de parede não trava a TV
    desenharAjustes();
    clearTimeout(mudarAjuste.t);
    mudarAjuste.t = setTimeout(function () { Ajustes.salvar(); aplicarAjustes(); }, 450);
  }

  function abrirAjustes() {
    ajustesAberto = true;
    opcaoAtual = 0;
    try { history.pushState({ personalizando: true }, ''); } catch (_) {}
    desenharAjustes();
    aplicarAjustes();
    atualizarDicas();
  }

  function fecharAjustes() {
    if (!ajustesAberto) return;
    ajustesAberto = false;
    aplicarAjustes();
    lente.estilo = '';
    focar();
  }
  window.addEventListener('popstate', function () {
    if (ajustesAberto) fecharAjustes();
  });

  function teclaAjustes(k) {
    if (k === TECLA.CIMA) opcaoAtual = Math.max(0, opcaoAtual - 1);
    else if (k === TECLA.BAIXO) opcaoAtual = Math.min(OPCOES.length - 1, opcaoAtual + 1);
    else if (k === TECLA.ESQ) { mudarAjuste(-1); return true; }
    else if (k === TECLA.DIR) { mudarAjuste(1); return true; }
    else if (k === TECLA.OK && OPCOES[opcaoAtual].acao === 'home') { configurarHome(localStorage.getItem(homeKey)!=='1'); return true; }
    else if (k === TECLA.OK && OPCOES[opcaoAtual].acao === 'fechar') { fecharAjustes(); return true; }
    else if (k === TECLA.OK && OPCOES[opcaoAtual].acao === 'restaurar') {
      Ajustes.restaurar();
      aplicarAjustes();
      aviso('Visual restaurado');
    }
    else if (eVoltar(k) || k === TECLA.VERDE || k === TECLA.S) { fecharAjustes(); return true; }
    else return false;
    desenharAjustes();
    return true;
  }

  // ---------- Dicas de botões ----------
  function tecla(cor, pc) {
    return '<b class="tecla ' + cor + '"></b>' + (Apps.naTV ? '' : '<small>(' + pc + ')</small> ');
  }
  function atualizarDicas() {
    var t;
    if (ajustesAberto) t = '▲▼ escolher<br>◀▶ mudar<br>Voltar fecha';
    else if (zona === 'entradas') t = 'OK escolher HDMI<br>▲ TV / Antena<br>▼ voltar aos apps';
    else if (zona === 'antena') t = 'OK abrir TV ao vivo<br>▼ HDMI / Entradas';
    else if (zona === 'menu') t = '▲▼ navegar<br>▶ entrar';
    else if (movendo) t = '◀▶ mudar de lugar<br>OK confirma';
    else if (zona === 'fav') t = 'OK abrir<br>' + tecla('amarelo', 'F') + 'tirar dos favoritos<br>' + tecla('azul', 'M') + 'mudar de lugar';
    else t = 'OK abrir<br>' + tecla('amarelo', 'F') + 'favoritar';
    dicas.innerHTML = t;
  }

  // ---------- Controle remoto ----------
  function eVoltar(k) { return k === 461 || k === TECLA.VOLTAR || k === TECLA.ESC || k === TECLA.APAGAR; }

  // Atalhos para apps do sistema: tenta cada ID até um abrir
  var SISTEMA = {
    loja: { nome: 'Loja de apps', ids: ['com.webos.app.discovery', 'com.samsung.tv.store', 'com.samsung.tv.coba.apps', 'org.volt.apps'] },
    tv: { nome: 'Ajustes da TV', ids: ['com.palm.app.settings', 'com.samsung.tv.coba.setting', 'org.tizen.menu', 'org.tizen.homesetting'] },
    wifi: { nome: 'Wi-Fi e Configurações Rápidas', ids: ['com.webos.app.quicksettings'] },
    antena: { nome: 'TV / Antena', ids: ['com.webos.app.livetv', 'com.webos.app.tvguide'] },
    entradas: { nome: 'HDMI / Entradas', ids: ['com.webos.app.homeconnect', 'com.webos.app.inputpicker'] }
  };

  function firmarSecao() {   // show the pending section now (OK or ▶ before the short wait ends)
    if (!trocaTimer) return;
    clearTimeout(trocaTimer); trocaTimer = null;
    mostrarSecao(itensMenu[indice.menu].getAttribute('data-secao'));
  }
  function okNoMenu(it) {
    firmarSecao();
    var acao = it.getAttribute('data-acao');
    if (acao === 'temas') { localStorage.setItem('tvstudio.theme.page', 'vidro'); location.replace('../../index.html?temas'); return; }
    if (acao === 'root') { localStorage.setItem('tvstudio.theme.page', 'vidro'); location.href = '../../setup/index.html'; return; }
    if (acao === 'entradas') { abrirEntradas(); return; }
    if (acao === 'wifi') { if (ajustesAberto) fecharAjustes(); if (Apps.menuRapido) Apps.menuRapido(function(){}, function(){}); else Apps.abrir('com.webos.app.quicksettings', function(){}, function(){}); return; }
    if (acao === 'personalizar') return ajustesAberto ? fecharAjustes() : abrirAjustes();
    if (ajustesAberto) fecharAjustes();
    if (SISTEMA[acao]) {
      var s = SISTEMA[acao];
      return Apps.abrirPrimeiro(s.ids, function (abriu) {
        if (!abriu) aviso('Abrindo: ' + s.nome);
      }, function () { aviso('A TV não permitiu abrir: ' + s.nome, true); });
    }
    entrarNoConteudo();
  }

  function abrirEntradas() {
    if (!Apps.redirecionarHome) return aviso('Entradas disponíveis na versão LG.',true);
    Apps.abrir('com.webos.app.homeconnect',function(){},function(err){aviso('A LG não abriu o painel de entradas: '+err.message,true);});
  }
  $('entradas').onclick = abrirEntradas;
  function abrirAntena() {
    Apps.abrirPrimeiro(SISTEMA.antena.ids, function(){}, function(){ aviso('A TV não abriu os canais de antena.', true); });
  }
  if ($('cartao-antena')) $('cartao-antena').onclick = abrirAntena;
  itensMenu.forEach(function (it, k) {
    it.addEventListener('mouseenter', function () {
      if (ajustesAberto || (zona === 'menu' && indice.menu === k)) return;
      zona = 'menu'; indice.menu = k;
      mostrarSecao(it.getAttribute('data-secao'));
      focar();
    });
    it.addEventListener('click', function () { okNoMenu(it); });
  });

  try {
    ['ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue'].forEach(function (n) { tizen.tvinputdevice.registerKey(n); });
  } catch (e) { /* no PC não existe */ }

  var okHoldTimer = null, okHeld = false, okDown = false;
  document.addEventListener('keydown', function (e) {
    if (window.FreedomWifiModal && window.FreedomWifiModal.isOpen()) return;
    var k = e.keyCode;
    if (ajustesAberto) { if (teclaAjustes(k)) e.preventDefault(); return; }
    switch (k) {
      case TECLA.ESQ: navegar(-1, 0); break;
      case TECLA.DIR: navegar(1, 0); break;
      case TECLA.CIMA: navegar(0, -1); break;
      case TECLA.BAIXO: navegar(0, 1); break;
      case TECLA.OK:
        e.preventDefault();
        if (e.repeat || okDown) return;
        if (zona === 'entradas') { abrirEntradas(); return; }
        if (zona === 'antena') { abrirAntena(); return; }
        if (zona === 'menu') { okNoMenu(itensMenu[indice.menu]); return; }
        if (movendo) { alternarMover(); return; }
        okDown = true;
        okHeld = false;
        clearTimeout(okHoldTimer);
        okHoldTimer = setTimeout(function () {
          okHeld = true;
          okDown = false;
          abrirMenuEditarApp();
        }, 520);
        return;
      case TECLA.AMARELO: case TECLA.F: alternarFavorito(); break;
      case TECLA.AZUL: case TECLA.M: abrirMenuEditarApp(); break;
      case TECLA.VERDE: case TECLA.S: abrirAjustes(); break;
      default:
        if (eVoltar(k)) {
          if (movendo) alternarMover();
          else if (zona !== 'menu') { zona = 'menu'; focar(); }
          break;
        }
        return;
    }
    e.preventDefault();
  });
  document.addEventListener('keyup', function (e) {
    if (window.FreedomWifiModal && window.FreedomWifiModal.isOpen()) return;
    if (e.keyCode === TECLA.OK && okDown) {
      e.preventDefault();
      clearTimeout(okHoldTimer);
      var wasHeld = okHeld;
      okDown = false;
      okHeld = false;
      if (!wasHeld) abrirApp();
    }
  });

  // ---------- Relógio ----------
  var DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function atualizarRelogio() {
    var d = new Date();
    $('hora').textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    $('data').textContent = DIAS[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()];
  }

  // ---------- Início ----------
  function carregar() {
    Apps.listar(function (resultado) {
      if (window.FreedomWifiModal && FreedomWifiModal.forgetRemoved) FreedomWifiModal.forgetRemoved(resultado.map(function (a) { return a.id; }));
      apps = resultado.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
      porId = {};
      apps.forEach(function (a) { porId[a.id] = a; });
      var salvos = Ajustes.favoritos();
      favoritos = (salvos || FAVORITOS_PADRAO).filter(function (id) { return porId[id]; });
      // em outra TV, sem nenhum dos favoritos padrão instalado: começa com os primeiros apps dela
      if (!salvos && !favoritos.length) favoritos = apps.slice(0, 8).map(function (a) { return a.id; });
      atualizarListasVisiveis();
      mostrarSecao(secao);
      if (zona === 'fav' && !favoritos.length) zona = 'todos';
      focar();
    }, function (err) {
      zona = 'menu'; focar();
      $('destaque-sub').textContent = 'Lista de aplicativos indisponível nesta TV.';
      $('destaque-acao').textContent = 'Escolha Personalizar para ajustar o tema.';
    });
  }

  aplicarAjustes();
  ajustarEscala();
  atualizarRelogio();
  setInterval(atualizarRelogio, 20000);
  window.addEventListener('resize', ajustarEscala);
  // a lente aparece já no lugar, sem voar do canto
  lente.style.transition = 'none';
  carregar();
  setTimeout(function () { lente.style.transition = ''; }, 60);

  // Ao voltar de outro app, a tela aparece na hora, sem refazer nada.
  // A lista de apps só é relida se fazia mais de 10 minutos (pode ter app novo).
  var ultimaLeitura = Date.now();
  document.addEventListener('visibilitychange', function () {
    if (document.hidden || Date.now() - ultimaLeitura < 600000) return;
    ultimaLeitura = Date.now();
    carregar();
  });
})();


