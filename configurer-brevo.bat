@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul

title Configuration Brevo pour Voxa
cd /d "%~dp0"

echo =====================================================
echo           CONFIGURATION BREVO POUR VOXA
echo =====================================================
echo.
echo Ce programme va configurer le fichier prive .env.local.
echo La cle API ne sera pas ajoutee a GitHub.
echo.

if not exist "package.json" (
  echo [ERREUR] Ce fichier doit etre lance depuis le dossier du projet Voxa.
  pause
  exit /b 1
)

if not exist ".env.local" (
  if exist ".env.example" (
    copy /y ".env.example" ".env.local" >nul
    echo [OK] Fichier .env.local cree depuis .env.example.
  ) else (
    type nul > ".env.local"
    echo [OK] Fichier .env.local vide cree.
  )
)

echo Etape 1 sur 3 - Cle API Brevo
echo Elle commence normalement par xkeysib-.
set /p "BREVO_KEY=Collez la cle API Brevo : "
if not defined BREVO_KEY (
  echo [ERREUR] La cle API est obligatoire.
  pause
  exit /b 1
)

echo.
echo Etape 2 sur 3 - Adresse expediteur verifiee dans Brevo
set /p "BREVO_EMAIL=Adresse email verifiee : "
if not defined BREVO_EMAIL (
  echo [ERREUR] L'adresse email est obligatoire.
  pause
  exit /b 1
)

echo.
echo Etape 3 sur 3 - Adresse publique de l'application
echo Pour un test local, appuyez simplement sur Entree.
set /p "APP_URL=URL [http://localhost:3000] : "
if not defined APP_URL set "APP_URL=http://localhost:3000"

set "VOXA_BREVO_KEY=%BREVO_KEY%"
set "VOXA_BREVO_EMAIL=%BREVO_EMAIL%"
set "VOXA_APP_URL=%APP_URL%"
set "BREVO_KEY="

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$path=Join-Path (Get-Location) '.env.local';" ^
  "$content=if(Test-Path $path){[IO.File]::ReadAllText($path)}else{''};" ^
  "$values=[ordered]@{RESEND_API_KEY='';BREVO_API_KEY=$env:VOXA_BREVO_KEY;EMAIL_FROM=('Voxa <'+$env:VOXA_BREVO_EMAIL+'>');NEXT_PUBLIC_APP_URL=$env:VOXA_APP_URL};" ^
  "foreach($name in $values.Keys){$line=$name+'='+[char]34+$values[$name]+[char]34;$pattern='(?m)^'+[regex]::Escape($name)+'=.*$';if($content -match $pattern){$content=[regex]::Replace($content,$pattern,[System.Text.RegularExpressions.MatchEvaluator]{param($m)$line})}else{if($content.Length -gt 0 -and -not $content.EndsWith([Environment]::NewLine)){$content+=[Environment]::NewLine};$content+=$line+[Environment]::NewLine}};" ^
  "[IO.File]::WriteAllText($path,$content,(New-Object Text.UTF8Encoding($false)));"

if errorlevel 1 (
  echo.
  echo [ERREUR] La configuration n'a pas pu etre enregistree.
  set "VOXA_BREVO_KEY="
  pause
  exit /b 1
)

set "VOXA_BREVO_KEY="
set "VOXA_BREVO_EMAIL="
set "VOXA_APP_URL="

echo.
echo =====================================================
echo [OK] Brevo est configure dans .env.local.
echo =====================================================
echo.
echo Prochaine etape : redemarrez Voxa avec :
echo     npm run dev
echo.
echo Puis testez la page :
echo     http://localhost:3000/forgot-password
echo.
echo IMPORTANT : ne partagez jamais le fichier .env.local.
pause
endlocal
