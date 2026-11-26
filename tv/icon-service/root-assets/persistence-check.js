'use strict';
var fs=require('fs'),cp=require('child_process');
function check(){
 if(process.getuid()!==0)throw new Error('Root não confirmado.');
 var raw=cp.execFileSync('/usr/bin/luna-send',['-n','1','luna://com.webos.applicationManager/listApps','{}'],{encoding:'utf8',timeout:10000});
 var r=JSON.parse(raw.trim());
 if(r.returnValue!==true||!Array.isArray(r.apps))throw new Error('Não foi possível verificar os aplicativos instalados.');
 var dev=r.apps.some(function(a){return a.id==='com.palmdts.devmode';});
 var hb=r.apps.some(function(a){return a.id==='org.webosbrew.hbchannel';});
 var theme=r.apps.some(function(a){return a.id==='com.twbstudio.tvthemes';});
 var sd='/media/cryptofs/apps/usr/palm/services/com.palmdts.devmode.service/start-devmode.sh';
 var scriptSafe=!fs.existsSync(sd);
 if(!scriptSafe){try{scriptSafe=cp.execFileSync('openssl',['dgst','-sha512','-verify','/usr/palm/services/com.palm.service.devmode/pub.pem','-signature',sd.replace('.sh','.sig'),sd],{encoding:'utf8',timeout:5000}).trim()==='Verified OK';}catch(_){} }
 var marker=false;try{marker=fs.statSync('/var/luna/preferences/devmode_enabled').isDirectory();}catch(_){}
 var startup=false;try{var st=fs.statSync('/var/lib/webosbrew/startup.sh');startup=st.isFile()&&st.size>0;if(startup)cp.execFileSync('/bin/sh',['-n','/var/lib/webosbrew/startup.sh'],{timeout:5000});}catch(_){startup=false;}
 var state='/var/lib/tvstudio/persistence-validation.json',record={};
 try{record=JSON.parse(fs.readFileSync(state,'utf8'));}catch(_){}
 var boot=fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim();
 var prerequisites=hb&&theme&&marker&&startup&&scriptSafe;
 var ready=!dev&&prerequisites;
 if(!fs.existsSync('/var/lib/tvstudio'))fs.mkdirSync('/var/lib/tvstudio');
 if(!ready){record={};}else if(!record.preparedBoot){record={preparedBoot:boot};}
 fs.writeFileSync(state+'.tmp',JSON.stringify(record),{mode:384});fs.renameSync(state+'.tmp',state);
 var rebootVerified=ready&&record.preparedBoot!==boot;
 return {returnValue:true,rootConfirmed:true,developerModeInstalled:dev,homebrewInstalled:hb,themeInstalled:theme,startupScriptChecked:scriptSafe,canLeaveDeveloperMode:prerequisites,persistencePrepared:ready,rebootVerified:rebootVerified,
  message:!prerequisites?'Preparação incompleta: não remova nem desative o Developer Mode e não reinicie para testar. É necessário reparar a instalação persistente primeiro.':dev?'Preparação local conferida. A próxima etapa é desinstalar o aplicativo Developer Mode (não desligar sua chave), depois verificar novamente antes de reiniciar.':!ready?'A persistência do Homebrew está incompleta. Não ative o tema como Home.':!rebootVerified?'Preparação conferida. Reinicie a TV e volte aqui para verificar se o root permaneceu ativo.':'Root confirmado após reinicialização, sem o aplicativo Developer Mode instalado.'};
}
try{console.log(JSON.stringify(check()));}catch(e){console.log(JSON.stringify({returnValue:false,rootConfirmed:false,rebootVerified:false,errorText:e.message}));process.exitCode=1;}
