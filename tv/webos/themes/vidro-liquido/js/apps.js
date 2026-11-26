// Fonte da lista de apps: na TV usa a API oficial do Tizen;
// no navegador do PC usa os apps reais da sua TV como exemplo, para testar o visual.
var Apps = (function () {
  var naTV = typeof tizen !== 'undefined' && !!tizen.application;

  // [id, nome, cor de identidade]. Os ícones oficiais são copiados da própria TV
  // por ferramentas/copiar-icones.ps1 para icones/ e vão dentro do pacote
  var exemplo = [
    ['org.tizen.netflix-app', 'Netflix', '#e50914'],
    ['org.tizen.primevideo', 'Prime Video', '#00a8e1'],
    ['9Ur5IzDKqV.TizenYouTube', 'YouTube', '#ff1f1f'],
    ['com.samsung.tv.aria-video', 'Apple TV', '#4a4a52'],
    ['org.tizen.globoplayapp', 'globoplay', '#f0263e'],
    ['Z07uHrNtXB.TelecinePlay', 'Telecine', '#c4122f'],
    ['org.tizen.browser', 'Browser', '#2f6fe0'],
    ['AkhP5nCr24.GoogleAssistant', 'Google Assistente', '#4285f4'],
    ['AQKO41xyKP.AmazonAlexa', 'Amazon Alexa', '#00b3e6'],
    ['yL49PNFmjW.PromotionApp', 'Samsung Promotion', '#1428a0'],
    ['GHI3a0zMSx.XboxGamePass', 'Xbox', '#107c10'],
    ['rJeHak5zRg.Spotify', 'Spotify', '#1db954'],
    ['J9fZJDMi1v.SecurityCenter', 'Security Center', '#2d7d9a'],
    ['jPPp4KCHp4.emanual', 'e-Manual', '#5a6070'],
    ['PHq4K3rTG8.ALCHRETAIL', 'Star+', '#c2187a'],
    ['X1pKpFCiUu.PlutoTV', 'Pluto TV', '#d4b600'],
    ['rJyOSqC6Up.PPlusIntl', 'Paramount+', '#0064ff'],
    ['5b8c3eb16b.BeamCTVDev', 'HBO Max', '#5822b4'],
    ['pZAXcloxTr.Sbt', '+SBT', '#0a8fd0'],
    ['MCmYXNxgcu.DisneyPlus', 'Disney+', '#113ccf']
  ].map(function (a) { return { id: a[0], nome: a[1], cor: a[2], icones: ['icones/' + a[0] + '.png'] }; });

  // Cor estável por nome, para apps sem cor conhecida (na TV)
  function corDe(texto) {
    var h = 0;
    for (var i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) % 360;
    return 'hsl(' + h + ', 55%, 42%)';
  }

  function meuId() {
    try { return tizen.application.getCurrentApplication().appInfo.id; } catch (e) { return ''; }
  }

  function caminhoIcone(p) {
    if (!p) return '';
    return p.charAt(0) === '/' ? 'file://' + p : p;
  }

  // Apps que não aparecem nunca (propaganda da Samsung)
  var OCULTOS = ['yL49PNFmjW.PromotionApp'];

  // Sem a lista da Samsung (por exemplo, em outra TV), separa os apps de verdade das peças
  // internas do sistema, que o Tizen também lista ("Network status widget", "RM service icon"...)
  var LOJA = /^[A-Za-z0-9]{10}\./; // apps da loja Samsung têm pacote de 10 letras/números
  var INTERNOS = /widget|service|popup|survey|test|dummy|daemon|agent|provider|plugin|engine|debug|dashboard|adplayer|agingapp|bridge|enabler|framework|autosetup|backup|keyboard|selector|notification|oobe|launcher|component/i;
  function pareceApp(i) {
    if (!i.show) return false;
    if (LOJA.test(i.id)) return true;
    return !!i.iconPath && !INTERNOS.test(i.name || '') && !INTERNOS.test(i.id);
  }

  // Nome curto: "Spotify - Music and Podcasts" vira "Spotify"
  function nomeCurto(nome) { return nome.split(' - ')[0]; }

  // icones/lista.json: os apps que a própria Samsung mostra na tela de Apps
  // (gerada por ferramentas/copiar-icones.ps1 a partir da TV onde o launcher vai rodar).
  // Sem ela, o launcher monta a lista sozinho com pareceApp().
  function lerListaDaSamsung(pronto) {
    var x = new XMLHttpRequest();
    x.onload = function () {
      try {
        var nomes = {};
        JSON.parse(x.responseText).forEach(function (a) { nomes[a.id] = nomeCurto(a.nome || ''); });
        pronto(nomes);
      } catch (e) { pronto(null); }
    };
    x.onerror = function () { pronto(null); };
    x.open('GET', 'icones/lista.json');
    x.send();
  }

  function listar(ok, erro) {
    if (!naTV) {
      setTimeout(function () {
        ok(exemplo.filter(function (a) { return OCULTOS.indexOf(a.id) < 0; }));
      }, 0);
      return;
    }
    var eu = meuId();
    lerListaDaSamsung(function (samsung) {
      tizen.application.getAppsInfo(function (infos) {
        ok(infos
          // fora: o próprio launcher, propaganda, e peças internas da TV que não são apps
          .filter(function (i) {
            if (i.id === eu || OCULTOS.indexOf(i.id) >= 0) return false;
            return samsung ? samsung.hasOwnProperty(i.id) : pareceApp(i);
          })
          .map(function (i) {
            var nome = (samsung && samsung[i.id]) || nomeCurto(i.name || i.id);
            // primeiro o ícone oficial que vem no pacote; se não houver, o que o sistema indicar
            var icones = ['icones/' + i.id + '.png'];
            if (i.iconPath) icones.push(caminhoIcone(i.iconPath));
            return { id: i.id, nome: nome, cor: corDe(nome), icones: icones };
          }));
      }, erro);
    });
  }

  // Abre o app "preso" ao launcher (modo GROUP do Tizen): quando você sai dele com Voltar,
  // o sistema volta para quem o abriu, que é o launcher. Se a TV recusar, abre do jeito simples.
  function abrir(id, ok, erro, semGrupo) {
    if (!naTV) { ok(false); return; }
    var simples = function () { tizen.application.launch(id, function () { ok(true); }, erro); };
    if (semGrupo) { simples(); return; }
    try {
      var pedido = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/default',
        null, null, null, null, 'GROUP');
      tizen.application.launchAppControl(pedido, id, function () { ok(true); }, simples);
    } catch (e) { simples(); }
  }

  // Tenta uma lista de IDs (apps do sistema mudam de nome entre modelos) até um abrir
  function abrirPrimeiro(ids, ok, erro, k) {
    k = k || 0;
    if (k >= ids.length) { erro(new Error('nenhum')); return; }
    abrir(ids[k], ok, function () { abrirPrimeiro(ids, ok, erro, k + 1); }, true);
  }

  return { naTV: naTV, listar: listar, abrir: abrir, abrirPrimeiro: abrirPrimeiro };
})();
