package br.twbstudio.instalador;

import java.io.*;
import java.net.*;
import org.json.JSONObject;

/** Read-only diagnostics. No privilege-changing commands are issued here. */
final class SamsungRoot {
  static JSONObject read(String host, int port, String path) throws Exception {
    if (!host.matches("[0-9]{1,3}(\\.[0-9]{1,3}){3}") || !InetAddress.getByName(host).isSiteLocalAddress())
      throw new IOException("Informe o IPv4 local da TV Samsung.");
    HttpURLConnection connection = (HttpURLConnection)new URL("http://"+host+":"+port+path).openConnection();
    connection.setInstanceFollowRedirects(false);
    connection.setConnectTimeout(5000); connection.setReadTimeout(5000);
    try {
      if(connection.getResponseCode()!=200) throw new IOException("A TV não autorizou a consulta ou não respondeu.");
      ByteArrayOutputStream bytes=new ByteArrayOutputStream();
      try(InputStream input=connection.getInputStream()) {
        byte[] buffer=new byte[4096]; int length;
        while((length=input.read(buffer))!=-1) {
          if(bytes.size()+length>262144) throw new IOException("Resposta da TV fora do limite.");
          bytes.write(buffer,0,length);
        }
      }
      return new JSONObject(bytes.toString("UTF-8"));
    } finally { connection.disconnect(); }
  }
  static String inspect(String host) throws Exception {
    JSONObject device=read(host,8001,"/api/v2/").optJSONObject("device");
    if(device==null || !"Tizen".equalsIgnoreCase(device.optString("OS")))
      throw new IOException("Não foi possível identificar uma TV Tizen. Nenhuma alteração realizada.");
    String firmware=device.optString("firmwareVersion","Unknown");
    String result="TV: "+device.optString("modelName","Não identificado")+"\nFirmware: "+
      ("Unknown".equalsIgnoreCase(firmware)?"não informado pela TV":firmware)+"\n\n";
    try {
      JSONObject state=read(host,8099,"/status");
      JSONObject agent=state.optJSONObject("agent"), rooting=state.optJSONObject("rooting");
      if(!"tv-integration".equals(state.optString("mode"))) result+="O auxiliar não possui a integração de root.\n";
      else if(agent!=null && agent.optBoolean("connected",false)) result+="O auxiliar informa uma conexão privilegiada ativa. Ainda falta validar Home, reinicialização e restauração.\n";
      else {
        result+="Root não confirmado.\n";
        JSONObject failure=rooting==null?null:rooting.optJSONObject("failure");
        if(failure!=null && "sdb-handshake".equals(failure.optString("stage")))
          result+="O auxiliar não conseguiu se conectar ao serviço de desenvolvimento da própria TV.\n";
        else result+="O auxiliar está presente, mas ainda não confirmou o acesso.\n";
      }
    } catch(Exception unavailable) { result+="Não foi possível verificar o auxiliar de root.\n"; }
    return result+"\nInstalação automática ainda indisponível: faltam a assinatura por TV e a validação do método neste modelo e firmware. Nenhuma configuração foi alterada por esta consulta.";
  }
}
