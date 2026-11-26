/* Freedom TV root delivery & native Home/Boot service; SlopBro payload distributed under AGPL-3.0-or-later. */
var fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),crypto=require('crypto'),cp=require('child_process'),WS=require('./ws');
var keyFile=require('./pairing-store')('tvstudio-home-pair');
var TARGET_APPS=[
 ['com.webos.app.voiceweb','URL'],
 ['com.webos.app.adoverlayex','interactiveUrl'],
 ['com.webos.app.adoverlay','interactiveUrl'],
 ['com.webos.app.acroverlay','contentTarget'],
 ['com.webos.app.tinybrowser','contentTarget'],
 ['com.webos.app.dangbei-overlay','target']
];
function localHost(){
 try{
  var nets=os.networkInterfaces(),names=Object.keys(nets);
  for(var i=0;i<names.length;i++){
   var list=nets[names[i]]||[];
   for(var j=0;j<list.length;j++){
    var a=list[j];
    if(a&&a.family==='IPv4'&&!a.internal&&a.address&&a.address.indexOf('127.')!==0)return a.address;
   }
  }
 }catch(e){}
 return '127.0.0.1';
}
function isRootInstalled(){
 return (process.getuid&&process.getuid()===0)||
  fs.existsSync('/media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/elevate-service')||
  fs.existsSync('/var/lib/webosbrew/init.d')||
  fs.existsSync('/var/luna/preferences/devmode_enabled');
}
function isRootHomeActive(){
 return fs.existsSync('/var/lib/webosbrew/init.d/90-tvstudio-home');   // readable without root; restore-home-root.sh removes it
}
module.exports=function(service,redirect){
 require('./startup')(service);
 service.register('homeHeartbeat',function(msg){if(redirect)try{redirect.ensure();}catch(_){}try{fs.writeFileSync('/tmp/tvstudio-home-heartbeat','ready');msg.respond({returnValue:true});}catch(e){msg.respond({returnValue:false});}});
 var verifyPersistence=require('./persistence')(service);
 var state={phase:'idle',message:'Nenhuma tentativa iniciada.'},server,activity,expiry,socket;
 function call(uri,payload,cb){var done=false,t=setTimeout(function(){finish({returnValue:false});},7000);function finish(r){if(done)return;done=true;clearTimeout(t);cb(r||{});}try{service.call(uri,payload,function(m){finish(m.payload);});}catch(e){finish({returnValue:false});}}
 function info(cb){call('luna://com.webos.service.tv.systemproperty/getSystemInfo',{keys:['modelName','sdkVersion','firmwareVersion']},cb);}
 function release(){clearTimeout(expiry);if(server){server.close();server=null;}if(socket){socket.terminate();socket=null;}if(activity){service.activityManager.complete(activity,function(){});activity=null;}}
 function fail(message){state={phase:'failed',message:message};release();}

 function runScriptViaWam(scriptName,extraFiles,onDone){
  service.activityManager.create('tvstudio-root-script',function(a){
   activity=a||null;
   var token=crypto.randomBytes(18).toString('hex'),prefix='/'+token+'/',root=path.join(__dirname,'root-assets'),base;
   var allowed=['index.html','main.js','package.json',scriptName].concat(extraFiles||[]);
   server=http.createServer(function(req,res){
    var parsed=require('url').parse(req.url,true);if(req.method!=='GET'||parsed.pathname.indexOf(prefix)!==0){res.writeHead(404);return res.end();}
    var name=parsed.pathname.slice(prefix.length);
    if(name==='result'){
     var p=parsed.query;
     res.end('OK');
     setTimeout(function(){
      release();
      call('luna://com.webos.applicationManager/launch',{id:'com.twbstudio.tvthemes'},function(){});
      if(onDone)onDone(p.uid==='0'&&p.ok==='1',p);
     },400);
     return;
    }
    if(allowed.indexOf(name)<0){res.writeHead(404);return res.end();}
    try{
     var data=fs.readFileSync(path.join(root,name),'utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
     if(name==='main.js')data=data.replace('__REPORT_URL__',base+'result');
     if(name==='index.html')data=data.replace("var downloadDir = '/media/internal/downloads';","var downloadDir = '/media/internal/downloads/tvstudio-"+token+"';");
     res.setHeader('Content-Type',name==='index.html'?'text/html; charset=utf-8':'text/plain; charset=utf-8');
     res.end(data);
    }catch(e){res.writeHead(500);res.end();}
   });
   server.on('error',function(){release();if(onDone)onDone(false,{});});
   server.listen(0,'0.0.0.0',function(){
    base='http://'+localHost()+':'+server.address().port+prefix;
    var filesList=['package.json','main.js'].concat(extraFiles||[]).join(';');
    var page=base+'index.html?script='+encodeURIComponent(scriptName)+'&files='+ filesList +'&fake-service-path=/usr/palm/services/com.palm.service.devmode';
    var ws=socket=new WS('wss://127.0.0.1:3001',{rejectUnauthorized:false,handshakeTimeout:5000});
    var candidates=TARGET_APPS.slice(),idx=0;
    function tryNext(){
     if(idx>=candidates.length){release();if(onDone)onDone(false,{});return;}
     var entry=candidates[idx++],params={};params[entry[1]]=page;
     ws.send(JSON.stringify({type:'request',id:'launch',uri:'ssap://system.launcher/launch',payload:{id:entry[0],params:params}}));
    }
    expiry=setTimeout(function(){release();if(onDone)onDone(false,{});},120000);
    ws.on('open',function(){
     var p={pairingType:'PROMPT',manifest:{manifestVersion:1,appVersion:'1.0',permissions:['LAUNCH','READ_INSTALLED_APPS','READ_RUNNING_APPS']}};
     try{p['client-key']=fs.readFileSync(keyFile,'utf8');}catch(_){}
     ws.send(JSON.stringify({type:'register',id:'pair',payload:p}));
    });
    ws.on('error',function(){release();if(onDone)onDone(false,{});});
    ws.on('message',function(raw){
     try{
      var m=JSON.parse(raw);
      if(m.type==='registered'){
       if(m.payload&&m.payload['client-key'])try{fs.writeFileSync(keyFile,m.payload['client-key'],{mode:384});}catch(_){}
       ws.send(JSON.stringify({type:'request',id:'apps',uri:'ssap://com.webos.applicationManager/listApps',payload:{}}));
      }else if(m.id==='apps'){
       var list=(m.payload&&m.payload.apps)||[],ids={};
       for(var i=0;i<list.length;i++)if(list[i]&&list[i].id)ids[list[i].id]=true;
       var matched=TARGET_APPS.filter(function(item){return ids[item[0]];});
       if(matched.length)candidates=matched.concat(TARGET_APPS.filter(function(item){return !ids[item[0]];}));
       tryNext();
      }else if(m.type==='error'&&m.id==='launch'){tryNext();}
      else if(m.type==='error'){release();if(onDone)onDone(false,{});}
      else if(m.id==='launch'){if(m.payload&&m.payload.returnValue===false)return tryNext();}
     }catch(e){release();if(onDone)onDone(false,{});}
    });
   });
  });
 }

 function runAsRoot(scriptName,cb){
  var scriptPath=path.join(__dirname,'root-assets',scriptName);
  if(process.getuid&&process.getuid()===0){
   try{cp.execFileSync('/bin/sh',[scriptPath],{timeout:45000});return cb(true,'Configuração aplicada diretamente com privilégio root.');}catch(e){}
  }
  call('luna://org.webosbrew.hbchannel.service/exec',{command:'/bin/sh '+scriptPath+' && echo TVSTUDIO_SCRIPT_OK'},function(r){
   if(r&&r.returnValue===true&&String(r.stdoutString||'').indexOf('TVSTUDIO_SCRIPT_OK')>=0){return cb(true,'Configuração aplicada via Homebrew Channel (Root).');}
   runScriptViaWam(scriptName,scriptName==='apply-home-root.sh'?['home-profile.js','home-guard.js','restore-home-root.sh']:scriptName==='home-root-on.sh'?['apply-home-root.sh','tune-home-boot.js','home-profile.js','home-guard.js','restore-home-root.sh']:[],function(ok){
    cb(ok,ok?'Configuração aplicada via motor root da TV.':'Não foi possível aplicar a configuração root. Confirme se o root está ativo.');
   });
  });
 }

 function status(msg){verifyPersistence(function(r){r.homeRootActive=isRootHomeActive();msg.respond(r);});}

 service.register('rootStatus',status);
 service.register('rootPreflight',function(msg){info(function(r){
  var assetsDir=path.join(__dirname,'root-assets');
  var payloadReady=['index.html','autoroot.sh','install-root.sh','main.js','package.json'].every(function(f){return fs.existsSync(path.join(assetsDir,f));});
  var checks=[
   ['Sistema de root embarcado (SlopBro / root-assets)',payloadReady],
   ['Serviço DevMode (/usr/palm/services/com.palm.service.devmode)',fs.existsSync('/usr/palm/services/com.palm.service.devmode')],
   ['Pasta de downloads (/media/internal/downloads)',fs.existsSync('/media/internal/downloads')],
   ['Cliente HTTP (curl)',fs.existsSync('/usr/bin/curl')||fs.existsSync('/bin/curl')],
   ['Barramento Luna (luna-send)',fs.existsSync('/usr/bin/luna-send')||fs.existsSync('/usr/bin/luna-send-pub')]
  ];
  var ok=checks.filter(function(c){return c[1];}).map(function(c){return c[0];});
  verifyPersistence(function(check){
   var root=check.rootConfirmed===true;
   msg.respond({returnValue:true,model:r.modelName||'',sdk:r.sdkVersion||'',firmware:r.firmwareVersion||'',rootConfirmed:root,rebootVerified:check.rebootVerified===true,homeRootActive:isRootHomeActive(),canApply:check.rebootVerified===true,message:check.message||check.errorText||'A persistência ainda não foi confirmada. Não reinicie nem defina o tema como Home antes de concluir a preparação.',recovery:'Componentes disponíveis: '+ok.join(' · ')+'. A presença destes arquivos não comprova compatibilidade nem root persistente.'});
  });
 });});

 service.register('rootApplyHome',function(msg){
  // Root Home on/off from the theme (Augusto 25/11, to show root and no-root side by side). Off = restore-home-root.sh.
  // (No file check first: the developer jail hides the root folders; runAsRoot goes through the Homebrew Channel.)
  runAsRoot('home-root-on.sh',function(ok,text){if(!ok)text='Não foi possível ativar o modo root. Esta TV tem root (Homebrew Channel)? O modo sem root continua ativo.';msg.respond({returnValue:ok,homeRootActive:ok,message:ok?'Modo root ativo: o Home e o ligar da TV abrem o tema direto, com o menu da LG adormecido.':text,errorText:ok?undefined:text});});
 });

 service.register('appManage',function(msg){
  var id=String((msg.payload&&msg.payload.id)||'').replace(/[^a-zA-Z0-9._-]/g,'');
  var action=String((msg.payload&&msg.payload.action)||'');
  if(!id)return msg.respond({returnValue:false,errorText:'ID inválido.'});
  var arg=JSON.stringify(JSON.stringify({id:id}));
  if(action==='disable'){return msg.respond({returnValue:false,errorText:'Desativação permanente ainda não suportada. Fechar um aplicativo não o desativa.'});}
  if(action==='uninstall'){
   call('luna://com.webos.appInstallService/remove',{id:id},function(r1){
    if(r1&&r1.returnValue)return msg.respond({returnValue:true,message:'Aplicativo desinstalado com sucesso.'});
    call('luna://com.webos.appInstallService/dev/remove',{id:id},function(r2){
     if(r2&&r2.returnValue)return msg.respond({returnValue:true,message:'Aplicativo desinstalado com sucesso.'});
     // As root (Homebrew): ask for the removal, then check for a few seconds that the app is really gone.
     // Only then it counts as uninstalled (it used to say "ocultado" and the theme hid an app still on the TV).
     var cmd='luna-send -n 1 luna://com.webos.appInstallService/remove '+arg+' || luna-send -n 1 luna://com.webos.appInstallService/dev/remove '+arg+'; echo; for i in 1 2 3 4 5 6 7 8 9 10; do luna-send -n 1 luna://com.webos.applicationManager/getAppInfo '+arg+' | grep -q appInfo || { echo TVS_REMOVED; break; }; sleep 1; done';
     call('luna://org.webosbrew.hbchannel.service/exec',{command:cmd},function(r3){
      var out=String((r3&&r3.stdoutString)||'')+String((r3&&r3.stderrString)||'');
      var ok=out.indexOf('TVS_REMOVED')>=0;
      // No root (Homebrew exec missing or refused): LG only lets its own store delete apps.
      // The theme then opens the store on "Gerenciar aplicativos" (needsLgScreen) for the person to delete there.
      if(!ok&&!(r3&&r3.returnValue===true))return msg.respond({returnValue:false,uninstalled:false,needsLgScreen:true,errorText:'Sem root, a LG só deixa excluir pela loja dela.'});
      var why=(out.match(/"errorText":"([^"]+)"/)||[])[1]||(r3&&r3.returnValue===false?'o Homebrew não respondeu':'a TV recusou');
      msg.respond({returnValue:ok,uninstalled:ok,message:ok?'Aplicativo desinstalado da TV.':undefined,errorText:ok?undefined:why});
     });
    });
   });
   return;
  }
  msg.respond({returnValue:true});
 });
 // Developer Mode session (Augusto 26/11): without root, when LG's session runs out the TV deletes the Freedom TV.
 // LG's Developer Mode app writes the time left (e.g. "999:59:00") to devSessionTime each time it checks or the
 // person renews; that file's date + that time = when it runs out. With root (Homebrew) there is nothing to warn.
 var DEV_SESSION_FILE='/media/cryptofs/apps/usr/palm/services/com.palmdts.devmode.service/devSessionTime';
 service.register('devModeSession',function(msg){
  function fromFile(root){
   try{
    var text=fs.readFileSync(DEV_SESSION_FILE,'utf8').trim(),parts=text.split(':').map(Number);
    if(parts.length<2||parts.some(isNaN))throw new Error('formato '+text);
    var leftAtWrite=((parts[0]*60+parts[1])*60+(parts[2]||0))*1000,written=fs.statSync(DEV_SESSION_FILE).mtime.getTime();
    var endsAt=written+leftAtWrite,hoursLeft=Math.floor((endsAt-Date.now())/3600000);
    msg.respond({returnValue:true,root:root,hoursLeft:hoursLeft,endsAt:new Date(endsAt).toISOString()});
   }catch(e){fromLg(root,e.message);}
  }
  // The developer jail hides /media/cryptofs but shows /var/luna/preferences, where a TV without root keeps the
  // session token (devmode_enabled). LG's server says the time left for it, as the Developer Mode app asks.
  function fromLg(root,why){
   var fail=function(t){msg.respond({returnValue:false,root:root,unknown:true,errorText:'Não deu para ler o tempo do Modo Desenvolvedor ('+why+'; '+t+').'});};
   var token;
   try{token=fs.readFileSync('/var/luna/preferences/devmode_enabled','utf8').trim();}catch(e){return fail(e.code||e.message);}
   if(!/^[A-Za-z0-9._-]{8,}$/.test(token))return fail('sem código de sessão');
   var done=false,req=require('https').get('https://developer.lge.com/secure/CheckDevModeSession.dev?sessionToken='+encodeURIComponent(token),function(res){
    var body='';res.on('data',function(c){body+=c;});
    res.on('end',function(){if(done)return;done=true;
     var j={};try{j=JSON.parse(body);}catch(_){}
     var m=j.result==='success'&&String(j.errorMsg||'').match(/^(\d+):(\d{2})(?::(\d{2}))?$/);   // e.g. {"result":"success","errorMsg":"999:59:00"}
     if(!m)return fail('resposta da LG: '+body.slice(0,80));
     var ms=((+m[1]*60+(+m[2]))*60+(+(m[3]||0)))*1000,endsAt=Date.now()+ms;
     msg.respond({returnValue:true,root:root,hoursLeft:Math.floor(ms/3600000),endsAt:new Date(endsAt).toISOString(),from:'lg'});
    });
   });
   req.on('error',function(e){if(!done){done=true;fail(e.message);}});
   req.setTimeout(8000,function(){if(!done){done=true;fail('a LG não respondeu');}req.abort();});
  }
  if(msg.payload&&msg.payload.ignoreRoot)return fromFile(false);   // test of the no-root path on a TV with root
  call('luna://org.webosbrew.hbchannel.service/exec',{command:'echo TVS_ROOT'},function(r){
   var root=!!(r&&r.returnValue===true&&String(r.stdoutString||'').indexOf('TVS_ROOT')>=0);
   if(root)return msg.respond({returnValue:true,root:true,message:'Com root não é preciso renovar o Modo Desenvolvedor.'});
   fromFile(false);
  });
 });
 service.register('rootRestoreHome',function(msg){
  // Always try through the Homebrew Channel (the jail hides the root files); a TV without root has nothing to undo.
  runAsRoot('restore-home-root.sh',function(ok,text){if(!ok){return msg.respond({returnValue:true,homeRootActive:false,message:'Menu original da LG restaurado.'});}
   msg.respond({returnValue:ok,homeRootActive:false,message:ok?'Menu original da LG restaurado no botão Home e na inicialização.':text,errorText:ok?undefined:text});
  });
 });

 service.register('rootBegin',function(msg){
  var c=msg.payload&&msg.payload.consent;
  if(c!=='root-experimental-lg-universal'&&c!=='root-experimental-33.31.75'){return msg.respond({returnValue:false,errorText:'Confirmação necessária.'});}
  if(state.phase==='running'||state.phase==='starting')return msg.respond({returnValue:false,errorText:'Uma tentativa já está em andamento.'});
  state={phase:'starting',message:'Identificando modelo e preparando componentes para esta TV LG.'};
  info(function(r){
   runScriptViaWam('autoroot.sh',['install-root.sh'],function(ok,p){
    state={
     phase:ok?'reported':'failed',
     message:ok?'A tentativa terminou. Verifique a persistência abaixo; ainda não ative a Home nem reinicie antes de conferir o Developer Mode.':'A tentativa terminou sem confirmar root.'
    };
   });
   msg.respond({returnValue:true,message:'Preparação iniciada para '+(r.modelName||'sua TV LG')+'. Aceite a conexão na TV, se solicitado. Não desligue nem reinicie.'});
  });
 });
};
