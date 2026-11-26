(function(){
 var key='tvstudio.theme.page',valid=['vidro','aurora','cinema','sunset'];
 function params(){try{return JSON.parse((window.PalmSystem||window.webOSSystem||{}).launchParams||'{}');}catch(_){return {};}}
 function requested(){
  var p=params();
  if(p&&p.customWall){
   try{
    var a=JSON.parse(localStorage.getItem('vidro.ajustes.v2')||'{}');
    a.fundo=1;
    localStorage.setItem('vidro.ajustes.v2',JSON.stringify(a));
    localStorage.setItem('vidro.wall.bust',String(p.customWall));
   }catch(_){}
  }
  return p.studioTheme;
 }
 function go(theme){if(valid.indexOf(theme)>=0)localStorage.setItem(key,theme);var chosen=localStorage.getItem(key)||'vidro';if(valid.indexOf(chosen)<0)chosen='vidro';localStorage.setItem(key,chosen);var folder=chosen==='vidro'?'vidro-liquido':'discover';var inTheme=location.pathname.indexOf('/themes/')>=0;var current=location.pathname.indexOf('/themes/'+folder+'/')>=0;if(!current){location.replace((inTheme?'../../':'')+'themes/'+folder+'/index.html');}else if(params().customWall||(folder==='discover'&&theme&&document.body&&document.body.className!==theme)){location.reload();}}
 if(location.pathname.indexOf('/themes/')<0&&location.search!=='?temas')go(requested());
 document.addEventListener('webOSRelaunch',function(e){
  var d=(e.detail||{});
  if(d.customWall){
   try{
    var a=JSON.parse(localStorage.getItem('vidro.ajustes.v2')||'{}');
    a.fundo=1;
    localStorage.setItem('vidro.ajustes.v2',JSON.stringify(a));
    localStorage.setItem('vidro.wall.bust',String(d.customWall));
   }catch(_){}
   location.reload();
   return;
  }
  go(d.studioTheme||requested());
 });
 window.tvStudioSelectTheme=go;
})();
