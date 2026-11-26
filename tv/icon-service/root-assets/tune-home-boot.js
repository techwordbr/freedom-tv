var fs=require('fs');
var file='/var/lib/webosbrew/init.d/90-tvstudio-home';
var s=fs.readFileSync(file,'utf8');
if(s.indexOf('# tvstudio-boot-dedupe-v1')<0){
 if(s.indexOf('last_state=""')<0)throw Error('Boot desconhecido; preservado');
 var backup='/var/lib/tvstudio/home-boot-before-dedupe.sh';
 if(!fs.existsSync(backup))fs.writeFileSync(backup,s,{mode:448});
 s=s.replace('last_state=""','last_state="Active"');
 s=s.replace(/luna-send -n 1 luna:\/\/com.webos.applicationManager\/launch '\{"id":"com.twbstudio.tvthemes"\}'/g,'launch_theme_once');
 var fn=`# tvstudio-boot-dedupe-v1
launch_theme_once() {
 [ -f "$APP_DIR/appinfo.json" ] && [ -f "$STATE_FILE" ] || return 0
 mkdir /tmp/tvstudio-launch-lock 2>/dev/null || return 0
 foreground="$(luna-send -n 1 luna://com.webos.applicationManager/getForegroundAppInfo '{}' 2>/dev/null)"
 case "$foreground" in
  *com.twbstudio.tvthemes*) ;;
  *) luna-send -n 1 luna://com.webos.applicationManager/launch '{"id":"com.twbstudio.tvthemes"}' >/dev/null 2>&1 ;;
 esac
 rmdir /tmp/tvstudio-launch-lock 2>/dev/null || true
}
`;
 s=s.replace('STATE_FILE="/var/lib/tvstudio/root-home-enabled"','STATE_FILE="/var/lib/tvstudio/root-home-enabled"\n'+fn);
 fs.writeFileSync(file+'.next',s,{mode:493});
 require('child_process').execFileSync('/bin/sh',['-n',file+'.next']);fs.renameSync(file+'.next',file);
}
console.log('BOOT_DEDUPE_READY');
