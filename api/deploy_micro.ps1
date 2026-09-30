# deploy_micro.ps1
Write-Host "Deleting current database..."
npx wrangler d1 delete seekids-db -y

Write-Host "Creating new database..."
$output = npx wrangler d1 create seekids-db
Write-Host $output

# Extract ID using RegEx
$id = [regex]::match($output, 'database_id": "([^"]+)"').Groups[1].Value
Write-Host "Extracted DB ID: $id"

# Update wrangler.json
$json = Get-Content -Raw "wrangler.json" | ConvertFrom-Json
$json.d1_databases[0].database_id = $id
$json | ConvertTo-Json -Depth 10 | Set-Content "wrangler.json"

Write-Host "Applying Schema..."
npx wrangler d1 execute seekids-db --remote --file="./schema.sql"

Write-Host "Applying Micro Chunks..."
1..74 | ForEach-Object {
    Write-Host "Executing micro chunk $_"
    npx wrangler d1 execute seekids-db --remote --file="./micro_chunk_$_.sql"
}

Write-Host "Deploying Worker..."
npx wrangler deploy
