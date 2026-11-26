var fs=require('fs'),path=require('path'),os=require('os');
module.exports=function(name){
 var dir=typeof process.getuid==='function'&&process.getuid()===0?'/var/lib/tvstudio':path.join(__dirname,'.pairing');
 try{fs.mkdirSync(dir,{mode:448});}catch(e){if(e.code!=='EEXIST')throw e;}
 var dest=path.join(dir,name),old=path.join(os.tmpdir(),name);
 if(!fs.existsSync(dest)&&fs.existsSync(old)){fs.writeFileSync(dest,fs.readFileSync(old),{mode:384});}
 return dest;
};
