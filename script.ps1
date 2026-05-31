$headers = @{
    "Authorization" = "token YOUR_GITHUB_PERSONAL_ACCESS_TOKEN"
    "Accept" = "application/vnd.github.v3+json"
}
$body = @{
    "name" = "csr-complete-backend"
    "private" = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json"
