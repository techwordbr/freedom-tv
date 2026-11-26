# Freedom TV

Temas novos para a tela inicial da **Smart TV LG (webOS)**, instalados por um aplicativo no **celular Android**.

Com o Freedom TV, o botão **Home** e o **ligar da TV** abrem o tema que você escolheu no lugar do menu da LG. Dá para:

- organizar os aplicativos e fixar favoritos;
- mudar o papel de parede;
- desinstalar aplicativos direto pelo tema (segure **OK** sobre o app);
- ver o Wi-Fi e os ajustes rápidos.

## Baixar

Baixe o aplicativo do celular (`.apk`) na página de **[Releases](../../releases/latest)**.

## Como usar

1. Na TV LG, instale o app **Developer Mode** (na loja da LG), entre com a sua conta de desenvolvedor da LG e ligue o **Dev Mode Status**.
2. No celular Android, instale o `.apk` (permita "instalar apps de fontes desconhecidas").
3. Celular e TV precisam estar **no mesmo Wi-Fi**. Abra o Freedom TV no celular, encontre a TV, escolha o tema e aperte **Instalar**.

### TV sem root

- Tudo funciona pelo Modo Desenvolvedor da LG. Ao apertar Home, a TV mostra o menu da LG por um instante e logo abre o tema.
- **O Modo Desenvolvedor vence de tempos em tempos.** Quando vence, a LG apaga o Freedom TV da TV. O tema avisa quando faltam 7 dias ou menos. Aí é só abrir o app *Developer Mode* e apertar **Extend** para renovar.
- Para desinstalar um aplicativo, o tema abre a tela **Gerenciar aplicativos** da LG, onde você confirma na lixeira.

### TV com root (opcional)

Com root (Homebrew Channel), o tema abre direto, sem passar pelo menu da LG, e não é preciso renovar o Modo Desenvolvedor.

**Atenção:** fazer root é por sua conta e risco. Pode não funcionar em todas as versões e mexe no sistema da TV.

## Como montar a partir do código

- **Tema da TV** (`tv/`): use o [webOS CLI](https://github.com/webos-tools/cli):
  `ares-package tv/webos tv/icon-service`
  Copie o `.ipk` gerado para `android/assets/studio.ipk` e a versão (de `tv/webos/appinfo.json`) para `android/assets/studio-version.txt`.
- **App do celular** (`android/`): veja `ferramentas/montar-apk.ps1` (Windows, Android SDK e JDK). Se o Windows bloquear scripts, rode com `powershell -ExecutionPolicy Bypass -File ferramentas\montar-apk.ps1 ...`.

## Licença

Freedom TV © Augusto Ramos. Licença **[CC BY-NC-SA 4.0](LICENSE)**:

- **Crédito obrigatório:** quem usar ou mudar precisa citar o Freedom TV e o autor, com o link deste repositório.
- **Grátis:** não é permitido vender nem usar para ganhar dinheiro.
- **Mesma regra:** versões modificadas precisam ser liberadas com esta mesma licença.

Partes de outros autores mantêm as licenças deles. Veja [CREDITOS.md](CREDITOS.md).

LG, webOS, Samsung e Google são marcas de seus donos. Este projeto não tem ligação com essas empresas.
