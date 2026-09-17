$envContent = Get-Content .env
foreach ($line in $envContent) {
    if ($line -match '^([^#\s]+?)=(.*)$') {
        Set-Item -Path "env:\$($matches[1])" -Value $matches[2]
    }
}
mvn spring-boot:run
