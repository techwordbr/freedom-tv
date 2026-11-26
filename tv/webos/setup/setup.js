(function(){
 var $=function(id){return document.getElementById(id);},pending=false;
 function call(method,payload,cb){var B=window.webOSServiceBridge||window.PalmServiceBridge;if(!B)return cb({returnValue:false,errorText:'Esta ação precisa ser executada na TV LG.'});var b=new B(),done=false;window.setupBridge=b;var timer=setTimeout(function(){finish({returnValue:false,errorText:'A TV não respondeu a tempo. Tente novamente.'});},90000);function finish(r){if(done)return;done=true;clearTimeout(timer);cb(r);}b.onservicecallback=function(raw){try{finish(JSON.parse(raw));}catch(e){finish({returnValue:false,errorText:'Resposta inválida.'});}};try{b.call(method,JSON.stringify(payload));}catch(e){finish({returnValue:false,errorText:'Serviço indisponível.'});}}
 $('persistence-check').onclick=function(){if(pending)return;pending=true;this.disabled=true;$('persistence-status').textContent='Verificando root, instalação e preparação para reiniciar…';call('luna://com.twbstudio.tvthemes.icons/rootPersistenceStatus',{},function(r){pending=false;$('persistence-check').disabled=false;$('persistence-status').textContent=r.message||r.errorText||'Verificação não confirmada.';});};
 function status(t){$('status').textContent=t;}
 function backup(){if(!localStorage.getItem('tvstudio.home.backup.v1'))localStorage.setItem('tvstudio.home.backup.v1',JSON.stringify({created:new Date().toISOString(),returnHome:localStorage.getItem('tvstudio.returnHome')}));}
 $('apply-root-home').onclick=function(){
  if(pending)return;backup();pending=true;$('apply-root-home').disabled=true;
  status('Ativando abertura direta no botão Home e ao ligar a TV (deixando o menu da LG adormecido)…');
  call('luna://com.twbstudio.tvthemes.icons/rootApplyHome',{},function(r){
   pending=false;$('apply-root-home').disabled=false;
   if(r.returnValue){localStorage.setItem('tvstudio.returnHome','1');localStorage.setItem('tvstudio.rootHome','1');}
   status(r.message||r.errorText);
  });
 };
 $('normal').onclick=function(){if(pending)return;backup();pending=true;status('Ativando retorno pelo Home (modo sem root)…');call('luna://com.twbstudio.tvthemes.icons/homeRedirect',{enabled:true},function(r){pending=false;if(r.returnValue)localStorage.setItem('tvstudio.returnHome','1');status(r.returnValue?'Ativado: ao apertar Home ou ligar a TV, ela passa um instante pelo menu da LG e abre o seu tema.':r.errorText);});};
 $('startup-normal').onclick=function(){$('normal').onclick();};
 $('root').onclick=function(){if(pending)return;pending=true;$('root').disabled=true;status('Consultando a TV…');call('luna://com.twbstudio.tvthemes.icons/rootPreflight',{},function(r){pending=false;$('root').disabled=false;if(!r.returnValue)return status(r.errorText);$('report').hidden=false;$('device').textContent='Modelo: '+(r.model||'LG webOS')+' · webOS: '+(r.sdk||'detectado')+' · Software: '+(r.firmware||'detectado');$('result').textContent=r.message;$('recovery').textContent=r.recovery;$('attempt').disabled=r.rootConfirmed===true;status(r.message||'Verificação concluída.');$('report').scrollIntoView();});};
 $('restore').onclick=function(){
  if(pending)return;pending=true;backup();
  status('Restaurando o menu original da LG…');
  call('luna://com.twbstudio.tvthemes.icons/homeRedirect',{enabled:false},function(){
   localStorage.setItem('tvstudio.returnHome','0');localStorage.setItem('tvstudio.home.v2','1');
   localStorage.removeItem('tvstudio.rootHome');
   if(localStorage.getItem('tvstudio.startupAttempt')==='accepted')call('luna://com.twbstudio.tvthemes.icons/startupNoRoot',{enabled:false},function(){});
   localStorage.removeItem('tvstudio.startupAttempt');
   call('luna://com.twbstudio.tvthemes.icons/rootRestoreHome',{},function(r){
    pending=false;
    call('luna://com.webos.applicationManager/launch',{id:'com.webos.app.home'},function(result){
     status(r.message||(result.returnValue?'Menu original da LG restaurado.':'Retorno desligado. Aperte Home no controle para abrir o menu original da LG.'));
    });
   });
  });
 };
 $('attempt').onclick=function(){if(pending)return;$('consent').hidden=false;$('execute').focus();$('consent').scrollIntoView();};
 $('cancel-root').onclick=function(){$('consent').hidden=true;$('attempt').focus();};
 $('execute').onclick=function(){if(pending)return;pending=true;$('execute').disabled=true;status('Iniciando instalação do Root. Aguarde…');call('luna://com.twbstudio.tvthemes.icons/rootBegin',{consent:'root-experimental-lg-universal'},function(r){pending=false;$('execute').disabled=false;status(r.message||r.errorText);});};
 $('check-root').onclick=function(){if(pending)return;pending=true;status('Conferindo estado do root…');call('luna://com.twbstudio.tvthemes.icons/rootStatus',{},function(r){pending=false;status(r.message||r.errorText);});};
 $('back').onclick=function(){if(!pending)location.href='../index.html';};
 // The TV browser does not scroll to the focused button by itself: the lower sections stayed hidden at the bottom
 // edge (Augusto 26/11). The page now moves with the focus, keeping the chosen button (and its section) in view.
 function showFocused(el){
  var sec=el.closest?el.closest('section'):null,r=el.getBoundingClientRect(),h=window.innerHeight;
  var top=r.top+window.pageYOffset-h*0.35;
  if(sec&&sec.getBoundingClientRect().height<h*0.8)top=Math.min(top,sec.getBoundingClientRect().top+window.pageYOffset-40);
  if(r.top<h*0.15||r.bottom>h*0.85){top=Math.max(0,top);try{window.scrollTo({top:top,behavior:'smooth'});}catch(_){window.scrollTo(0,top);}}
 }
 document.addEventListener('focusin',function(e){if(e.target&&e.target.tagName==='BUTTON')showFocused(e.target);});
 document.addEventListener('keydown',function(e){var buttons=Array.prototype.slice.call(document.querySelectorAll('button:not(:disabled)')).filter(function(b){return b.offsetParent!==null;});var at=buttons.indexOf(document.activeElement);if([37,38,39,40].indexOf(e.keyCode)>=0){e.preventDefault();var delta=(e.keyCode===37||e.keyCode===38)?-1:1;var next=buttons[(at+delta+buttons.length)%buttons.length];next.focus();showFocused(next);}if((e.keyCode===461||e.keyCode===10009||e.keyCode===27)&&!pending){e.preventDefault();location.href='../index.html';}});
 // Root Home on/off from here, to show root and no-root side by side (Augusto 25/11).
 $('startup-normal').hidden=true;
 var off=document.createElement('button');off.id='root-off';off.textContent='Desativar modo root (usar sem root)';$('apply-root-home').insertAdjacentElement('afterend',off);
 // The two switches show the real state and change it (Augusto 25/11: "chavinha" to see which mode is on).
 var swTheme=$('sw-theme'),swRoot=$('sw-root'),swLg=$('sw-lg'),last={};
 function setSw(el,on,sub){el.setAttribute('aria-checked',on?'true':'false');el.classList.remove('busy');$(el.id+'-sub').textContent=sub;}
 function mode(){call('luna://com.twbstudio.tvthemes.icons/homeRedirectStatus',{},function(r){if(!r.returnValue)return;last=r;var themeOn=r.rootHome||r.enabled;
  setSw(swTheme,themeOn,themeOn?'Ligado · o Home e o ligar da TV abrem o seu tema':'Desligado · Home e ligar usam o menu normal da TV (LG)');
  setSw(swLg,!themeOn,!themeOn?'Ligado · Home e ligar usam o menu oficial da LG':'Desligado · o Freedom TV abre no Home e ao ligar');
  setSw(swRoot,r.rootHome,r.rootHome?'Ligado · abre o tema direto, menu da LG adormecido':(r.rootAvailable?'Desligado · sem root: passa um instante pelo menu da LG':'Indisponível · esta TV não tem root (Homebrew)'));
  if(!pending)status('Modo atual: '+(r.rootHome?'COM ROOT':(themeOn?'SEM ROOT':'MENU DA LG')));});}
 swTheme.onclick=function(){if(pending)return;swTheme.classList.add('busy');if(swTheme.getAttribute('aria-checked')==='true')$('restore').onclick();else $('normal').onclick();};
 swLg.onclick=function(){if(pending)return;swLg.classList.add('busy');if(swLg.getAttribute('aria-checked')==='true')$('normal').onclick();else $('restore').onclick();};
 swRoot.onclick=function(){if(pending)return;if(!last.rootAvailable&&!last.rootHome)return status('Esta TV não tem root (Homebrew Channel). O modo sem root continua funcionando.');swRoot.classList.add('busy');if(swRoot.getAttribute('aria-checked')==='true')off.onclick();else $('apply-root-home').onclick();};
 setInterval(mode,2500);
 // The old buttons did the same as the two switches: they stay hidden (the switches use them), only what is
 // different stays on screen.
 // Root on its own section, between the switches and "Mais opções": check first, then "Fazer root para continuar".
 (function(){
  var sec=document.createElement('section');sec.id='root-sec';
  sec.innerHTML='<h2>Root nesta TV</h2><p>Confira se esta TV já tem root ou se dá para fazer. Com root, o tema abre direto no Home e ao ligar, com o menu da LG adormecido.</p>';
  var check=$('root');check.textContent='Verificar se é possível fazer root';sec.appendChild(check);
  var res=document.createElement('p');res.id='root-res';res.setAttribute('role','status');sec.appendChild(res);
  var go=$('attempt');go.textContent='Fazer root para continuar';go.hidden=true;sec.appendChild(go);
  $('modes').insertAdjacentElement('afterend',sec);
  var rep=$('report');sec.insertAdjacentElement('afterend',rep);rep.hidden=true;
  check.onclick=function(){if(pending)return;pending=true;check.disabled=true;go.hidden=true;res.textContent='Consultando a TV…';
   call('luna://com.twbstudio.tvthemes.icons/rootPreflight',{},function(r){pending=false;check.disabled=false;
    if(!r.returnValue){res.textContent=r.errorText||'A TV não respondeu. Tente de novo.';return;}
    var tv='Modelo '+(r.model||'LG webOS')+' · webOS '+(r.sdk||'?')+' · software '+(r.firmware||'?')+'.';
    if(r.rootConfirmed){res.textContent='Esta TV já tem root (Homebrew Channel). Não é preciso fazer root. '+tv;return;}
    res.textContent='Esta TV ainda não tem root. O método de root pode funcionar nesta versão, mas não há garantia: só tentando para saber. '+tv;
    go.hidden=false;go.disabled=false;go.focus();});};
  go.onclick=function(){if(pending)return;rep.hidden=false;$('consent').hidden=false;$('execute').focus();$('consent').scrollIntoView();};
 })();
 (function(){var oldRestore=$('restore').parentNode;var more=document.createElement('section');more.id='more';more.innerHTML='<h2>Mais opções</h2>';var lg=$('restore');lg.textContent='Desativar o Freedom TV (voltar ao menu da LG)';var why=document.createElement('p');why.textContent='Desativa o Freedom TV no Home e ao ligar: a TV volta a usar o menu principal da LG. O tema continua instalado; para reativar, ligue a chave "Abrir o tema no Home e ao ligar".';more.appendChild(why);more.appendChild(lg);$('sw-lg').style.display='none';more.appendChild($('back'));
  $('report').insertAdjacentElement('afterend',more);var main=document.querySelector('main');if(main)main.style.display='none';if(oldRestore)oldRestore.style.display='none';})();
 $('apply-root-home').onclick=function(){if(pending)return;backup();pending=true;$('apply-root-home').disabled=true;status('Ativando o modo root (Home e ao ligar)…');call('luna://com.twbstudio.tvthemes.icons/rootApplyHome',{},function(r){pending=false;$('apply-root-home').disabled=false;if(r.returnValue){localStorage.setItem('tvstudio.returnHome','1');localStorage.setItem('tvstudio.rootHome','1');}status(r.message||r.errorText);setTimeout(mode,2500);});};
 off.onclick=function(){if(pending)return;pending=true;off.disabled=true;status('Desativando o modo root…');call('luna://com.twbstudio.tvthemes.icons/rootRestoreHome',{},function(r){localStorage.removeItem('tvstudio.rootHome');call('luna://com.twbstudio.tvthemes.icons/homeRedirect',{enabled:true},function(){pending=false;off.disabled=false;localStorage.setItem('tvstudio.returnHome','1');status(r.returnValue?'Modo root desativado. Agora a TV usa o modo sem root.':(r.errorText||'Não foi possível desativar o modo root.'));setTimeout(mode,1500);});});};
 mode();
 swTheme.focus();
})();