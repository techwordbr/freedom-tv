(function () {
  var page = 'themes/vidro-liquido/index.html';
  var key = 'tvstudio.theme.page';
  if (location.search !== '?temas' && localStorage.getItem(key) === 'vidro') {
    location.replace(page);
    return;
  }
  document.getElementById('glass').onclick = function () {
    localStorage.setItem(key, 'vidro');
    location.replace(page);
  };
})();
