(function(){
 if(window.FreedomWifiModal)return;
 var DEFAULT_DISABLED=[
  'com.webos.app.lgchannels',
  'com.webos.app.sportsteamsettings',
  'com.twin.app.gamingportal',
  'com.webos.app.lifeonscreen',
  'shortcutcopilot',
  'epoxyaisports',
  'amazon.alexa.view',
  'com.playworks.app.hillrider',
  'com.miniclip.eightballpool'
 ];
 function getDisabledMap(){
  try{
   var raw=localStorage.getItem('freedom.apps.disabled.v1');
   if(!raw){
    var init={};
    for(var i=0;i<DEFAULT_DISABLED.length;i++)init[DEFAULT_DISABLED[i]]=true;
    localStorage.setItem('freedom.apps.disabled.v1',JSON.stringify(init));
    return init;
   }
   return JSON.parse(raw)||{};
  }catch(_){return {};}
 }
 function getRemovedMap(){
  try{return JSON.parse(localStorage.getItem('freedom.apps.removed.v1')||'{}')||{};}catch(_){return {};}
 }
 function isAppDisabled(id){return !!getDisabledMap()[id];}
 function isAppRemoved(id){return !!getRemovedMap()[id];}
 function setAppDisabled(id,disabled,cb){
  var map=getDisabledMap();
  if(disabled)map[id]=true;else delete map[id];
  try{localStorage.setItem('freedom.apps.disabled.v1',JSON.stringify(map));}catch(_){}
  if(disabled){
   lunaCall('luna://com.twbstudio.tvthemes.icons/appManage',{id:id,action:'disable'},function(){if(cb)cb();});
  }else if(cb)cb();
 }
 function uninstallApp(id,cb){
  lunaCall('luna://com.twbstudio.tvthemes.icons/appManage',{id:id,action:'uninstall'},function(r){
   var ok=!!(r&&r.returnValue);
   // TV without root: LG blocks removal from outside apps. Open the LG store on "Gerenciar aplicativos"
   // (it has the trash can) so the person confirms there. The app is NOT marked removed in this case.
   if(!ok&&r&&r.needsLgScreen){
    lunaCall('luna://com.webos.applicationManager/launch',{id:'com.webos.app.discovery',params:{query:'category/GAME_APPS/APPMANAGE'}},function(){});
    if(cb)cb('A LG pede para confirmar a exclusão na loja dela: escolha o app em "Gerenciar aplicativos" e aperte a lixeira.',false);
    return;
   }
   if(ok){var rmap=getRemovedMap();rmap[id]=true;try{localStorage.setItem('freedom.apps.removed.v1',JSON.stringify(rmap));}catch(_){}}
   if(cb)cb(ok?((r&&r.message)||'Aplicativo desinstalado.'):('Não foi possível desinstalar: '+((r&&r.errorText)||'a TV recusou')),ok);
  });
 }

 var style=document.createElement('style');
 style.textContent=
  '#freedom-overlay-backdrop{position:fixed;inset:0;z-index:9999;background:rgba(8,12,22,0.72);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .1s linear;pointer-events:none}' +
  '#freedom-overlay-backdrop.open{opacity:1;pointer-events:auto}' +
  '.freedom-sheet{width:680px;max-width:92vw;border-radius:36px;padding:34px 36px;background:rgba(20,26,42,0.92);border:1.5px solid rgba(255,255,255,0.22);box-shadow:0 28px 70px rgba(0,0,0,0.7),inset 0 1.5px 0 rgba(255,255,255,0.32);color:#f5f7fc;font-family:"Segoe UI",Roboto,Arial,sans-serif;transform:translateY(10px) scale(0.98);transition:transform .14s ease}' +
  '#freedom-overlay-backdrop.open .freedom-sheet{transform:translateY(0) scale(1)}' +
  '.freedom-sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}' +
  '.freedom-sheet-title{font-size:32px;font-weight:700;margin:0;display:flex;align-items:center;gap:14px}' +
  '.freedom-badge{font-size:17px;padding:6px 16px;border-radius:20px;background:rgba(184,245,131,0.2);color:#b8f583;border:1px solid rgba(184,245,131,0.45);font-weight:600}' +
  '.freedom-badge.off{background:rgba(255,120,120,0.2);color:#ffb0b0;border-color:rgba(255,120,120,0.4)}' +
  '.freedom-card-info{border-radius:24px;padding:18px 24px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);margin-bottom:18px}' +
  '.freedom-ssid{font-size:25px;font-weight:600;margin:0 0 6px 0}' +
  '.freedom-meta{font-size:18px;opacity:0.78;margin:0}' +
  '.freedom-dual-row{display:flex;gap:12px;margin-bottom:12px}' +
  '.freedom-dual-row .freedom-btn{flex:1;justify-content:center;text-align:center;flex-direction:column;gap:4px;padding:20px 16px}' +
  '.freedom-btn.danger:focus,.freedom-btn.danger.foco{background:rgba(255,95,95,0.28);border-color:#ff7b7b}' +
  '.freedom-actions{display:flex;flex-direction:column;gap:10px}' +
  '.freedom-btn{display:flex;align-items:center;justify-content:space-between;width:100%;padding:17px 24px;border-radius:22px;border:1.5px solid rgba(255,255,255,0.16);background:rgba(255,255,255,0.09);color:#fff;font-size:22px;font-weight:600;cursor:pointer;text-align:left;transition:none}' +
  '.freedom-btn:focus,.freedom-btn.foco{outline:none;background:rgba(184,245,131,0.24);border-color:#b8f583;transform:scale(1.015)}' +
  '.freedom-btn span.sub{font-size:16px;opacity:0.75;font-weight:400}' +
  '.app.desativado,.poster.desativado{opacity:0.42;filter:grayscale(0.85)}' +
  /* Vidro Líquido (padrão): vidro com reflexo */
  '.freedom-sheet{background:linear-gradient(150deg,rgba(70,82,110,0.96),rgba(28,34,52,0.97) 50%,rgba(20,26,42,0.98))}' +
  /* Cinema, Aurora e Entardecer: Material You, cada um na paleta do tema */
  'body.cinema #freedom-overlay-backdrop,body.aurora #freedom-overlay-backdrop,body.sunset #freedom-overlay-backdrop{-webkit-backdrop-filter:none;backdrop-filter:none}' +
  'body.cinema .freedom-sheet,body.aurora .freedom-sheet,body.sunset .freedom-sheet{-webkit-backdrop-filter:none;backdrop-filter:none;border:0;border-radius:40px;padding:36px 36px 30px;font-family:Roboto,"Google Sans",Arial,sans-serif;box-shadow:0 16px 48px rgba(0,0,0,0.45)}' +
  'body.cinema .freedom-sheet-title,body.aurora .freedom-sheet-title,body.sunset .freedom-sheet-title{font-weight:500;font-size:34px}' +
  'body.cinema .freedom-card-info,body.aurora .freedom-card-info,body.sunset .freedom-card-info{border:0;border-radius:28px}' +
  'body.cinema .freedom-btn,body.aurora .freedom-btn,body.sunset .freedom-btn{border:0;border-radius:999px;padding:18px 30px;font-weight:500;transition:none}' +
  'body.cinema .freedom-dual-row .freedom-btn,body.aurora .freedom-dual-row .freedom-btn,body.sunset .freedom-dual-row .freedom-btn{border-radius:28px}' +
  'body.cinema .freedom-btn:focus,body.cinema .freedom-btn.foco,body.aurora .freedom-btn:focus,body.aurora .freedom-btn.foco,body.sunset .freedom-btn:focus,body.sunset .freedom-btn.foco{transform:scale(1.03);outline:none}' +
  'body.cinema .freedom-badge,body.aurora .freedom-badge,body.sunset .freedom-badge{border:0;border-radius:999px;font-weight:500}' +
  /* Cinema: escuro com azul */
  'body.cinema #freedom-overlay-backdrop{background:rgba(6,7,10,0.72)}' +
  'body.cinema .freedom-sheet{background:#1d1f27;color:#e3e5ee}' +
  'body.cinema .freedom-card-info{background:#272a34}' +
  'body.cinema .freedom-btn{background:#2e323e;color:#e3e5ee}' +
  'body.cinema .freedom-btn:focus,body.cinema .freedom-btn.foco{background:#dbe5ff;color:#19233c;box-shadow:0 0 0 4px #b8ceff}' +
  'body.cinema .freedom-btn.danger{background:#4a2528;color:#ffb4ab}' +
  'body.cinema .freedom-btn.danger:focus,body.cinema .freedom-btn.danger.foco{background:#ffb4ab;color:#690005;box-shadow:0 0 0 4px #ffdad6}' +
  'body.cinema .freedom-badge{background:#2e3a57;color:#dbe5ff}' +
  /* Aurora: claro */
  'body.aurora #freedom-overlay-backdrop{background:rgba(32,33,43,0.38)}' +
  'body.aurora .freedom-sheet{background:#f7f6fb;color:#1b1c24;box-shadow:0 16px 48px rgba(32,33,50,0.25)}' +
  'body.aurora .freedom-card-info{background:#e6e8f3}' +
  'body.aurora .freedom-btn{background:#e2e1eb;color:#1b1c24}' +
  'body.aurora .freedom-btn:focus,body.aurora .freedom-btn.foco{background:#4d5e8a;color:#fff;box-shadow:0 0 0 4px #b9c6ea}' +
  'body.aurora .freedom-btn.danger{background:#ffdad6;color:#93000a}' +
  'body.aurora .freedom-btn.danger:focus,body.aurora .freedom-btn.danger.foco{background:#ba1a1a;color:#fff;box-shadow:0 0 0 4px #ffb4ab}' +
  'body.aurora .freedom-badge{background:#dde1f9;color:#2f3d63}' +
  'body.aurora .freedom-badge.off{background:#ffdad6;color:#93000a}' +
  /* Entardecer: tons quentes */
  'body.sunset #freedom-overlay-backdrop{background:rgba(18,12,10,0.7)}' +
  'body.sunset .freedom-sheet{background:#2b2321;color:#f3dfd6}' +
  'body.sunset .freedom-card-info{background:#382d2a}' +
  'body.sunset .freedom-btn{background:#433531;color:#f3dfd6}' +
  'body.sunset .freedom-btn:focus,body.sunset .freedom-btn.foco{background:#f7d6bf;color:#352a23;box-shadow:0 0 0 4px #ffd7bb}' +
  'body.sunset .freedom-btn.danger{background:#5c2b22;color:#ffb4a1}' +
  'body.sunset .freedom-btn.danger:focus,body.sunset .freedom-btn.danger.foco{background:#ff8a70;color:#3d0700;box-shadow:0 0 0 4px #ffdad2}' +
  'body.sunset .freedom-badge{background:#4f3b32;color:#ffd7bb}';
 document.head.appendChild(style);

 var backdrop=document.createElement('div');
 backdrop.id='freedom-overlay-backdrop';
 backdrop.innerHTML='<div class="freedom-sheet" role="dialog" aria-modal="true"><div class="freedom-sheet-head"><h2 class="freedom-sheet-title" id="fo-title">Wi-Fi e Conexão</h2><span class="freedom-badge" id="fo-badge">Conectado</span></div><div class="freedom-card-info" id="fo-info"><p class="freedom-ssid" id="fo-ssid">Consultando rede Wi-Fi da LG…</p><p class="freedom-meta" id="fo-meta">Verificando endereço IP e sinal</p></div><div class="freedom-dual-row" id="fo-dual" style="display:none"></div><div class="freedom-actions" id="fo-actions"></div></div>';
 function mount(){if(!document.getElementById('freedom-overlay-backdrop'))document.body.appendChild(backdrop);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();

 var isOpen=false,buttons=[],focusIdx=0,previousFocus=null;
 function lunaCall(uri,payload,cb,waitMs){
  var B=window.webOSServiceBridge||window.PalmServiceBridge;
  if(!B)return cb({returnValue:false});
  var b=new B(),done=false;
  var t=setTimeout(function(){if(!done){done=true;cb({returnValue:false});}},waitMs||4000);
  b.onservicecallback=function(raw){if(done)return;done=true;clearTimeout(t);try{cb(JSON.parse(raw));}catch(_){cb({returnValue:false});}};
  try{b.call(uri,JSON.stringify(payload||{}));}catch(_){clearTimeout(t);cb({returnValue:false});}
 }

 function launchNative(id,params){
  closeModal();
  lunaCall('luna://com.webos.applicationManager/launch',params?{id:id,params:params}:{id:id},function(){});
 }

 function updateFocus(idx){
  if(!buttons.length)return;
  focusIdx=(idx+buttons.length)%buttons.length;
  for(var i=0;i<buttons.length;i++){
   buttons[i].classList.toggle('foco',i===focusIdx);
  }
  buttons[focusIdx].focus();
 }

 function closeModal(){
  if(!isOpen)return;
  isOpen=false;
  backdrop.classList.remove('open');
  if(previousFocus&&typeof previousFocus.focus==='function'){try{previousFocus.focus();}catch(_){}}
 }

 function setActions(items,dualItems){
  pointerFresh=false;
  var dualBox=document.getElementById('fo-dual');
  var box=document.getElementById('fo-actions');
  dualBox.innerHTML='';
  box.innerHTML='';
  buttons=[];
  if(Array.isArray(dualItems)&&dualItems.length){
   dualBox.style.display='flex';
   dualItems.forEach(function(item){
    var idx=buttons.length;
    var b=document.createElement('button');
    b.type='button';
    b.className='freedom-btn'+(item.danger?' danger':'');
    b.innerHTML='<span>'+item.label+'</span><span class="sub">'+(item.sub||'')+'</span>';
    b.onclick=function(e){e.stopPropagation();if(e.detail>0&&!pointerFresh)return;pointerFresh=false;item.action();};
    b.onmouseenter=function(){updateFocus(idx);};
    dualBox.appendChild(b);
    buttons.push(b);
   });
  }else{
   dualBox.style.display='none';
  }
  items.forEach(function(item){
   var idx=buttons.length;
   var b=document.createElement('button');
   b.type='button';
   b.className='freedom-btn'+(item.danger?' danger':'');
   b.innerHTML='<span>'+item.label+'</span><span class="sub">'+(item.sub||'OK ›')+'</span>';
   b.onclick=function(e){e.stopPropagation();if(e.detail>0&&!pointerFresh)return;pointerFresh=false;item.action();};
   b.onmouseenter=function(){updateFocus(idx);};
   box.appendChild(b);
   buttons.push(b);
  });
  setTimeout(function(){var s=0;for(var i=0;i<buttons.length;i++){if(buttons[i].className.indexOf('danger')<0){s=i;break;}}updateFocus(s);},15);
 }

 function refreshWifiStatus(){
  var ssidEl=document.getElementById('fo-ssid');
  var metaEl=document.getElementById('fo-meta');
  var badgeEl=document.getElementById('fo-badge');
  lunaCall('luna://com.palm.connectionmanager/getStatus',{},function(r){
   if(!r||r.returnValue===false){
    lunaCall('luna://com.webos.service.connectionmanager/getstatus',{},function(r2){renderWifi(r2);});
    return;
   }
   renderWifi(r);
  });
  function renderWifi(r){
   var wifi=(r&&r.wifi)||{};
   var wired=(r&&r.wired)||{};
   var connected=wifi.state==='connected'||wired.state==='connected'||r.isInternetConnectionAvailable===true;
   badgeEl.textContent=connected?'Conectado':'Verificar';
   badgeEl.className='freedom-badge'+(connected?'':' off');
   if(wifi.state==='connected'){
    ssidEl.textContent='Wi-Fi: '+(wifi.ssid||'Rede sem fio conectada');
    metaEl.textContent='IP: '+(wifi.ipAddress||'automático')+' · Internet: '+(wifi.onInternet==='yes'||r.isInternetConnectionAvailable?'Ativa':'Local');
   }else if(wired.state==='connected'){
    ssidEl.textContent='Cabo de Rede (Ethernet)';
    metaEl.textContent='IP: '+(wired.ipAddress||'automático')+' · Conectado via cabo';
   }else{
    ssidEl.textContent='Wi-Fi da Smart TV LG';
    metaEl.textContent='Gerencie sua conexão sem sair do tema';
   }
  }
 }

 function openWifi(){
  mount();
  previousFocus=document.activeElement;
  isOpen=true;
  document.getElementById('fo-title').textContent='Wi-Fi e Ajustes Rápidos';
  document.getElementById('fo-info').style.display='block';
  document.getElementById('fo-badge').style.display='inline-block';
  document.getElementById('fo-ssid').textContent='Consultando rede Wi-Fi da LG…';
  document.getElementById('fo-meta').textContent='Aguarde um instante…';
  backdrop.classList.add('open');
  try{history.pushState({freedomModal:true},'');}catch(_){}
  refreshWifiStatus();
  setActions([
   {label:'Escolher rede Wi-Fi / Senha',sub:'Painel Wi-Fi da LG ›',action:function(){launchNative('com.palm.app.settings',{target:'network'});}},
   {label:'Atualizar status da conexão',sub:'Verificar IP e sinal',action:function(){refreshWifiStatus();}},
   {label:'Ajustes rápidos de Imagem',sub:'Brilho e modo de imagem ›',action:function(){launchNative('com.palm.app.settings',{target:'picture'});}},
   {label:'Ajustes rápidos de Som',sub:'Saída de áudio e modo ›',action:function(){launchNative('com.palm.app.settings',{target:'sound'});}},
   {label:'Todas as Configurações da TV',sub:'Menu geral da LG ›',action:function(){launchNative('com.palm.app.settings');}},
   {label:'Fechar menu flutuante',sub:'Voltar ao tema',action:closeModal}
  ]);
 }

 // Holding OK on the LG remote sends a stream of down/up pairs, not one long press: OK is accepted only after
 // 450 ms with no OK at all (the person really let go), and again after each new screen (the confirmation).
 var okArmed=true,armTimer=null,pointerFresh=false;
 // Magic Remote pointer: releasing the OK that opened the menu is a click right where the menu appears (Desinstalar,
 // then Sim, desinstalar). A pointer click counts only if the button was pressed after this screen appeared.
 window.addEventListener('pointerdown',function(){if(isOpen)pointerFresh=true;},true);
 window.addEventListener('mousedown',function(){if(isOpen)pointerFresh=true;},true);
 function disarm(){okArmed=false;clearTimeout(armTimer);armTimer=setTimeout(function(){okArmed=true;},450);}
 function openAppEdit(appName,options){
  mount();
  disarm();
  previousFocus=document.activeElement;
  isOpen=true;
  var disabled=options.appId&&!options.noDisable?isAppDisabled(options.appId):false;
  document.getElementById('fo-title').textContent=appName||'Gerenciar aplicativo';
  document.getElementById('fo-badge').style.display='inline-block';
  document.getElementById('fo-badge').className='freedom-badge'+(disabled?' off':'');
  document.getElementById('fo-badge').textContent=disabled?'Desativado':'Ativo';
  document.getElementById('fo-info').style.display='block';
  document.getElementById('fo-ssid').textContent=disabled?'Este aplicativo está desativado (não consome memória)':'Gerenciar aplicativo e posição';
  document.getElementById('fo-meta').textContent=options.noDisable?'Você pode abrir ou desinstalar este aplicativo.':'Você pode ativar/desativar, desinstalar ou mover de posição com ◀ ▶';
  if(options.noDisable)document.getElementById('fo-ssid').textContent='Gerenciar aplicativo';
  backdrop.classList.add('open');
  try{history.pushState({freedomModal:true},'');}catch(_){}

  // Two side-by-side buttons at the top: [Ativar / Desativar] and [Desinstalar]
  var dual=[];
  if(options.appId&&!options.noDisable){
   dual.push({
    label:disabled?'Ativar aplicativo':'Desativar aplicativo',
    sub:disabled?'Mostrar e liberar uso':'Ocultar e liberar RAM',
    action:function(){
     closeModal();
     setAppDisabled(options.appId,!disabled,function(){
      if(options.onChanged)options.onChanged(!disabled?'Aplicativo desativado para deixar a TV mais rápida.':'Aplicativo ativado novamente.');
     });
    }
   });
  }
  if(options.appId){
   dual.push({
    label:'Desinstalar',
    sub:'Remover da Smart TV',
    danger:true,
    action:function(){
     disarm();
     document.getElementById('fo-ssid').textContent='Desinstalar '+(appName||'este aplicativo')+' da TV?';
     document.getElementById('fo-meta').textContent='O aplicativo e os dados dele serão apagados da Smart TV.';
     setActions([
      {label:'Sim, desinstalar',sub:'Remover da Smart TV',danger:true,action:function(){
       closeModal();
       if(options.onChanged)options.onChanged('Desinstalando '+(appName||'aplicativo')+'…');
       uninstallApp(options.appId,function(msg,ok){
        if(options.onChanged)options.onChanged(msg,ok,ok?options.appId:null);
       });
      }},
      {label:'Cancelar',sub:'Manter o aplicativo',action:closeModal}
     ]);
    }
   });
  }

  var list=[];
  if(!disabled&&options.onStartMove){
   list.push({label:'Mover aplicativo de lugar',sub:'Usar setas ◀ ▶',action:function(){closeModal();options.onStartMove();}});
  }
  if(!disabled&&options.onMoveLeft){
   list.push({label:'Mover para a esquerda (◀)',sub:'Reposicionar',action:function(){options.onMoveLeft();}});
  }
  if(!disabled&&options.onMoveRight){
   list.push({label:'Mover para a direita (▶)',sub:'Reposicionar',action:function(){options.onMoveRight();}});
  }
  if(!disabled&&options.onToggleFav){
   list.push({label:options.isFav?'Remover dos Favoritos':'Fixar nos Favoritos',sub:'★ Favorito',action:function(){closeModal();options.onToggleFav();}});
  }
  if(!disabled&&options.onOpen){
   list.push({label:'Abrir '+appName,sub:'Iniciar agora ›',action:function(){closeModal();options.onOpen();}});
  }
  list.push({label:'Fechar',sub:'Voltar',action:closeModal});
  setActions(list,dual);
 }

 window.addEventListener('keydown',function(e){
  if(!isOpen)return;
  var k=e.keyCode;
  e.preventDefault();
  e.stopPropagation();
  if(k===38||k===37){updateFocus(focusIdx-1);}
  else if(k===40||k===39){updateFocus(focusIdx+1);}
  else if(k===13){if(e.repeat||!okArmed){disarm();return;}if(buttons[focusIdx])buttons[focusIdx].click();}
  else if(k===461||k===10009||k===27||k===8){closeModal();}
 },true);

 window.addEventListener('keyup',function(e){if(e.keyCode===13&&isOpen&&!okArmed)disarm();},true);

 window.addEventListener('popstate',function(){
  if(isOpen)closeModal();
 });

 backdrop.addEventListener('click',function(e){
  if(e.target===backdrop)closeModal();
 });

 // Developer Mode warning (Augusto 26/11): on a TV without root, LG deletes the Freedom TV when the Developer Mode
 // session runs out. With 7 days or less left, warn (at most once every 20 h) and offer LG's Developer Mode app,
 // where the person presses "Extend" to renew. Nothing is shown with root or when the time cannot be read.
 var DEV_WARN_HOURS=7*24,DEV_WARN_KEY='freedom.devmode.warned.v1',devChecked=0;
 function openDevModeWarning(hoursLeft){
  mount();
  disarm();
  previousFocus=document.activeElement;
  isOpen=true;
  var days=Math.floor(hoursLeft/24),when=hoursLeft<=0?'vence hoje':(days>=2?'vence em '+days+' dias':'vence em '+Math.max(1,hoursLeft)+' horas');
  document.getElementById('fo-title').textContent='Renovar o Modo Desenvolvedor';
  document.getElementById('fo-badge').style.display='inline-block';
  document.getElementById('fo-badge').className='freedom-badge off';
  document.getElementById('fo-badge').textContent=when.charAt(0).toUpperCase()+when.slice(1);
  document.getElementById('fo-info').style.display='block';
  document.getElementById('fo-ssid').textContent='O Modo Desenvolvedor da LG '+when+'.';
  document.getElementById('fo-meta').textContent='Se ele vencer, a TV apaga o Freedom TV. Abra o app "Developer Mode" da LG e aperte "Extend" para renovar.';
  backdrop.classList.add('open');
  try{history.pushState({freedomModal:true},'');}catch(_){}
  setActions([
   {label:'Renovar agora',sub:'Abrir o app Developer Mode ›',action:function(){launchNative('com.palmdts.devmode');}},
   {label:'Lembrar depois',sub:'Avisar de novo amanhã',action:closeModal}
  ]);
 }
 function checkDevMode(){
  if(document.hidden||isOpen)return;
  var last=+(localStorage.getItem(DEV_WARN_KEY)||0);
  if(Date.now()-last<20*3600000||Date.now()-devChecked<3600000)return;
  devChecked=Date.now();
  lunaCall('luna://com.twbstudio.tvthemes.icons/devModeSession',{},function(r){
   if(!r||!r.returnValue||r.root||typeof r.hoursLeft!=='number'||r.hoursLeft>DEV_WARN_HOURS)return;
   if(document.hidden||isOpen)return;
   try{localStorage.setItem(DEV_WARN_KEY,String(Date.now()));}catch(_){}
   openDevModeWarning(r.hoursLeft);
  },15000);
 }
 setTimeout(checkDevMode,20000);
 setInterval(checkDevMode,6*3600000);
 document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(checkDevMode,3000);});

 window.FreedomWifiModal={
  showDevModeWarning:openDevModeWarning,
  open:function(){lunaCall('luna://com.twbstudio.tvthemes.icons/quickMenu',{},function(r){if(!r||!r.returnValue)launchNative('com.webos.app.quicksettings');});},
  openAppEdit:openAppEdit,
  close:closeModal,
  isOpen:function(){return isOpen;},
  isAppDisabled:isAppDisabled,
  isAppRemoved:isAppRemoved,
  setAppDisabled:setAppDisabled,
  uninstallApp:uninstallApp,
  // An app marked removed that the TV still lists was not really uninstalled: show it again.
  forgetRemoved:function(ids){var m=getRemovedMap(),changed=false;(ids||[]).forEach(function(id){if(m[id]){delete m[id];changed=true;}});if(changed)try{localStorage.setItem('freedom.apps.removed.v1',JSON.stringify(m));}catch(_){}}
 };
})();