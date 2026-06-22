param(
    [Parameter(Mandatory)] [string]$ApiKey
)

$endpoint = "https://varios-appwrite-techpadah.fjueze.easypanel.host/v1"
$databaseId = "6a30de0c001f63242bee"
$collections = @{
    "6a30def07be258c2fc52" = "loans"
    "6a30def1cf16a69d1da6" = "payments"
}

$headers = @{
    "X-Appwrite-Key" = $ApiKey
    "X-Appwrite-Project" = "prestamos"
    "Content-Type" = "application/json"
}

$body = @{
    name = "dummy"
    permissions = @(
        'create("users")',
        'read("users")', 
        'update("users")',
        'delete("users")'
    )
} | ConvertTo-Json

foreach ($collectionId in $collections.Keys) {
    $collectionName = $collections[$collectionId]
    Write-Host "Updating $collectionName collection..."
    
    $url = "$endpoint/databases/$databaseId/collections/$collectionId"
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Patch -Headers $headers -Body $body -SkipCertificateCheck
        Write-Host "  ✅ $collectionName updated"
    } catch {
        # Maybe PUT works instead
        try {
            $response = Invoke-RestMethod -Uri $url -Method Put -Headers $headers -Body $body -SkipCertificateCheck
            Write-Host "  ✅ $collectionName updated (PUT)"
        } catch {
            Write-Host "  ❌ Failed: $($_.Exception.Message)"
        }
    }
}

Write-Host "`nDone!"
