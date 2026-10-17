@echo off
for /F "eol=# delims== tokens=1,*" %%i in (.env) do (
    set "%%i=%%j"
)
java -jar target\admin-backend-0.0.1-SNAPSHOT.jar
