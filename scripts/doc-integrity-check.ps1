# DOKÜMAN BÜTÜNLÜK KONTROL SCRIPTİ
# Version: 2.0
# Tarih: 2025-10-27

$requiredDocs = @(
    "docs/RAPORLAR/TEKNIK_RAPORLAR.md",
    "docs/EKSIKLER/AKTIF_EKSIKLER.md",
    "docs/TAMAMLAMA/MODUL_TAMAMLAMA.md",
    "docs/RAPORLAR/OZELLIK_PLANI.md",
    "SECURITY_IMPLEMENTATION_README.md"
)

foreach ($doc in $requiredDocs) {
    if (-not (Test-Path $doc)) {
        Write-Warning "KRİTİK: $doc dosyası eksik!"
    }
    elseif ((Get-Item $doc).LastWriteTime -lt (Get-Date).AddDays(-14)) {
        Write-Warning "UYARI: $doc 14 günden eski! Lütfen güncelleyin."
    }
}

Write-Host "Doküman kontrolü tamamlandı." -ForegroundColor Green
