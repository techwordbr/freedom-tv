(function(){
 function go(){location.href=(location.pathname.indexOf('/themes/')>=0?'../../':'')+'setup/index.html';}
 function launchLg(id,params){
  var B=window.webOSServiceBridge||window.PalmServiceBridge;
  if(!B)return;
  var b=new B();
  try{b.call('luna://com.webos.applicationManager/launch',JSON.stringify(params?{id:id,params:params}:{id:id}));}catch(_){}
 }
 function quickMenu(){
  var B=window.webOSServiceBridge||window.PalmServiceBridge;if(!B)return;
  var b=new B(),done=false;
  var t=setTimeout(function(){if(!done){done=true;launchLg('com.webos.app.quicksettings');}},8000);
  b.onservicecallback=function(m){if(done)return;done=true;clearTimeout(t);var r={};try{r=JSON.parse(m);}catch(_){}if(!r.returnValue)launchLg('com.webos.app.quicksettings');};
  try{b.call('luna://com.twbstudio.tvthemes.icons/quickMenu','{}');}catch(_){clearTimeout(t);launchLg('com.webos.app.quicksettings');}
 }
 function add(){
  var existing=document.getElementById('root-menu');
  if(existing){existing.onclick=go;}
  else{
   var b=document.createElement('button');b.id='root-menu';b.textContent='Tela inicial / Root';b.onclick=go;
   var controls=document.getElementById('controls'),nav=document.querySelector('header nav');
   if(controls)controls.appendChild(b);else if(nav)nav.appendChild(b);
  }
  var ant=document.getElementById('btn-antenna');if(ant)ant.onclick=function(){launchLg('com.webos.app.livetv');};
  var hdmi=document.getElementById('btn-hdmi');if(hdmi)hdmi.onclick=function(){launchLg('com.webos.app.homeconnect');};
  var wifi=document.getElementById('btn-wifi');if(wifi)wifi.onclick=function(){quickMenu();};
  var cfg=document.getElementById('btn-tvsettings');if(cfg)cfg.onclick=function(){launchLg('com.palm.app.settings');};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
})();
(function () {
 // Home and turning the TV on open the chosen theme, also without root (Augusto, 25/11). The 0.5.1 recovery
 // release switched it off on every start; this turns it back on once, then the person's choice
 // ("Voltar ao menu da LG" in the setup page) is kept by the service.
 var Bridge = window.webOSServiceBridge || window.PalmServiceBridge;
 if (!Bridge || localStorage.getItem('tvstudio.home.v2')) return;
 var bridge = new Bridge();
 window.tvStudioHomeBridge = bridge;
 bridge.onservicecallback = function (raw) {
  try { if (JSON.parse(raw).returnValue === true) { localStorage.setItem('tvstudio.home.v2', '1'); localStorage.setItem('tvstudio.returnHome', '1'); } } catch (_) {}
 };
 try { bridge.call('luna://com.twbstudio.tvthemes.icons/homeRedirect', '{"enabled":true}'); } catch (_) {}
})();
