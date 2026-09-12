@echo off
for /F "eol=# delims== tokens=1,2" %%i in (.env) do (
    set "%%i=%%j"
)
mvn spring-boot:run
