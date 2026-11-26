# Monta o app Android do Freedom TV (Windows).
# Precisa: JDK (ex.: o "jbr" do Android Studio), Android SDK (build-tools 36 e platform android-36) e o JSch 0.1.54 (.jar).
# Uso: .\ferramentas\montar-apk.ps1 -Jdk "C:\...\jbr\bin" -Sdk "C:\...\Android\Sdk" -Jsch "C:\...\jsch-0.1.54.jar" -Keystore "minha-chave.jks"
param(
  [Parameter(Mandatory)] [string]$Jdk,
  [Parameter(Mandatory)] [string]$Sdk,
  [Parameter(Mandatory)] [string]$Jsch,
  [Parameter(Mandatory)] [string]$Keystore,
  [string]$Saida = "FreedomTV.apk"
)
$ErrorActionPreference = 'Stop'
$bt = "$Sdk\build-tools\36.0.0"
$aj = "$Sdk\platforms\android-36\android.jar"
$src = Join-Path $PSScriptRoot '..\android' | Resolve-Path
$tmp = Join-Path $env:TEMP "freedomtv-build"
function Check($n) { if ($LASTEXITCODE -ne 0) { throw "$n falhou ($LASTEXITCODE)" } else { "$n ok" } }
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
New-Item -ItemType Directory "$tmp\classes", "$tmp\dex" | Out-Null
# --release 8 com android.jar no classpath (com -bootclasspath a lambda do Main.java não compila)
& "$Jdk\javac.exe" -encoding UTF-8 --release 8 -nowarn -cp "$aj;$Jsch" -d "$tmp\classes" (Get-ChildItem "$src\*.java").FullName; Check javac
& "$Jdk\jar.exe" cf "$tmp\app.jar" -C "$tmp\classes" .; Check jar
$env:JAVA_HOME = Split-Path $Jdk
& "$bt\d8.bat" --min-api 26 --lib $aj --output "$tmp\dex" "$tmp\app.jar" $Jsch; Check d8
& "$bt\aapt2.exe" compile --dir "$src\res" -o "$tmp\res.zip"; Check aapt2compile
& "$bt\aapt2.exe" link -o "$tmp\raw.apk" -I $aj --manifest "$src\AndroidManifest.xml" -A "$src\assets" "$tmp\res.zip"; Check aapt2link
Push-Location "$tmp\dex"; & "$bt\aapt.exe" add "$tmp\raw.apk" classes.dex; Pop-Location; Check aaptadd
& "$bt\zipalign.exe" -f 4 "$tmp\raw.apk" "$tmp\aligned.apk"; Check zipalign
& "$bt\apksigner.bat" sign --ks $Keystore --out $Saida "$tmp\aligned.apk"; Check sign
& "$bt\apksigner.bat" verify $Saida; Check verify
