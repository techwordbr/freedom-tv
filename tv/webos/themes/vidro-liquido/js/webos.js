(function () {
  var Bridge = window.webOSServiceBridge || window.PalmServiceBridge;
  if (!window.PalmSystem && !Bridge && !/Web0S|webOS/i.test(navigator.userAgent)) return;
  function call(method, params, ok, fail, service) {
    if (!Bridge) return fail(new Error('Serviço indisponível'));
    var bridge = new Bridge();
    var timeout = setTimeout(function () {
      bridge.onservicecallback = function () {};
      fail(new Error('A TV não respondeu'));
    }, (method === 'catalog' || method === 'homeRedirect') ? 50000 : 8000);
    bridge.onservicecallback = function (message) {
      clearTimeout(timeout);
      var result;
      try { result = JSON.parse(message); } catch (error) { return fail(error); }
      if (!result.returnValue) return fail(new Error(result.errorText || 'Acesso indisponível'));
      ok(result);
    };
    try { bridge.call('luna://' + (service || 'com.webos.applicationManager') + '/' + method, JSON.stringify(params)); }
    catch (error) { clearTimeout(timeout); fail(error); }
  }
  function verificarCatalogo(ok, fail) {
    var catalogo = LGIconCatalog;
    var instalados = [], restantes = catalogo.length;
    function concluir() {
      restantes -= 1;
      if (restantes) return;
      if (instalados.length) ok(instalados);
      else fail(new Error('Nenhum aplicativo do catálogo foi confirmado pelo webOS.'));
    }
    catalogo.forEach(function (item) {
      call('getAppLoadStatus', {appId: item.id}, function (resposta) {
        if (resposta.exist === true) instalados.push({id:item.id, nome:item.nome, cor:item.cor, icones:[item.icone]});
        concluir();
      }, concluir);
    });
  }
  function carregarIcone(app, pronto) {
    call('getIcon', {id:app.id}, function (result) {
      if (typeof result.image === 'string' && result.image.indexOf('data:image/png;base64,') === 0) pronto(result.image);
    }, function () {}, 'com.twbstudio.tvthemes.icons');
  }
  Apps = {
    redirecionarHome: function(enabled, ok, fail) {
      call('homeRedirect', {enabled:enabled}, function(result){ok(result.message);}, fail, 'com.twbstudio.tvthemes.icons');
    },
    carregarIcone: carregarIcone,
    naTV: true,
    listar: function (receive, fail) {
      var cached, delivered = false, lastData = '';
      try {
        cached = JSON.parse(localStorage.getItem('tvstudio.lg.apps.v1'));
        if (Array.isArray(cached) && cached.length && cached.every(function(a) { return a && typeof a.id === 'string' && typeof a.nome === 'string'; })) {
          lastData = JSON.stringify(cached);
          delivered = true;
          receive(cached);
        }
      } catch (_) {}
      function ok(apps) {
        apps.forEach(function(app) {
          var saved = LGIconCatalog.filter(function(entry) { return entry.id === app.id; })[0];
          if (saved) app.icones = [saved.icone].concat(app.icones || []);
        });
        var data = JSON.stringify(apps);
        try { localStorage.setItem('tvstudio.lg.apps.v1', data); } catch (_) {}
        if (data !== lastData) receive(apps);
        delivered = true;
        lastData = data;
      }
      function failed(error) { if (!delivered) fail(error); }
      call('catalog', {}, function(result) {
        if (result.apps && result.apps.length) ok(result.apps); else Apps.listarBasico(ok,failed);
      }, function(){ Apps.listarBasico(ok,failed); }, 'com.twbstudio.tvthemes.icons');
    },
    listarBasico: function (ok, fail) {
      call('listApps', {}, function (result) {
        if (!Array.isArray(result.apps)) return verificarCatalogo(ok, fail);
        var apps = result.apps.filter(function (app) {
          return app.id && app.title && app.visible !== false && app.id !== 'com.twbstudio.tvthemes';
        }).map(function (app) {
          var icon = app.icon || '';
          if (icon && icon.charAt(0) !== '/' && app.folderPath) icon = app.folderPath + '/' + icon;
          return {id: app.id, nome: app.title, cor: '#284657', icones: icon.charAt(0) === '/' ? ['file://' + icon] : []};
        });
        if (!apps.length) return verificarCatalogo(ok, fail);
        ok(apps);
      }, function () { verificarCatalogo(ok, fail); });
    },
    menuRapido: function (ok, fail) {
      call('quickMenu', {}, function () { if (ok) ok(true); }, function () {
        call('launch', {id: 'com.webos.app.quicksettings'}, function () { if (ok) ok(true); }, fail || function(){});
      }, 'com.twbstudio.tvthemes.icons');
    },
    abrir: function (id, ok, fail, params) { call('launch', params ? {id: id, params: params} : {id: id}, function () { if (ok) ok(true); }, fail || function(){}); },
    abrirPrimeiro: function (ids, ok, fail) {
      var list = Array.isArray(ids) ? ids.slice() : ['com.palm.app.settings'];
      function next(err) {
        if (!list.length) return fail && fail(err || new Error('Indisponível'));
        var item = list.shift();
        if (typeof item === 'object' && item.id) call('launch', {id: item.id, params: item.params}, function () { if (ok) ok(true); }, next);
        else call('launch', {id: item}, function () { if (ok) ok(true); }, next);
      }
      next();
    }
  };
})();





