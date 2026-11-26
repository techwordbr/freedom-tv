// Preferências do launcher, salvas dentro do próprio app (somem se ele for desinstalado).
var Ajustes = (function () {
  var PADRAO = { fundo: 1, troca: 60, vidro: 'equilibrado', transparencia: 50, reflexos: 60, animacao: 'suaves', extras: false };

  function ler(chave, padrao) {
    try { var v = localStorage.getItem(chave); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; }
  }
  function gravar(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) {}
  }

  var atual = Object.assign({}, PADRAO, ler('launcher.ajustes', {}));
  // Opções antigas que travavam a TV: se estiverem salvas, volta para o modo leve
  if (atual.vidro !== 'leve' && atual.vidro !== 'equilibrado') atual.vidro = 'equilibrado';
  atual.extras = false;
  if (!(atual.fundo >= 0 && atual.fundo <= 3)) atual.fundo = 1;
  // Once: the new main wallpaper (Ondas) for TVs that had settings saved before it existed.
  if (!localStorage.getItem('launcher.fundo.v3')) { atual.fundo = 1; localStorage.setItem('launcher.fundo.v3', '1'); gravar('launcher.ajustes', atual); }

  return {
    atual: atual,
    salvar: function () { gravar('launcher.ajustes', atual); },
    restaurar: function () { Object.assign(atual, PADRAO); gravar('launcher.ajustes', atual); },
    favoritos: function () { return ler('launcher.favoritos', null); },
    salvarFavoritos: function (ids) { gravar('launcher.favoritos', ids); }
  };
})();
