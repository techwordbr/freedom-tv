package br.twbstudio.instalador;
import android.app.*; import android.os.*; import android.widget.*; import java.io.*; import java.net.*; import java.util.concurrent.*; import org.json.JSONObject; import com.jcraft.jsch.*;
public class Main extends Activity {
 final android.util.LruCache<String,android.graphics.Bitmap> imageCache=new android.util.LruCache<String,android.graphics.Bitmap>(8*1024*1024){protected int sizeOf(String k,android.graphics.Bitmap b){return b.getByteCount();}};
 android.graphics.Bitmap assetBitmap(String file)throws IOException{
  android.graphics.Bitmap hit=imageCache.get(file);if(hit!=null)return hit;
  android.graphics.BitmapFactory.Options o=new android.graphics.BitmapFactory.Options();o.inJustDecodeBounds=true;
  try(InputStream in=getAssets().open(file)){android.graphics.BitmapFactory.decodeStream(in,null,o);}
  int target=Math.min(1080,getResources().getDisplayMetrics().widthPixels);o.inSampleSize=1;
  while(o.outWidth/(o.inSampleSize*2)>=target)o.inSampleSize*=2;
  o.inJustDecodeBounds=false;android.graphics.Bitmap bitmap;
  try(InputStream in=getAssets().open(file)){bitmap=android.graphics.BitmapFactory.decodeStream(in,null,o);}
  if(bitmap==null)throw new IOException("Imagem inválida");imageCache.put(file,bitmap);return bitmap;
 }
 @Override public void onTrimMemory(int level){super.onTrimMemory(level);if(level>=TRIM_MEMORY_RUNNING_LOW)imageCache.evictAll();}
 String tr(String pt,String en,String es){String l=java.util.Locale.getDefault().getLanguage();return "en".equals(l)?en:"es".equals(l)?es:pt;}
 TextView status; EditText ip,code; Button install;
 android.content.SharedPreferences prefs;
 LinearLayout panel;
 volatile boolean busy;
 int page;
 String brand="LG webOS", theme="vidro";
 byte[] customWallJpg, customWallBlurJpg;
 ImageView wallPreview;
 final String[] names={"Vidro Líquido","Aurora","Cinema","Entardecer"};
 final String[] ids={"vidro","aurora","cinema","sunset"};
 String[] steps(){
   if(brand.equals("LG webOS"))return new String[]{"Conecte a TV e o celular à mesma rede Wi-Fi.","Pressione Home no controle da LG. Na fileira de aplicativos, selecione o ícone verde APPS e pressione OK.","Na busca da loja, digite o nome abaixo. Developer termina em er e há um espaço antes de Mode.","Em Aplicativos, selecione o cartão vermelho Developer Mode com ferramentas brancas e pressione OK.","Na página do aplicativo, escolha Instalar.","Abra Developer Mode na TV.","Entre com sua conta LG Developer.","Ative Dev Mode Status e aguarde a TV reiniciar.","Após a reinicialização, abra Developer Mode novamente.","Ative Key Server.","Localize na tela da TV o IP e a passphrase para a conexão."};
   if(brand.equals("Samsung Tizen"))return new String[]{"Pressione Home no controle da Samsung. Na barra inferior, selecione Apps (o ícone com quatro círculos) e pressione OK. Se o seu modelo exigir, entre em Configurações de Apps.","Com Apps aberto, digite 1, 2, 3, 4 e 5 rapidamente, em sequência. Se o controle não tiver números, use o teclado numérico da TV.","Na janela Developer mode, selecione On.","Para um instalador móvel compatível, informe o IP Wi-Fi do celular em Host PC IP e confirme.","Reinicie a TV Samsung."};
   return new String[]{"Abra Configurações → Sistema → Sobre.","Na compilação do Android TV, pressione OK sete vezes.","Abra Opções do desenvolvedor e procure Depuração sem fio.","Se disponível, escolha Parear com código. Celular e TV devem estar na mesma rede."};
 }
 public void onCreate(Bundle state){setTheme(dark()?android.R.style.Theme_Material_NoActionBar:android.R.style.Theme_Material_Light_NoActionBar);super.onCreate(state);prefs=getSharedPreferences("wizard",MODE_PRIVATE);theme=prefs.getString("theme","vidro");brands();}
 void screen(int number,String title){
   page=number;ScrollView scroll=new ScrollView(this);panel=new LinearLayout(this);panel.setOrientation(1);int pad=(int)(24*getResources().getDisplayMetrics().density);panel.setPadding(pad,pad,pad,pad);scroll.setFillViewport(true);scroll.setBackgroundColor(tone(0xfffaf9fc,0xff111318));panel.setClipToPadding(false);scroll.addView(panel);setContentView(scroll);
   if(number==0||number==2||number==3||number==6){try(InputStream in=getAssets().open("freedom-icon.png")){ImageView logo=new ImageView(this);logo.setImageBitmap(android.graphics.BitmapFactory.decodeStream(in));logo.setAdjustViewBounds(true);logo.setScaleType(ImageView.ScaleType.FIT_CENTER);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(dp(96),dp(96));lp.gravity=android.view.Gravity.CENTER_HORIZONTAL;lp.bottomMargin=dp(6);panel.addView(logo,lp);}catch(Exception ignored){}}
   TextView heading=new TextView(this);heading.setTextSize(26);heading.setText(title);panel.addView(heading);
 }
 void text(String s){TextView v=new TextView(this);v.setTextSize(18);v.setText(s);panel.addView(v);}
 Button button(String s,Runnable action){
   Button b=new Button(this); b.setAllCaps(false); b.setText(s); b.setTextSize(16);
   b.setMinHeight(dp(52)); b.setPadding(dp(20),dp(10),dp(20),dp(10));
   b.setTextColor(tone(0xff193850,0xffd7eaff)); b.setBackgroundTintList(null);
   android.graphics.drawable.GradientDrawable fill=rounded(tone(0xffdaeafa,0xff283e52),28);
   fill.setStroke(dp(1),tone(0xffbbcede,0xff4a6479));
   b.setBackground(new android.graphics.drawable.RippleDrawable(android.content.res.ColorStateList.valueOf(tone(0x301d4866,0x42cee6ff)),fill,null));
   LinearLayout.LayoutParams layout=new LinearLayout.LayoutParams(-1,-2);layout.topMargin=dp(8);
   b.setOnClickListener(v->action.run());panel.addView(b,layout);return b;
 }
 // Install bar in the place of the theme's button, the button's size: an always-moving purple/blue/cyan gradient
 // with a light sweeping over it ("estilo inteligência artificial", Augusto 26/11) and the step written inside.
 class AiBar extends ProgressBar {
   String text="";float shift;final android.graphics.Paint p=new android.graphics.Paint(1),tp=new android.graphics.Paint(1);
   final android.animation.ValueAnimator anim=android.animation.ValueAnimator.ofFloat(0f,1f);
   AiBar(){super(Main.this,null,android.R.attr.progressBarStyleHorizontal);setMax(100);
     tp.setTextAlign(android.graphics.Paint.Align.CENTER);tp.setFakeBoldText(true);tp.setTextSize(dp(15));
     anim.setDuration(1600);anim.setRepeatCount(android.animation.ValueAnimator.INFINITE);anim.setInterpolator(new android.view.animation.LinearInterpolator());
     anim.addUpdateListener(v->{shift=(float)v.getAnimatedValue();invalidate();});}
   @Override protected void onAttachedToWindow(){super.onAttachedToWindow();anim.start();}
   @Override protected void onDetachedFromWindow(){anim.cancel();super.onDetachedFromWindow();}
   void setText(String s){text=s==null?"":s;invalidate();}
   @Override protected synchronized void onDraw(android.graphics.Canvas c){
     float w=getWidth(),h=getHeight(),r=h/2f;if(w<=0)return;
     p.setShader(null);p.setColor(tone(0xffe4e8f6,0xff262b36));c.drawRoundRect(new android.graphics.RectF(0,0,w,h),r,r,p);
     float fw=Math.max(h,w*getProgress()/100f);android.graphics.RectF fill=new android.graphics.RectF(0,0,fw,h);
     float sx=shift*w*2f;
     p.setShader(new android.graphics.LinearGradient(sx-w,0,sx,0,new int[]{0xff7c4dff,0xff2979ff,0xff00e5ff,0xffb388ff,0xff7c4dff},null,android.graphics.Shader.TileMode.REPEAT));
     c.drawRoundRect(fill,r,r,p);
     float hx=-w*0.3f+shift*w*1.6f;
     p.setShader(new android.graphics.LinearGradient(hx-w*0.18f,0,hx+w*0.18f,0,new int[]{0x00ffffff,0x80ffffff,0x00ffffff},null,android.graphics.Shader.TileMode.CLAMP));
     c.drawRoundRect(fill,r,r,p);p.setShader(null);
     boolean over=fw>w*0.5f;tp.setColor(over?0xffffffff:tone(0xff1b2440,0xffeef2ff));tp.setShadowLayer(over?dp(2):0,0,dp(1)/2f,0x66000000);
     String s=text;while(s.length()>4&&tp.measureText(s)>w-dp(24))s=s.substring(0,s.length()-2);if(!s.equals(text))s=s.trim()+"…";
     c.drawText(s,w/2f,h/2f-(tp.descent()+tp.ascent())/2f,tp);}
 }
 class Reflection extends android.view.View {
   final android.graphics.Paint paint=new android.graphics.Paint(1);
   final int delay;
   android.animation.ValueAnimator sweep;
   final Runnable start=()->sweep();
   float phase=-1;
   Reflection(int offset){super(Main.this);delay=offset;setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);}
   void schedule(){removeCallbacks(start);if(isShown() && getWindowVisibility()==VISIBLE && android.animation.ValueAnimator.areAnimatorsEnabled())postDelayed(start,delay);}
   void sweep(){
     if(!isShown() || getWindowVisibility()!=VISIBLE || !android.animation.ValueAnimator.areAnimatorsEnabled())return;
     sweep=android.animation.ValueAnimator.ofFloat(0,1);sweep.setDuration(900);
     sweep.addUpdateListener(a->{phase=(float)a.getAnimatedValue();invalidate();});
     sweep.addListener(new android.animation.AnimatorListenerAdapter(){public void onAnimationEnd(android.animation.Animator a){phase=-1;invalidate();}});
     sweep.start();postDelayed(start,11000);
   }
   protected void onSizeChanged(int w,int h,int oldW,int oldH){if(w>0)paint.setShader(new android.graphics.LinearGradient(0,0,w*.28f,h*.12f,new int[]{0x00ffffff,0x10ffffff,0x4dffffff,0x10ffffff,0x00ffffff},null,android.graphics.Shader.TileMode.CLAMP));}
   protected void onDraw(android.graphics.Canvas c){if(phase<0)return;float x=getWidth()*(phase*1.7f-.55f);c.save();c.translate(x,0);c.drawRect(-getWidth()*2,0,getWidth()*2,getHeight(),paint);c.restore();}
   protected void onAttachedToWindow(){super.onAttachedToWindow();schedule();}
   protected void onWindowVisibilityChanged(int v){super.onWindowVisibilityChanged(v);if(start==null)return;if(v==VISIBLE)schedule();else stopSweep();}
   void stopSweep(){removeCallbacks(start);if(sweep!=null)sweep.cancel();}
   protected void onDetachedFromWindow(){stopSweep();super.onDetachedFromWindow();}
 }
 boolean dark(){return (getResources().getConfiguration().uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK)==android.content.res.Configuration.UI_MODE_NIGHT_YES;}
 int tone(int light,int night){return dark()?night:light;}
 void standPart(LinearLayout stage,int width,int height,int radius,int color){
   android.view.View part=new android.view.View(this);
   part.setBackground(rounded(color,radius));
   stage.addView(part,new LinearLayout.LayoutParams(dp(width),dp(height)));
 }
 int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
 android.graphics.drawable.GradientDrawable rounded(int color,int radius){
   android.graphics.drawable.GradientDrawable shape=new android.graphics.drawable.GradientDrawable();
   shape.setColor(color);shape.setCornerRadius(dp(radius));return shape;
 }
 void platformCard(String key,String label,String sub,String guideName){
   boolean comingSoon=!key.equals("lg");
   LinearLayout card=new LinearLayout(this);card.setOrientation(1);android.graphics.drawable.GradientDrawable surface=rounded(tone(0xffffffff,0xff22262d),22);surface.setStroke(dp(1),tone(0xffdce0e6,0xff444a54));card.setBackground(surface);card.setElevation(dp(3));card.setPadding(dp(2),dp(2),dp(2),dp(2));card.setClipToOutline(true);
   LinearLayout.LayoutParams place=new LinearLayout.LayoutParams(-1,-2);place.topMargin=dp(12);panel.addView(card,place);
   ImageView image=new ImageView(this);image.setScaleType(ImageView.ScaleType.FIT_CENTER);image.setBackgroundColor(0xff151a23);
   try(InputStream in=getAssets().open(key+".img")){android.graphics.Bitmap bitmap=android.graphics.BitmapFactory.decodeStream(in);
     if(key.equals("lg") && bitmap!=null){
       int w=bitmap.getWidth(),h=bitmap.getHeight();
       bitmap=android.graphics.Bitmap.createBitmap(bitmap,w*51/1000,h*243/1000,w*887/1000,h*494/1000);
       image.setScaleType(ImageView.ScaleType.CENTER_CROP);
     } else if(key.equals("samsung") && bitmap!=null){
       int w=bitmap.getWidth(),h=bitmap.getHeight();
       bitmap=android.graphics.Bitmap.createBitmap(bitmap,w*65/720,h*18/370,w*590/720,h*332/370);
       image.setScaleType(ImageView.ScaleType.CENTER_CROP);
     }
     if(comingSoon && bitmap!=null && android.os.Build.VERSION.SDK_INT<31){
       bitmap=android.graphics.Bitmap.createScaledBitmap(bitmap,80,45,true);
     }
     image.setImageBitmap(bitmap);}catch(IOException ignored){}
   if(comingSoon){image.setAlpha(.65f);if(android.os.Build.VERSION.SDK_INT>=31)image.setRenderEffect(android.graphics.RenderEffect.createBlurEffect(dp(3),dp(3),android.graphics.Shader.TileMode.CLAMP));}
   LinearLayout stage=new LinearLayout(this);
   stage.setOrientation(1);stage.setGravity(android.view.Gravity.CENTER_HORIZONTAL);
   stage.setPadding(dp(14),dp(14),dp(14),0);card.addView(stage);
   FrameLayout frame=new FrameLayout(this);
   android.graphics.drawable.GradientDrawable bezel=rounded(0xff14171b,7);
   bezel.setStroke(dp(1),0xff69717b);frame.setBackground(bezel);frame.setClipToOutline(true);
   int width=Math.min(dp(228),getResources().getDisplayMetrics().widthPixels-dp(90));
   stage.addView(frame,new LinearLayout.LayoutParams(width,width*9/16+dp(4)));
   FrameLayout.LayoutParams display=new FrameLayout.LayoutParams(-1,-1);
   display.setMargins(dp(4),dp(4),dp(4),dp(6));frame.addView(image,display);frame.addView(new Reflection(key.equals("lg")?1600:key.equals("samsung")?3500:5400),new FrameLayout.LayoutParams(display));
   if(comingSoon){
     TextView badge=new TextView(this);badge.setText("Em breve");badge.setTextSize(16);badge.setTextColor(0xffffffff);badge.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);badge.setGravity(17);badge.setPadding(dp(18),dp(8),dp(18),dp(8));badge.setBackground(rounded(0xe6323948,24));
     FrameLayout.LayoutParams badgePlace=new FrameLayout.LayoutParams(-2,-2,android.view.Gravity.CENTER);frame.addView(badge,badgePlace);
   }
   standPart(stage,18,5,0,0xff515760);standPart(stage,70,4,2,0xff717984);
   LinearLayout row=new LinearLayout(this);row.setGravity(16);row.setPadding(dp(16),dp(10),dp(16),dp(10));card.addView(row);
   LinearLayout labels=new LinearLayout(this);labels.setOrientation(1);row.addView(labels,new LinearLayout.LayoutParams(0,-2,1));
   TextView name=new TextView(this);name.setText(label);name.setTextSize(20);name.setTextColor(tone(0xff192333,0xffedf1f8));name.setTypeface(android.graphics.Typeface.create("sans-serif-medium",0));labels.addView(name);
   TextView caption=new TextView(this);caption.setText(sub);caption.setTextColor(tone(0xff414c59,0xffc4cad4));labels.addView(caption);
   TextView arrow=new TextView(this);arrow.setText("›");arrow.setTextSize(26);arrow.setGravity(17);arrow.setTextColor(tone(0xff14395a,0xffd3e7ff));arrow.setBackground(rounded(tone(0xffcfe4fa,0xff34495f),24));row.addView(arrow,new LinearLayout.LayoutParams(dp(42),dp(42)));
   card.setContentDescription(label+". "+sub+". Abrir configuração");card.setFocusable(true);card.setOnClickListener(v->{brand=guideName;guide();if(key.equals("lg"))findLg();});
   if(comingSoon){arrow.setVisibility(android.view.View.GONE);card.setOnClickListener(null);card.setClickable(false);card.setFocusable(false);card.setContentDescription(label+". Em breve. Indisponível para configuração.");}
   android.util.TypedValue ripple=new android.util.TypedValue();getTheme().resolveAttribute(android.R.attr.selectableItemBackground,ripple,true);if(ripple.resourceId!=0)card.setForeground(getDrawable(ripple.resourceId));
 }
 boolean hasConfiguredTv(){
   String h=prefs.getString("host","").trim();
   return !h.isEmpty()&&!LgSetup.read(this,h).isEmpty();
 }
 void brands(){
   screen(0,"Freedom TV · "+tr("Qual é a sua TV?","Which TV do you have?","¿Cuál es tu TV?"));
   text(tr("Escolha sua TV. No momento, a configuração está disponível para LG.","Choose your TV. Currently, setup is available for LG.","Elige tu TV. Por ahora, la configuración está disponible para LG."));
   platformCard("lg","LG","webOS","LG webOS");
   platformCard("samsung","Samsung","Smart Hub · Tizen","Samsung Tizen");
   platformCard("google","Google TV / Android TV","Google TV · Android TV","Android TV / Google TV");
   button(tr("Minha LG já está configurada","My LG is already configured","Mi LG ya está configurada"),()->{
     brand="LG webOS";
     if(hasConfiguredTv())themes();
     else connect();
   });
 }
 int wifiIndex;
 void phoneIp(int index){
   wifiIndex=index;
   String[] captions={"No celular Samsung, abra Configurações e toque em Conexões.","Toque em Wi-Fi. Ao lado da rede marcada como conectada, toque na engrenagem.","Na tela da rede, toque em Ver mais, se essa opção aparecer.","Deslize para cima para ver os detalhes da conexão.","Em Endereço IP, anote o IPv4: quatro números separados por pontos. O número da imagem é fictício. Use o exibido no seu celular."};
   screen(4,"IP do celular · "+(index+1)+" de 5");text(captions[index]);
   ImageView img=new ImageView(this);img.setAdjustViewBounds(true);img.setScaleType(ImageView.ScaleType.FIT_CENTER);img.setContentDescription(captions[index]);
   try(InputStream in=getAssets().open("wifi-"+index+".png")){img.setImageBitmap(assetBitmap("wifi-"+index+".png"));panel.addView(img,new LinearLayout.LayoutParams(-1,-2));}catch(IOException ignored){}
   if(index==0)text("Conecte o celular e a TV à mesma rede local.");
   button(index==4?"Anotei o IP · voltar ao guia":"Próximo",()->{if(index==4)guide();else phoneIp(index+1);});
   button("Voltar",()->{if(index==0)guide();else phoneIp(index-1);});
 }
 void guideImage(String file,String description){
   ImageView image=new ImageView(this);
   image.setAdjustViewBounds(true);image.setScaleType(ImageView.ScaleType.FIT_CENTER);image.setContentDescription(description);
   try(InputStream stream=getAssets().open(file)){
     image.setImageBitmap(assetBitmap(file));
     LinearLayout.LayoutParams area=new LinearLayout.LayoutParams(-1,-2);area.topMargin=dp(10);area.bottomMargin=dp(10);panel.addView(image,area);
   }catch(IOException ignored){}
 }
 void guide(){
   String migration="paginas2:"+brand;
   if(!prefs.contains(migration)){
     int old=prefs.getInt(brand,0);
     int[] positions=brand.equals("LG webOS")?new int[]{0,1,5,7,8,11}:brand.equals("Samsung Tizen")?new int[]{0,1,3,5}:null;
     if(positions!=null)old=positions[Math.max(0,Math.min(old,positions.length-1))];
     prefs.edit().putInt(brand,old).putBoolean(migration,true).apply();
   }
   String[] steps=steps();int step=prefs.getInt(brand,0);
   if(step>=steps.length){if(brand.equals("LG webOS")){connect();return;}if(brand.equals("Samsung Tizen")){samsungRoot();return;}screen(1,brand);text("Guia concluído. A instalação pelo celular nesta versão está disponível para LG.");button("Rever etapas",()->{prefs.edit().putInt(brand,0).apply();guide();});button("Escolher TV",this::brands);return;}
   screen(1,brand+" · "+(step+1)+" de "+steps.length);text(steps[step]);
   if(brand.equals("LG webOS")){
     if(step==1)guideImage("lg-home-apps.png","Ícone verde APPS selecionado.");
     if(step==2){
       TextView term=new TextView(this);term.setText("Developer Mode");term.setTextSize(24);term.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);term.setTextIsSelectable(true);panel.addView(term);
     }
     if(step==3)guideImage("lg-search-devmode.png","Resultado Developer Mode com ícone vermelho.");
   }
   if(brand.equals("Samsung Tizen") && step==0)guideImage("samsung-apps.png","Apps selecionado na barra inferior.");
   if(brand.equals("Samsung Tizen") && step==2)guideImage("samsung-devmode.png","Janela Developer mode com On destacado.");
   if(brand.equals("Samsung Tizen") && step==3)button("Como encontrar o IP do celular",()->phoneIp(0));
   button(step==steps.length-1?"Concluir e configurar TV":"Próximo",()->{prefs.edit().putInt(brand,step+1).apply();guide();});
   button("Voltar",()->{if(step==0){brands();return;}prefs.edit().putInt(brand,step-1).apply();guide();});
 }

 // Etapa 2: Configurar a conexão da TV LG (limpa, sem papel de parede aqui!)
 void connect(){
   screen(3,tr("Configurar TV LG","Configure LG TV","Configurar TV LG"));
   text(tr("Informe o IP e a passphrase exibidos no Developer Mode da sua LG, ou busque na rede.","Enter the IP and passphrase shown in Developer Mode on your LG, or search the network.","Ingresa la IP y passphrase que muestra Developer Mode en tu LG, o busca en la red."));
   ip=new EditText(this);ip.setSingleLine();ip.setHint("IP da LG (ex.: 192.168.0.76)");ip.setText(prefs.getString("host",""));panel.addView(ip);
   code=new EditText(this);code.setSingleLine();code.setInputType(129);code.setHint("Passphrase da TV (6 caracteres)");panel.addView(code);
   status=new TextView(this);panel.addView(status);
   code.setText(LgSetup.read(this,ip.getText().toString().trim()));
   ip.addTextChangedListener(new android.text.TextWatcher(){public void beforeTextChanged(CharSequence s,int a,int c,int f){} public void onTextChanged(CharSequence s,int a,int b,int c){code.setText(LgSetup.read(Main.this,s.toString().trim()));}public void afterTextChanged(android.text.Editable e){}});
   button(tr("Encontrar LG na rede","Find LG on network","Buscar LG en la red"),()->findLg());
   install=button(tr("Autorizar e escolher tema","Authorize & choose theme","Autorizar y elegir tema"),()->{
     String host=ip.getText().toString().trim(),pass=code.getText().toString().trim();
     if(!android.util.Patterns.IP_ADDRESS.matcher(host).matches()||!host.matches("[0-9.]+")||pass.length()!=6){
       status.setText("Confira o IPv4 da TV e os seis caracteres da passphrase.");return;
     }
     if(busy)return;busy=true;install.setEnabled(false);say("Autorizando conexão com a LG…");
     new Thread(()->{Session connection=null;try{connection=developerConnect(host,pass);prefs.edit().putString("host",host).putBoolean("root:"+host,false).apply();runOnUiThread(()->{busy=false;cleanupChoice();});}catch(Exception e){say("Não foi possível autorizar: "+e.getMessage());}finally{if(connection!=null)connection.disconnect();runOnUiThread(()->{busy=false;if(install!=null)install.setEnabled(true);});}}).start();
   });
   button("Conectar via Homebrew (Root)",()->RootAccess.configure(this));
   if(prefs.getBoolean("root:"+prefs.getString("host",""),false))button("Escolher tema (Homebrew)",()->{if(!busy)themes();});
   button("Renovar autorização da LG",()->{if(busy)return;String host=ip.getText().toString().trim();getSharedPreferences("lg-secure",0).edit().remove("key:"+host).remove(host).apply();code.setText("");status.setText("Abra Developer Mode na LG, ative Key Server e digite a passphrase atual.");});
   button("Rever passo a passo da LG",()->{if(!busy){prefs.edit().putInt(brand,0).apply();guide();}});
   button("Voltar",()->{if(!busy)brands();});
 }

 // Etapa 3: Depois que a TV já está configurada, mostra os temas (e no Vidro Líquido permite configurar/trocar papel de parede!)
 void cleanupChoice(){screen(7,"Preparar a instalação");status=new TextView(this);panel.addView(status);text("Deseja remover aplicativos antes de escolher o tema?");button("Sim, escolher aplicativos",()->RootAccess.manage(this));button("Não, continuar para os temas",()->themes());}
 Button[] themeBtn=new Button[8];LinearLayout[] themeLoad=new LinearLayout[8];AiBar[] themeBar=new AiBar[8];TextView[] themeLabel=new TextView[8];int activeTheme=-1;
 void themes(){
   activeTheme=-1;java.util.Arrays.fill(themeBtn,null);
   String host=prefs.getString("host","").trim();
   screen(2,"Freedom TV · "+tr("Escolha o tema da LG","Choose your LG theme","Elige el tema de tu LG"));
   text(host.isEmpty()?tr("Escolha o tema abaixo.","Choose your theme below.","Elige tu tema abajo."):("TV LG configurada: "+host));
   status=new TextView(this);status.setTextSize(16);panel.addView(status);
   bar=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);bar.setMax(100);bar.setVisibility(busy?android.view.View.VISIBLE:android.view.View.GONE);bar.setProgressTintList(android.content.res.ColorStateList.valueOf(0xff2e9e5b));{LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(14));lp.topMargin=dp(6);lp.bottomMargin=dp(6);panel.addView(bar,lp);}
   String[] descriptions={"Painéis de vidro sobre o papel de parede, com seus aplicativos em destaque.","Visual claro e limpo, com os aplicativos no topo.","Visual escuro, destaque para séries e uma fileira de aplicativos.","Tela dividida: destaque à esquerda, aplicativos e séries à direita."};
   for(int i=0;i<names.length;i++){
     final int n=i;
     LinearLayout card=new LinearLayout(this);card.setOrientation(1);card.setPadding(dp(12),dp(12),dp(12),dp(12));card.setBackground(rounded(tone(0xffffffff,0xff22262d),24));card.setElevation(dp(2));
     LinearLayout.LayoutParams spacing=new LinearLayout.LayoutParams(-1,-2);spacing.topMargin=dp(18);panel.addView(card,spacing);
     TextView title=new TextView(this);title.setText(names[n]);title.setTextSize(22);title.setTextColor(tone(0xff192333,0xffedf1f8));card.addView(title);
     ImageView preview=new ImageView(this);preview.setAdjustViewBounds(true);preview.setScaleType(ImageView.ScaleType.FIT_CENTER);preview.setContentDescription("Prévia do tema "+names[n]);
     try(InputStream in=getAssets().open("preview-"+ids[n]+".png")){preview.setImageBitmap(assetBitmap("preview-"+ids[n]+".png"));}catch(IOException ignored){}
     LinearLayout.LayoutParams picture=new LinearLayout.LayoutParams(-1,-2);picture.topMargin=dp(12);picture.bottomMargin=dp(10);card.addView(preview,picture);
     preview.setOnClickListener(v->{if("vidro".equals(ids[n]))vidroSettings();else applyThemeNow(n);});
     TextView description=new TextView(this);description.setText(descriptions[n]);description.setTextSize(15);description.setTextColor(tone(0xff414c59,0xffc4cad4));card.addView(description);
     LinearLayout previous=panel;panel=card;
     themeBtn[n]=button(tr("Instalar e aplicar ","Install & apply ","Instalar y aplicar ")+names[n],()->applyThemeNow(n));
     // The install button turns into this bar while the theme goes to the TV (Augusto 26/11).
     {LinearLayout box=new LinearLayout(this);box.setOrientation(1);box.setVisibility(android.view.View.GONE);
      TextView label=new TextView(this);label.setTextSize(15);label.setTextColor(tone(0xff192333,0xffedf1f8));box.addView(label);
      label.setVisibility(android.view.View.GONE);   // only for an error message
      AiBar pb=new AiBar();
      LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,Math.max(dp(56),themeBtn[n].getMinimumHeight()));box.addView(pb,0,lp);
      LinearLayout.LayoutParams bl=new LinearLayout.LayoutParams(-1,-2);bl.topMargin=dp(8);bl.bottomMargin=dp(8);card.addView(box,bl);
      themeLoad[n]=box;themeBar[n]=pb;themeLabel[n]=label;}
     if("vidro".equals(ids[n])){
       button(tr("Configurações / Papel de parede (Vidro Líquido)","Settings / Wallpaper (Liquid Glass)","Ajustes / Fondo (Vidro Líquido)"),()->{if(!busy)vidroSettings();});
     }
     panel=previous;
   }
   button(tr("Alterar IP / Passphrase da TV LG","Change LG TV IP / Passphrase","Cambiar IP / Passphrase de la TV"),()->{if(!busy)connect();});
   button("Gerenciar aplicativos da TV",()->RootAccess.manage(this));
   button("Escolher outra TV",()->{if(!busy)brands();});
 }

 void applyThemeNow(int n){
   if(busy)return;
   theme=ids[n];prefs.edit().putString("theme",theme).apply();
   String host=prefs.getString("host","").trim();
   String pass=LgSetup.read(this,host);
   if(host.isEmpty()||(!prefs.getBoolean("root:"+host,false)&&LgSetup.read(this,"root-private:"+host).isEmpty()&&pass.length()!=6)){connect();return;}
   busy=true;
   activeTheme=(themeBtn[n]!=null&&themeBtn[n].isAttachedToWindow())?n:-1;
   if(activeTheme>=0){for(int i=0;i<themeLoad.length;i++)if(themeLoad[i]!=null&&i!=n)themeLoad[i].setVisibility(android.view.View.GONE);themeBtn[n].setVisibility(android.view.View.GONE);themeLoad[n].setVisibility(android.view.View.VISIBLE);themeBar[n].setVisibility(android.view.View.VISIBLE);themeBar[n].setProgress(0);themeLabel[n].setVisibility(android.view.View.GONE);themeLabel[n].setText("");themeBar[n].setText("Conectando à LG…");}
   if(status!=null)status.setText("Conectando à LG ("+host+") para aplicar "+names[n]+"…");
   Toast.makeText(this,"Enviando "+names[n]+" para a TV LG…",Toast.LENGTH_SHORT).show();
   progress(3);
   new Thread(()->runInstall(host,pass)).start();
 }

 // Tela de configurações do tema Vidro Líquido (acessada dentro dos temas, pós-configuração da TV!)
 void vidroSettings(){
   theme="vidro";prefs.edit().putString("theme","vidro").apply();
   String host=prefs.getString("host","").trim();
   screen(6,"Vidro Líquido · Configurações");
   text(tr("Escolha ou envie um novo papel de parede do seu celular diretamente para o tema Vidro Líquido na TV.","Choose or send a new wallpaper from your phone directly to the Liquid Glass theme on your TV.","Elige o envía un nuevo fondo desde tu celular directamente al tema Vidro Líquido en tu TV."));
   wallPreview=new ImageView(this);wallPreview.setAdjustViewBounds(true);wallPreview.setMaxHeight(dp(190));
   LinearLayout.LayoutParams wp=new LinearLayout.LayoutParams(-1,-2);wp.topMargin=dp(12);wp.bottomMargin=dp(8);
   if(customWallJpg!=null){
     wallPreview.setImageBitmap(android.graphics.BitmapFactory.decodeByteArray(customWallJpg,0,customWallJpg.length));
   }else{
     try(InputStream in=getAssets().open("preview-vidro.png")){wallPreview.setImageBitmap(android.graphics.BitmapFactory.decodeStream(in));}catch(Exception ignored){}
   }
   panel.addView(wallPreview,wp);
   status=new TextView(this);status.setTextSize(15);
   status.setText(customWallJpg!=null?tr("Novo papel de parede selecionado. Toque em 'Enviar papel de parede para a TV' abaixo.","New wallpaper selected. Tap 'Send wallpaper to TV' below.","Nuevo fondo seleccionado. Toca 'Enviar fondo a la TV' abajo."):tr("Toque abaixo para escolher uma imagem da galeria do celular.","Tap below to choose an image from your phone gallery.","Toca abajo para elegir una imagen de la galería."));
   panel.addView(status);
   button(tr("Escolher papel de parede da galeria","Choose wallpaper from gallery","Elegir fondo de la galería"),()->{
     if(busy)return;
     android.content.Intent pick=new android.content.Intent(android.content.Intent.ACTION_GET_CONTENT);
     pick.setType("image/*");
     startActivityForResult(android.content.Intent.createChooser(pick,tr("Escolher papel de parede","Choose wallpaper","Elegir fondo")),701);
   });
   if(customWallJpg!=null){
     button(tr("Enviar papel de parede para a TV agora","Send wallpaper to TV now","Enviar fondo a la TV ahora"),()->{
       if(busy)return;
       String pass=LgSetup.read(this,host);
       if(host.isEmpty()||(!prefs.getBoolean("root:"+host,false)&&LgSetup.read(this,"root-private:"+host).isEmpty()&&pass.length()!=6)){connect();return;}
       busy=true;
       status.setText("Enviando novo papel de parede para a TV LG…");
       new Thread(()->runWallpaperOnly(host,pass)).start();
     });
     button(tr("Instalar Vidro Líquido com este papel de parede","Install Liquid Glass with this wallpaper","Instalar Vidro Líquido con este fondo"),()->applyThemeNow(0));
   }else{
     button(tr("Instalar e aplicar Vidro Líquido na TV","Install & apply Liquid Glass on TV","Instalar y aplicar Vidro Líquido en la TV"),()->applyThemeNow(0));
   }
   button(tr("Voltar aos temas","Back to themes","Volver a los temas"),()->{if(!busy)themes();});
 }

 void samsungRoot(){
   screen(5,"Samsung · Acesso avançado");
   text("Antes de fazer root, precisamos identificar sua TV e conferir o estado real da conexão. Esta etapa apenas consulta a TV.");
   final EditText hostInput=new EditText(this);hostInput.setSingleLine();hostInput.setHint("Endereço IP da TV Samsung");hostInput.setText(prefs.getString("samsungHost",""));panel.addView(hostInput);
   final TextView report=new TextView(this);report.setTextSize(16);panel.addView(report);
   final Button check=button("Verificar TV e estado do root",()->{});
   check.setOnClickListener(v->{if(busy)return;final String host=hostInput.getText().toString().trim();busy=true;check.setEnabled(false);report.setText("Consultando a Samsung…");
     new Thread(()->{String result;try{result=SamsungRoot.inspect(host);prefs.edit().putString("samsungHost",host).apply();}catch(Exception e){result="Não foi possível concluir a verificação. "+e.getMessage();}final String message=result;runOnUiThread(()->{report.setText(message);busy=false;check.setEnabled(true);});}).start();
   });
   button("Rever preparação da Samsung",()->{if(busy)return;prefs.edit().putInt(brand,0).apply();guide();});
   button("Voltar",()->{if(!busy)brands();});
 }
 boolean findingLg;
 void findLg(){
 if(findingLg||busy)return;findingLg=true;Toast.makeText(this,"Procurando TVs LG na rede Wi-Fi…",Toast.LENGTH_SHORT).show();
 if(status!=null)status.setText("Buscando Smart TVs LG na sua rede local…");
 new Thread(()->{java.util.List<String> found;try{found=LgSetup.discover();}catch(Exception e){found=new java.util.ArrayList<>();}final java.util.List<String> results=found;runOnUiThread(()->{findingLg=false;if(isFinishing()||isDestroyed())return;if(results.isEmpty()){if(status!=null)status.setText("Nenhuma LG encontrada automaticamente. Digite o IP exibido no Developer Mode da TV.");Toast.makeText(this,"Nenhuma LG encontrada. Confira se a TV está ligada na mesma rede Wi-Fi.",Toast.LENGTH_LONG).show();return;}if(results.size()==1){useLg(results.get(0));return;}String[] labels=new String[results.size()];for(int i=0;i<labels.length;i++)labels[i]="LG webOS — "+results.get(i);new AlertDialog.Builder(this).setTitle("Escolha sua LG").setItems(labels,(d,n)->useLg(results.get(n))).setNegativeButton("Cancelar",null).show();});}).start();
 }
 void useLg(String host){if(busy)return;prefs.edit().putString("host",host).apply();if(page==3&&ip!=null)ip.setText(host);if(status!=null)status.setText("LG encontrada na rede: "+host);Toast.makeText(this,"LG encontrada: "+host,Toast.LENGTH_LONG).show();}
 @Override public void onBackPressed(){if(busy)return;if(page==4){if(wifiIndex>0)phoneIp(wifiIndex-1);else guide();return;}if(page==6){themes();return;}if(page==2){connect();return;}if(page!=0)brands();else super.onBackPressed();}
 void say(String message){android.util.Log.i("FreedomTV",message);runOnUiThread(()->{if(status!=null)status.setText(message);int a=activeTheme;if(a>=0&&themeLabel[a]!=null){themeLabel[a].setText(message);if(themeBar[a]!=null)themeBar[a].setText(message);}});}
 // Install progress bar (Augusto 25/11: "dá a impressão que não tá acontecendo nada"). -1 hides it.
 ProgressBar bar;
 void progress(int value){runOnUiThread(()->{
   int a=activeTheme;
   if(a>=0&&themeBar[a]!=null){   // the chosen theme's own bar, in place of its button
    if(value<0){themeBar[a].setVisibility(android.view.View.GONE);themeLabel[a].setVisibility(android.view.View.VISIBLE);themeBtn[a].setVisibility(android.view.View.VISIBLE);return;}   // the error text stays in the card, under the button
    themeBar[a].setProgress(Math.max(0,Math.min(100,value)));
    if(value>=100){final int done=a;themeBar[a].postDelayed(()->{if(themeLoad[done]!=null){themeLoad[done].setVisibility(android.view.View.GONE);themeBtn[done].setVisibility(android.view.View.VISIBLE);}if(activeTheme==done)activeTheme=-1;},2500);}
    return;}
   if(bar==null)return;
   if(value<0){bar.setVisibility(android.view.View.GONE);return;}
   bar.setVisibility(android.view.View.VISIBLE);bar.setProgress(Math.max(0,Math.min(100,value)));
   if(value>=100)bar.postDelayed(()->{if(!busy)bar.setVisibility(android.view.View.GONE);},2500);});}
 Session developerConnect(String host,String pass)throws Exception{Session session=null;try{if(!InetAddress.getByName(host).isSiteLocalAddress())throw new IOException("Use o IP local da LG");
 String cachedKey=LgSetup.read(this,"key:"+host);ByteArrayOutputStream key=new ByteArrayOutputStream();if(!cachedKey.isEmpty()){key.write(android.util.Base64.decode(cachedKey,android.util.Base64.NO_WRAP));say("Usando autorização salva da LG…");}else{say("Buscando chave na LG…");HttpURLConnection http=(HttpURLConnection)new URL("http://"+host+":9991/webos_rsa").openConnection();http.setInstanceFollowRedirects(false);http.setConnectTimeout(6000);http.setReadTimeout(6000);try(InputStream in=http.getInputStream()){byte[] b=new byte[2048];int n;while((n=in.read(b))!=-1){if(key.size()+n>32768)throw new IOException("Resposta inválida.");key.write(b,0,n);}}catch(IOException keyError){throw new IOException("Abra Developer Mode na LG, ative Key Server e tente novamente.");}finally{http.disconnect();}}
 JSch ssh=new JSch();ssh.addIdentity("tv",key.toByteArray(),null,pass.getBytes("UTF-8"));if(((Identity)ssh.getIdentityRepository().getIdentities().firstElement()).isEncrypted())throw new IOException("A passphrase não abriu a chave da LG. Confira os seis caracteres atuais, inclusive maiúsculas e minúsculas.");session=ssh.getSession("prisoner",host,9922);session.setTimeout(30000);session.setConfig("PreferredAuthentications","publickey");session.setConfig("StrictHostKeyChecking","ask");session.setUserInfo(new UserInfo(){
 public boolean promptYesNo(String message){final CompletableFuture<Boolean> answer=new CompletableFuture<>();runOnUiThread(()->new AlertDialog.Builder(Main.this).setTitle("Autorizar LG em "+host).setMessage("O instalador encontrou a TV neste endereço. Autorize se o IP é o que aparece no Developer Mode da sua LG.").setPositiveButton("Autorizar",(d,w)->answer.complete(true)).setNegativeButton("Cancelar",(d,w)->answer.complete(false)).setOnCancelListener(d->answer.complete(false)).show());try{return answer.get(90,TimeUnit.SECONDS);}catch(Exception e){return false;}}
 public String getPassphrase(){return pass;} public String getPassword(){return null;}public boolean promptPassword(String m){return false;}public boolean promptPassphrase(String m){return false;}public void showMessage(String m){say(m);}
 });say("Autenticando com a chave da TV…");session.connect(12000);try{LgSetup.save(this,host,pass);LgSetup.save(this,"key:"+host,android.util.Base64.encodeToString(key.toByteArray(),android.util.Base64.NO_WRAP));}catch(Exception saveError){say("Conectado, mas não foi possível salvar a autorização neste celular.");}
return session;}catch(Exception e){if(session!=null)session.disconnect();throw e;}}
 void runInstall(String host,String pass){Session session=null;try{
 if(!InetAddress.getByName(host).isSiteLocalAddress())throw new IOException("Use o endereço local da LG.");
 // Homebrew (root) first when this phone has a root key or chose root; Developer Mode otherwise or as the fallback.
 // Each try has its own time limit and the real reason is shown (Augusto 26/11: it stayed on "Conectando à LG…").
 boolean viaRoot=prefs.getBoolean("root:"+host,false)||!LgSetup.read(this,"root-private:"+host).isEmpty();
 String rootError=null;
 if(viaRoot){say("Conectando pelo Homebrew (root)…");try{session=RootAccess.connect(this,host,LgSetup.read(this,"root:"+host));prefs.edit().putBoolean("root:"+host,true).apply();}catch(Exception e){android.util.Log.e("FreedomTV","Homebrew falhou",e);rootError=e.getMessage();session=null;viaRoot=false;}}
 if(session==null){
  if(pass.length()!=6)throw new IOException("Não foi possível conectar pelo Homebrew"+(rootError!=null?" ("+rootError+")":"")+". Confira na TV: Homebrew Channel → SSH Server ligado.");
  say(rootError!=null?"Homebrew não respondeu; tentando o Modo Desenvolvedor…":"Conectando pelo Modo Desenvolvedor…");
  try{session=developerConnect(host,pass);}catch(Exception e){android.util.Log.e("FreedomTV","Modo Desenvolvedor falhou",e);throw new IOException((rootError!=null?"Homebrew: "+rootError+". ":"")+"Modo Desenvolvedor: "+e.getMessage()+". Na TV, abra o app Developer Mode e confira se está ligado.");}
 }
 // Switching theme does not need the whole package again (4 MB with the catalog covers): when the TV already has
 // this version, only tell it which theme to show. (Augusto 25/11: "demorando muito"/"às vezes nem instala".)
 String want="";try(InputStream v=getAssets().open("studio-version.txt")){want=new java.util.Scanner(v,"UTF-8").useDelimiter("\\A").next().trim();}catch(Exception ignored){}
 String have="";try{have=RootAccess.exec(session,"cat /media/developer/apps/usr/palm/applications/com.twbstudio.tvthemes/appinfo.json");}catch(Exception ignored){}
 final boolean fresh=!want.isEmpty()&&have.contains("\"version\":\""+want+"\"");
 progress(fresh?60:12);
 String path="/media/developer/temp/tvstudio-"+java.util.UUID.randomUUID()+".ipk";
 if(!fresh)try(InputStream raw=getAssets().open("studio.ipk")){
  final long total=Math.max(1,raw.available());final long[] sent={0};final int[] shown={-1};
  InputStream payload=new java.io.FilterInputStream(new java.io.BufferedInputStream(raw,65536)){
   @Override public int read(byte[] b,int off,int len)throws IOException{int n=super.read(b,off,len);if(n>0){sent[0]+=n;int pct=(int)(sent[0]*100/total);if(pct/5!=shown[0]){shown[0]=pct/5;say("Enviando o tema para a LG… "+Math.min(100,pct)+"%");progress(12+Math.min(100,pct)*68/100);}}return n;}
  };
  ChannelExec upload=(ChannelExec)session.openChannel("exec");upload.setCommand("mkdir -p /media/developer/temp && cat > "+path);upload.setInputStream(payload);upload.connect(8000);long limit=System.currentTimeMillis()+180000;while(!upload.isClosed()&&System.currentTimeMillis()<limit)Thread.sleep(100);int exit=upload.getExitStatus();upload.disconnect();if(exit!=0)throw new IOException(upload.isClosed()?"A transferência falhou.":"A transferência demorou demais. Confira o Wi-Fi e tente de novo.");}
 try{
  if(fresh)say("A TV já tem esta versão. Trocando o tema…");else{
  say("Instalando na LG…");progress(84);
  String installJson=new JSONObject().put("id","com.twbstudio.tvthemes").put("ipkUrl",path).put("subscribe",true).toString();
  response(session,(viaRoot?"/usr/bin/luna-send":"/usr/bin/luna-send-pub")+" -i luna://com.webos.appInstallService/dev/install '"+installJson+"'",true);
  }
  if(viaRoot&&!fresh){
   say("Preservando autorização e otimizando a inicialização…");
   RootAccess.exec(session,"node -e \"require('/media/developer/apps/usr/palm/services/com.twbstudio.tvthemes.icons/pairing-store')('tvstudio-icons-client-key')\"");
   RootAccess.exec(session,"if [ -f /var/lib/tvstudio/root-home-enabled ] && [ -f /var/lib/webosbrew/init.d/90-tvstudio-home ]; then node /media/developer/apps/usr/palm/services/com.twbstudio.tvthemes.icons/root-assets/tune-home-boot.js; fi");
  }
  if("vidro".equals(theme)&&customWallJpg!=null){say("Aplicando seu papel de parede personalizado…");pushWallFiles(session);}
  JSONObject paramsObj=new JSONObject().put("studioTheme",theme);
  if("vidro".equals(theme)&&customWallJpg!=null)paramsObj.put("customWall",System.currentTimeMillis());
  String launchJson=new JSONObject().put("id","com.twbstudio.tvthemes").put("params",paramsObj).toString();
  response(session,"/usr/bin/luna-send-pub -n 1 luna://com.webos.applicationManager/launch '"+launchJson+"'",false);
  progress(100);
  say(fresh?"Tema trocado na TV!":"A LG confirmou a instalação e abriu o tema escolhido!");
 }finally{if(!fresh){ChannelExec cleanup=(ChannelExec)session.openChannel("exec");cleanup.setCommand("rm -f "+path);cleanup.connect(3000);cleanup.disconnect();}}
 }catch(Exception e){android.util.Log.e("FreedomTV","instalação falhou",e);progress(-1);say("Não foi possível instalar. "+e.getMessage());}finally{if(session!=null)session.disconnect();runOnUiThread(()->{busy=false;if(install!=null)install.setEnabled(true);});}}
 void runWallpaperOnly(String host,String pass){
  Session session=null;
  try{
   if(!InetAddress.getByName(host).isSiteLocalAddress())throw new IOException("Use o endereço local da LG.");
   // Same way in as runInstall (Augusto 26/11): Homebrew (root) first when this phone was authorized there — on a
   // rooted TV the Developer Mode ports are closed — then Developer Mode, showing the real reason if both fail.
   boolean viaRoot=prefs.getBoolean("root:"+host,false)||!LgSetup.read(this,"root-private:"+host).isEmpty();
   String rootError=null;
   if(viaRoot){say("Conectando pelo Homebrew (root)…");try{session=RootAccess.connect(this,host,LgSetup.read(this,"root:"+host));}catch(Exception e){android.util.Log.e("FreedomTV","Homebrew falhou (papel de parede)",e);rootError=e.getMessage();session=null;}}
   if(session==null){
    if(pass.length()!=6)throw new IOException("Não foi possível conectar pelo Homebrew"+(rootError!=null?" ("+rootError+")":"")+". Confira na TV: Homebrew Channel → SSH Server ligado.");
    say(rootError!=null?"Homebrew não respondeu; tentando o Modo Desenvolvedor…":"Conectando pelo Modo Desenvolvedor…");
    try{session=developerConnect(host,pass);}catch(Exception e){throw new IOException((rootError!=null?"Homebrew: "+rootError+". ":"")+"Modo Desenvolvedor: "+e.getMessage());}
   }
   say("Enviando seu novo papel de parede para o Vidro Líquido…");
   pushWallFiles(session);
   JSONObject paramsObj=new JSONObject().put("studioTheme","vidro").put("customWall",System.currentTimeMillis());
   String launchJson=new JSONObject().put("id","com.twbstudio.tvthemes").put("params",paramsObj).toString();
   response(session,"/usr/bin/luna-send-pub -n 1 luna://com.webos.applicationManager/launch '"+launchJson+"'",false);
   say("Papel de parede atualizado com sucesso na sua TV LG!");
  }catch(Exception e){say("Não foi possível enviar o papel de parede: "+e.getMessage());}
  finally{if(session!=null)session.disconnect();runOnUiThread(()->{busy=false;});}
 }
 void response(Session session,String command,boolean installing)throws Exception{ChannelExec channel=(ChannelExec)session.openChannel("exec");channel.setCommand(command);InputStream input=channel.getInputStream();channel.connect(8000);ScheduledExecutorService timer=Executors.newSingleThreadScheduledExecutor();timer.schedule(channel::disconnect,90,TimeUnit.SECONDS);
 try(BufferedReader reader=new BufferedReader(new InputStreamReader(input))){String line;while((line=reader.readLine())!=null){JSONObject result=new JSONObject(line.trim());if(result.has("returnValue")&&!result.optBoolean("returnValue"))throw new IOException(result.optString("errorText","Pedido recusado"));if(!installing&&result.optBoolean("returnValue"))return;JSONObject details=result.optJSONObject("details");if(details!=null){String state=details.optString("state").toUpperCase(java.util.Locale.ROOT);if(state.contains("FAILED"))throw new IOException(details.optString("reason","Instalação recusada"));if(state.equals("INSTALLED")||state.startsWith("SUCCESS"))return;}}throw new IOException("Sem confirmação da TV.");}finally{timer.shutdownNow();channel.disconnect();}}
 @Override protected void onActivityResult(int req,int res,android.content.Intent data){
  super.onActivityResult(req,res,data);
  if(req==701&&res==RESULT_OK&&data!=null&&data.getData()!=null){
   try(InputStream in=getContentResolver().openInputStream(data.getData())){
    android.graphics.Bitmap src=android.graphics.BitmapFactory.decodeStream(in);
    if(src==null)return;
    android.graphics.Bitmap full=android.graphics.Bitmap.createScaledBitmap(src,1920,1080,true);
    android.graphics.Canvas c1=new android.graphics.Canvas(full);
    c1.drawColor(0x38000000);
    ByteArrayOutputStream b1=new ByteArrayOutputStream();
    full.compress(android.graphics.Bitmap.CompressFormat.JPEG,86,b1);
    customWallJpg=b1.toByteArray();
    android.graphics.Bitmap tiny=android.graphics.Bitmap.createScaledBitmap(full,64,36,true);
    android.graphics.Bitmap blur=android.graphics.Bitmap.createScaledBitmap(tiny,960,540,true);
    android.graphics.Canvas c2=new android.graphics.Canvas(blur);
    c2.drawColor(0x440a101d);
    ByteArrayOutputStream b2=new ByteArrayOutputStream();
    blur.compress(android.graphics.Bitmap.CompressFormat.JPEG,82,b2);
    customWallBlurJpg=b2.toByteArray();
    if(page==6)vidroSettings();
   }catch(Exception e){if(status!=null)status.setText("Não foi possível ler a imagem: "+e.getMessage());}
  }
 }
 void pushStream(Session session,byte[] bytes,String remotePath)throws Exception{
  ChannelExec up=(ChannelExec)session.openChannel("exec");
  up.setCommand("cat > "+remotePath);
  up.setInputStream(new ByteArrayInputStream(bytes));
  up.connect(8000);
  long lim=System.currentTimeMillis()+30000;
  while(!up.isClosed()&&System.currentTimeMillis()<lim)Thread.sleep(60);
  int code=up.getExitStatus();
  up.disconnect();
  if(code!=0)throw new IOException("Não foi possível gravar o papel de parede na TV.");
 }
 void pushWallFiles(Session session)throws Exception{
  String dir="/media/developer/apps/usr/palm/applications/com.twbstudio.tvthemes/themes/vidro-liquido/fundos";
  pushStream(session,customWallJpg,dir+"/foto-1.jpg");
  pushStream(session,customWallBlurJpg,dir+"/foto-1-vidro.jpg");
 }
}
