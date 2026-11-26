/* webOS 10+: select Home in the system profile as well as SAM's settings. */
'use strict';
var fs=require('fs'),cp=require('child_process');
var target='com.twbstudio.tvthemes',dir='/var/lib/tvstudio';
var override='/var/webos-profile/override/com.twbstudio.tvthemes.json';
function call(uri,payload){
 var raw=cp.execFileSync('/usr/bin/luna-send',['-n','1',uri,JSON.stringify(payload)],{encoding:'utf8',timeout:10000});
 var r=JSON.parse(raw.trim());if(r.returnValue!==true)throw new Error(raw);return r;
}
function clean(o){var r={};Object.keys(o||{}).forEach(function(k){if(k.charAt(0)!=='_')r[k]=o[k];});return r;}
function read(){return call('luna://com.webos.service.systemprofile/getProfiles',{names:['defaultApps','idleApp']}).profiles;}
function rescan(){call('luna://com.webos.service.systemprofile/debug/rescan',{});}
function atomic(p,data){fs.writeFileSync(p+'.tmp',data);fs.renameSync(p+'.tmp',p);}
function main(){
 if(process.getuid()!==0)throw new Error('Root required');
 if(process.argv[2]==='restore'){
  if(fs.existsSync(override)){fs.unlinkSync(override);rescan();}
  console.log('Freedom TV profile removed');return;
 }
 var release=fs.readFileSync('/etc/starfish-release','utf8');
 if(!/release 10\./.test(release)){console.log('Profile backend skipped: not webOS 10');return;}
 var app='/media/developer/apps/usr/palm/applications/'+target+'/appinfo.json';
 if(!fs.existsSync(app)||!fs.existsSync(dir+'/root-home-enabled')){
  if(fs.existsSync(override)){fs.unlinkSync(override);rescan();}return;
 }
 var info=JSON.parse(fs.readFileSync(app,'utf8'));
 if(!info.appCategory||info.appCategory.indexOf('home')<0)throw new Error('Not a Home app');
 var p=read();
 if(!p.defaultApps||!p.defaultApps.categories||!p.idleApp)throw new Error('Unknown profile format');
 if(!fs.existsSync(dir+'/home-profile-before.json'))atomic(dir+'/home-profile-before.json',JSON.stringify(p,null,2));
 var before=fs.existsSync(override)?fs.readFileSync(override,'utf8'):null;
 var home=clean(p.defaultApps),idle=clean(p.idleApp);
 home.categories=clean(home.categories);home.categories.home=target;
 idle.support=true;idle.appId=target;
 try{
  atomic(override,JSON.stringify({defaultApps:home,idleApp:idle}));rescan();
  var actual=read();
  if(actual.defaultApps.categories.home!==target||actual.idleApp.appId!==target)throw new Error('Profile readback failed');
  console.log('Verified Home and idleApp: '+target);
 }catch(e){
  if(before===null){if(fs.existsSync(override))fs.unlinkSync(override);}else atomic(override,before);
  rescan();throw e;
 }
}
try{main();}catch(e){console.error(e.message);process.exitCode=1;}
