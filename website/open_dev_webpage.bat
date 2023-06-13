 for /F "tokens=2 delims=:" %%i in ('"ipconfig | findstr IP | findstr 192."') do SET LOCAL_IP=%%i

set LOCAL_IP=%LOCAL_IP: =%
start "" "http://%LOCAL_IP%:8000"