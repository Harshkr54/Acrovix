$envContent = Get-Content .env
foreach ($line in $envContent) {
    if ($line -match '^\s*([^#\s=]+)\s*=\s*(.*)$') {
        $k = $matches[1].Trim()
        $v = $matches[2].Trim()
        Set-Item -Path "env:\$k" -Value $v
    }
}
mvn spring-boot:run
