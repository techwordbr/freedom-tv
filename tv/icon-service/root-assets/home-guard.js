'use strict';
// Lives outside the application directory so removing the app cannot remove recovery.
var fs=require('fs'),cp=require('child_process');
var dir='/var/lib/tvstudio',app='/media/developer/apps/usr/palm/applications/com.twbstudio.tvthemes/appinfo.json';
var since=Date.now(),front=false,failures=0;
function recover(){
 try{cp.execFileSync('/bin/sh',[dir+'/restore-home-root.sh'],{timeout:30000});process.exit(0);}
 catch(e){console.error('Home recovery failed; retrying');}
}
function expired(now,entered,heartbeat){return now-entered>20000&&now-heartbeat>15000;}
module.exports=expired;
if(require.main===module){
 if(process.getuid()!==0)throw new Error('Root required');
 function tick(){
  if(!fs.existsSync(dir+'/root-home-enabled'))return process.exit(0);
  if(!fs.existsSync(app))return recover();
  try{
   var raw=cp.execFileSync('/usr/bin/luna-send',['-n','1','luna://com.webos.applicationManager/getForegroundAppInfo','{}'],{encoding:'utf8',timeout:5000});
   var r=JSON.parse(raw);if(r.returnValue!==true)throw new Error('foreground unavailable');failures=0;
   // (The old "theme in front 20 s without a heartbeat" rule is gone: the heartbeat file can be left unwritable,
   // which turned root Home off by itself. What stays: the theme is gone → LG's own menu comes back at once.)
   front=r.appId==='com.twbstudio.tvthemes';
  }catch(e){if(++failures>=6)recover();}
 }
 tick();setInterval(tick,2000);
}
