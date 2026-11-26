var Fundo = (function () {
  var FOTOS = 3;   // 1 = Curvas de luz (principal), 2 = Ondas, 3 = Montanhas (Augusto 26/11)
  function bust(n) {
    var b = localStorage.getItem('vidro.wall.bust');
    return (n === 1 && b) ? ('?v=' + b) : '';
  }
  function foto(n) { return 'fundos/foto-' + n + '.jpg' + bust(n); }
  function vidro(n) { return 'fundos/foto-' + n + '-vidro.jpg' + bust(n); }
  return { FOTOS: FOTOS, foto: foto, vidro: vidro };
})();
