$ErrorActionPreference = 'Continue'

# Proje dizinlerini recursive bul (node_modules hariç)
$projects = Get-ChildItem -Path . -Recurse -Filter package.json -File |
  Where-Object { $_.FullName -notmatch "\\node_modules\\" } |
  ForEach-Object { Split-Path $_.FullName -Parent } |
  Sort-Object -Unique

foreach ($p in $projects) {
  Write-Host "== $p ==" -ForegroundColor Cyan
  Push-Location $p
  try {
    $hasLock = Test-Path 'package-lock.json'
    if ($hasLock) {
      try {
        npm ci --no-audit --fund=false
      } catch {
        Write-Host "[UYARI] npm ci basarisiz, npm install --legacy-peer-deps ile devam ediliyor..." -ForegroundColor Yellow
        npm install --legacy-peer-deps --no-audit --fund=false
      }
    } else {
      npm install --legacy-peer-deps --no-audit --fund=false
    }

    # Güvenlik ve tekrar eden bağımlılık düzeltmeleri
    try { npm audit fix --audit-level=high } catch { Write-Host "[UYARI] npm audit fix uyarilari: $_" -ForegroundColor Yellow }
    try { npm dedupe } catch { Write-Host "[UYARI] npm dedupe uyarilari: $_" -ForegroundColor Yellow }
  } catch {
    Write-Host "[HATA] $p dizininde hata olustu: $_" -ForegroundColor Red
  } finally {
    Pop-Location
  }
}

Write-Host "`nTAMAMLANDI: Tum projelerde npm ci/install + audit fix + dedupe calistirildi." -ForegroundColor Green
