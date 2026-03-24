@echo off
echo Iniciando Aplicacion de Compras...
echo (Versión para PC y Celulares en el mismo WiFi)
cd /d %~dp0

if not exist node_modules (
    echo Instalando dependencias por primera vez...
    call npm install
)

echo Abriendo servidor local...
:: --host permite que los celulares vean la app
:: --open abre el buscador en la PC automaticamente
call npx vite --host --open
pause
