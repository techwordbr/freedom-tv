(function(){
 var raw=(navigator.language||navigator.userLanguage||'pt').toLowerCase();
 var lang=raw.indexOf('en')===0?'en':raw.indexOf('es')===0?'es':'pt';
 var dict={
  en:{
   eyebrow:'YOUR SCREEN, YOUR STYLE',
   welcome:'Your moment to unwind.',
   root_menu:'Home Screen & Root',
   layout:'Change layout',
   apps:'List apps',
   receive:'Receive theme',
   reset:'Reset look',
   exit:'Exit',
   setup_title:'Freedom TV · Home Screen & Root',
   setup_sub:'Choose how Freedom TV opens when you press Home or turn on the TV.',
   root_mode_title:'With Root · Open directly in theme (Home & Power On)',
   root_mode_desc:'Keeps the stock LG menu dormant. Pressing Home or turning the TV off and on opens your theme directly.',
   btn_apply_root_home:'Activate theme on Home & Power On (Root)',
   btn_verify_root:'Verify / Root this TV',
   noroot_mode_title:'Without Root · Auto-return on Home',
   noroot_mode_desc:'For unrooted TVs: pressing Home briefly passes through LG Home and opens your theme.',
   btn_normal_home:'Activate Home return (No Root)',
   btn_startup_normal:'Try opening the theme at power-on (No Root)',
   startup_normal_hint:'LG may block this setting without root. This attempt does not root your TV or guarantee automatic startup.',
   restore_title:'Restore stock LG menu',
   restore_desc:'Disables Freedom TV auto-launch and restores the original LG Home screen.',
   btn_restore_lg:'Return to LG Home',
   btn_back_theme:'Back to theme',
   nav_apps:'Apps',
   nav_antenna:'TV / Antenna',
   nav_inputs:'HDMI / Inputs',
   nav_wifi:'Wi-Fi',
   nav_settings:'TV Settings',
   nav_root:'Home / Root',
   nav_themes:'Themes',
   nav_home:'Home',
   nav_movies:'Movies & Shows',
   nav_games:'Games',
   nav_music:'Music',
   nav_customize:'Customize'
  },
  es:{
   eyebrow:'TU PANTALLA, TU ESTILO',
   welcome:'Tu momento de desconectar.',
   root_menu:'Pantalla principal y Root',
   layout:'Cambiar diseño',
   apps:'Listar aplicaciones',
   receive:'Recibir tema',
   reset:'Restaurar aspecto',
   exit:'Salir',
   setup_title:'Freedom TV · Pantalla inicial y Root',
   setup_sub:'Elige cómo se abre Freedom TV al pulsar Home o encender el televisor.',
   root_mode_title:'Con Root · Abrir directo en el tema (Home y Encendido)',
   root_mode_desc:'Deja el menú de LG en reposo. Al pulsar Home o apagar y encender la TV, abre directamente tu tema.',
   btn_apply_root_home:'Activar tema en Home y al encender (Root)',
   btn_verify_root:'Verificar / Hacer Root en esta TV',
   noroot_mode_title:'Sin Root · Retorno automático con Home',
   noroot_mode_desc:'Para TVs sin root: al pulsar Home pasa brevemente por el menú de LG y abre tu tema.',
   btn_normal_home:'Activar retorno con Home (Sin Root)',
   btn_startup_normal:'Intentar abrir el tema al encender (Sin Root)',
   startup_normal_hint:'LG puede bloquear esta configuración sin root. El intento no hace root ni garantiza el inicio automático.',
   restore_title:'Restaurar menú original de LG',
   restore_desc:'Desactiva el inicio directo de Freedom TV y restaura el menú original de LG.',
   btn_restore_lg:'Volver al menú de LG',
   btn_back_theme:'Volver al tema',
   nav_apps:'Aplicaciones',
   nav_antenna:'TV / Antena',
   nav_inputs:'HDMI / Entradas',
   nav_wifi:'Wi-Fi',
   nav_settings:'Ajustes de TV',
   nav_root:'Inicio / Root',
   nav_themes:'Temas',
   nav_home:'Inicio',
   nav_movies:'Películas y Series',
   nav_games:'Juegos',
   nav_music:'Música',
   nav_customize:'Personalizar'
  }
 };
 window.FreedomLang=lang;
 window.FreedomT=function(k,fallback){return (dict[lang]&&dict[lang][k])||fallback;};
 function applyI18n(){
  if(lang==='pt')return;
  var t=dict[lang];if(!t)return;
  var nodes=document.querySelectorAll('[data-i18n]');
  for(var i=0;i<nodes.length;i++){
   var key=nodes[i].getAttribute('data-i18n');
   if(t[key])nodes[i].textContent=t[key];
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyI18n);
 else applyI18n();
})();