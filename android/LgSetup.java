package br.twbstudio.instalador;
import android.content.Context;
import android.security.keystore.*;
import android.util.Base64;
import java.security.KeyStore;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;
public final class LgSetup {
 static javax.crypto.SecretKey key() throws Exception {
  KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
  if(!store.containsAlias("lg-authorization")){KeyGenerator gen=KeyGenerator.getInstance("AES","AndroidKeyStore");gen.init(new KeyGenParameterSpec.Builder("lg-authorization",KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());gen.generateKey();}
  return (javax.crypto.SecretKey)store.getKey("lg-authorization",null);
 }
 static void save(Context c,String host,String pass)throws Exception{Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());String value=Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(cipher.doFinal(pass.getBytes("UTF-8")),Base64.NO_WRAP);c.getSharedPreferences("lg-secure",0).edit().putString(host,value).apply();}
 static String read(Context c,String host){try{String value=c.getSharedPreferences("lg-secure",0).getString(host,"");String[] parts=value.split(":");if(parts.length!=2)return "";Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));return new String(cipher.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),"UTF-8");}catch(Exception e){return "";}}
 static List<String> localPrefixes(){
  Set<String> prefixes=new LinkedHashSet<>();
  try{
   Enumeration<NetworkInterface> nets=NetworkInterface.getNetworkInterfaces();
   while(nets!=null&&nets.hasMoreElements()){
    NetworkInterface ni=nets.nextElement();
    if(!ni.isUp()||ni.isLoopback())continue;
    Enumeration<InetAddress> addrs=ni.getInetAddresses();
    while(addrs.hasMoreElements()){
     InetAddress a=addrs.nextElement();
     if(a instanceof Inet4Address&&a.isSiteLocalAddress()){
      String ip=a.getHostAddress();
      int dot=ip.lastIndexOf('.');
      if(dot>0)prefixes.add(ip.substring(0,dot+1));
     }
    }
   }
  }catch(Exception ignored){}
  if(prefixes.isEmpty()){prefixes.add("192.168.0.");prefixes.add("192.168.1.");}
  return new ArrayList<>(prefixes);
 }
 static boolean probePort(String ip,int port,int timeoutMs){
  try(Socket s=new Socket()){
   s.connect(new InetSocketAddress(ip,port),timeoutMs);
   return true;
  }catch(Exception e){return false;}
 }
 static java.util.List<String> discover()throws Exception{
  final Set<String> found=Collections.synchronizedSet(new LinkedHashSet<String>());
  Thread ssdp=new Thread(()->{
   try(DatagramSocket socket=new DatagramSocket()){
    socket.setSoTimeout(500);
    String[] targets={"urn:lge-com:service:webos-second-screen:1","urn:dial-multiscreen-org:service:dial:1","ssdp:all"};
    for(String st:targets){
     String req="M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: \"ssdp:discover\"\r\nMX: 2\r\nST: "+st+"\r\n\r\n";
     byte[] b=req.getBytes("UTF-8");
     socket.send(new DatagramPacket(b,b.length,InetAddress.getByName("239.255.255.250"),1900));
    }
    long end=System.currentTimeMillis()+2200;
    while(System.currentTimeMillis()<end){
     try{
      byte[] buf=new byte[4096];DatagramPacket p=new DatagramPacket(buf,buf.length);
      socket.receive(p);
      String r=new String(buf,0,p.getLength(),"UTF-8").toLowerCase(Locale.ROOT);
      if((r.contains("webos")||r.contains("lge")||r.contains("lg")||r.contains("second-screen"))&&p.getAddress() instanceof Inet4Address&&p.getAddress().isSiteLocalAddress()){
       found.add(p.getAddress().getHostAddress());
      }
     }catch(SocketTimeoutException ignored){}
    }
   }catch(Exception ignored){}
  });
  ssdp.start();

  // Fast parallel TCP scan of local /24 subnet for LG webOS ports (9922 DevMode SSH, 3001 SSAP TLS, 3000 SSAP, 9991 KeyServer)
  ExecutorService pool=Executors.newFixedThreadPool(48);
  List<Future<?>> futures=new ArrayList<>();
  for(String prefix:localPrefixes()){
   for(int host=1;host<=254;host++){
    final String candidate=prefix+host;
    futures.add(pool.submit(()->{
     if(probePort(candidate,9922,220)||probePort(candidate,3001,220)||probePort(candidate,9991,180)||probePort(candidate,3000,180)){
      found.add(candidate);
     }
    }));
   }
  }
  for(Future<?> f:futures){try{f.get(3500,TimeUnit.MILLISECONDS);}catch(Exception ignored){}}
  pool.shutdownNow();
  try{ssdp.join(400);}catch(Exception ignored){}
  return new ArrayList<>(found);
 }
}
