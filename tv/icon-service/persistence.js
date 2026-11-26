'use strict';
var path=require('path'),cp=require('child_process');
module.exports=function(service){
 var command='/usr/bin/node '+path.join(__dirname,'root-assets','persistence-check.js');
 function verify(cb){
  function parse(raw){try{cb(JSON.parse(String(raw).trim()));}catch(_){cb({returnValue:false,rebootVerified:false,errorText:'A TV não confirmou a persistência do root.'});}}
  if(process.getuid&&process.getuid()===0){try{return parse(cp.execFileSync('/usr/bin/node',[path.join(__dirname,'root-assets','persistence-check.js')],{encoding:'utf8',timeout:15000}));}catch(e){return parse(e.stdout||'');}}
  var done=false,t=setTimeout(function(){finish({returnValue:false,errorText:'Homebrew Channel não respondeu.'});},20000);
  function finish(r){if(done)return;done=true;clearTimeout(t);if(r.returnValue===false)return cb({returnValue:false,rebootVerified:false,errorText:r.errorText||'Root indisponível.'});parse(r.stdoutString||'');}
  try{service.call('luna://org.webosbrew.hbchannel.service/exec',{command:command},function(m){finish(m.payload||{});});}catch(e){finish({returnValue:false,errorText:e.message});}
 }
 service.register('rootPersistenceStatus',function(msg){verify(function(r){msg.respond(r);});});
 return verify;
};
