@echo off
cd ./dist
for /F "tokens=2 delims=:" %%i in ('"ipconfig | findstr IP | findstr 192."') do SET LOCAL_IP=%%i
python -m http.server --bind %LOCAL_IP%