package br.twbstudio.instalador;
import java.io.*;import java.net.*;import com.jcraft.jsch.*;
final class RootPairing {
 static String read(InputStream in,OutputStream out,String marker)throws Exception{
  ByteArrayOutputStream b=new ByteArrayOutputStream();long end=System.currentTimeMillis()+15000;
  while(System.currentTimeMillis()<end){int c=in.read();if(c<0)throw new IOException("Conexão encerrada");
   if(c==255){int op=in.read();if(op>=251&&op<=254){int opt=in.read();if(op==253||op==251){out.write(new byte[]{(byte)255,(byte)(op==253?252:254),(byte)opt});out.flush();}}continue;}
   b.write(c);if(b.size()>32768)throw new IOException("Resposta inválida da TV");String s=b.toString("UTF-8");if(marker==null?s.endsWith("# "):s.contains("\n"+marker+"\r")||s.contains("\n"+marker+"\n"))return s;
  }throw new IOException("A TV não respondeu");
 }
 static void authorize(Main a,String host)throws Exception{
  if(!InetAddress.getByName(host).isSiteLocalAddress())throw new IOException("Informe o IP local da sua TV");
  String saved=LgSetup.read(a,"root-private:"+host);KeyPair pair;
  if(saved.isEmpty()){pair=KeyPair.genKeyPair(new JSch(),KeyPair.RSA,2048);ByteArrayOutputStream privateBytes=new ByteArrayOutputStream();pair.writePrivateKey(privateBytes);saved=privateBytes.toString("UTF-8");LgSetup.save(a,"root-private:"+host,saved);}else pair=KeyPair.load(new JSch(),saved.getBytes("UTF-8"),null);
  ByteArrayOutputStream pub=new ByteArrayOutputStream();pair.writePublicKey(pub,"freedomtv-phone");pair.dispose();String publicKey=pub.toString("UTF-8").trim();if(!publicKey.matches("ssh-rsa [A-Za-z0-9+/=]+ freedomtv-phone"))throw new IOException("Chave inválida");
  try(Socket socket=new Socket()){socket.connect(new InetSocketAddress(host,23),5000);socket.setSoTimeout(15000);InputStream in=socket.getInputStream();OutputStream out=socket.getOutputStream();read(in,out,null);
   out.write("if [ \"$(id -u)\" = 0 ] && [ -d /media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service ]; then printf '\\nFTV_ROOT_OK\\n'; else printf '\\nFTV_ROOT_NO\\n'; fi\n".getBytes("UTF-8"));out.flush();String verified=read(in,out,null);if(!verified.contains("\nFTV_ROOT_OK"))throw new IOException("Root e Homebrew não confirmados");
   String cmd="umask 077; mkdir -p /home/root/.ssh && chmod 700 /home/root/.ssh && touch /home/root/.ssh/authorized_keys && (grep -qxF '"+publicKey+"' /home/root/.ssh/authorized_keys || echo '"+publicKey+"' >> /home/root/.ssh/authorized_keys) && chmod 600 /home/root/.ssh/authorized_keys && printf '\\nFTV_KEY_OK\\n'\n";
   out.write(cmd.getBytes("UTF-8"));out.flush();String response=read(in,out,null);if(!response.contains("\nFTV_KEY_OK"))throw new IOException("Não foi possível autorizar este celular");out.write("exit\n".getBytes("UTF-8"));out.flush();
  }
 }
}
