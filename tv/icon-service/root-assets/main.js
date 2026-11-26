/* Derived from SlopBro by throwaway96, AGPL-3.0-or-later.
 * TV Studio additions: fixed completion report; never treat a download as root. */
var cp=require('child_process'),http=require('http'),fs=require('fs');
module.exports={run:function(){
 var ok=false;try{cp.execFileSync('/bin/sh',[process.argv[2]],{timeout:180000});ok=true;}catch(e){}
 var uid='unknown';try{uid=String(cp.execFileSync('/usr/bin/id',['-u'])).trim();}catch(e){try{uid=String(cp.execFileSync('/bin/id',['-u'])).trim();}catch(ignore){}}
 var installed=fs.existsSync('/media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/elevate-service');
 var target='__REPORT_URL__'+'?uid='+encodeURIComponent(uid)+'&installed='+(installed?'1':'0')+'&ok='+(ok?'1':'0');
 var req=http.get(target,function(res){res.resume();});req.on('error',function(){});
}};
