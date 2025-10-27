# DOKÜMAN TEMİZLEME VE YENİDEN YAPILANDIRMA SCRIPTİ
# Version: 1.0
# Tarih: 2025-10-27

# 1. GEREKSİZ DOSYALARI SİL
$silinecekDosyalar = @(
    "AYAZ_RAPOR_2025.txt",
    "AYAZ_TODOS_2025.txt",
    "AyazLogistics_Complete_Audit_Report.json",
    "AYAZLOGISTICS_ULTRA_DETAILED_2025_AUDIT.txt",
    "BACKEND_COMPLETION_REPORT.md",
    "FRONTEND_COMPLETION_REPORT.md",
    "DUZELTMELER_TAMAMLANDI.md",
    "EKSLER_TAMAMLANDI.md",
    "PROJECT_COMPLETION_SUMMARY.md",
    "SYSTEM_ANALYSIS_DETAILED_REPORT.md"
)

foreach ($dosya in $silinecekDosyalar) {
    if (Test-Path $dosya) {
        Remove-Item $dosya -Force
        Write-Host "Silindi: $dosya" -ForegroundColor Red
    }
}

# 2. DOKÜMAN YAPISINI OLUŞTUR
$dizinYapisi = @(
    "docs/RAPORLAR",
    "docs/EKSIKLER",
    "docs/TAMAMLAMA"
)

foreach ($dizin in $dizinYapisi) {
    if (-not (Test-Path $dizin)) {
        New-Item -ItemType Directory -Path $dizin -Force | Out-Null
        Write-Host "Oluşturuldu: $dizin" -ForegroundColor Green
    }
}

# 3. DOSYALARI YENİDEN ADLANDIR VE TAŞI
$yenidenAdlandir = @{
    "GERCEK_EKSIKLER.md" = "docs/EKSIKLER/AKTIF_EKSIKLER.md"
    "FRONTEND_EKSIKLER.md" = "docs/EKSIKLER/FRONTEND_GELISTIRMELER.md"
    "TAMAMLAMA_OZETI.md" = "docs/TAMAMLAMA/MODUL_TAMAMLAMA.md"
    "IYILESTIRME_RAPORU.md" = "docs/RAPORLAR/TEKNIK_RAPORLAR.md"
    "EKLEMESI_GEREKEN_OZELLIKLER.md" = "docs/RAPORLAR/OZELLIK_PLANI.md"
}

foreach ($eski in $yenidenAdlandir.Keys) {
    if (Test-Path $eski) {
        Move-Item $eski $yenidenAdlandir[$eski] -Force
        Write-Host "Taşındı: $eski -> $($yenidenAdlandir[$eski])" -ForegroundColor Yellow
    }
}

# 4. YENİ DOKÜMANLAR OLUŞTUR
$yeniDosyalar = @{
    "docs/RAPORLAR/HAFTALIK_DURUM.md" = "# Haftalık Proje Durum Raporu`n`n## Son Gelişmeler`n`n## Önümüzdeki Hafta Planları"
    "docs/EKSIKLER/ACIL_EKSIKLER.md" = "# Acil Eksiklikler`n`n## Kritik Öncelikli`n`n## Yüksek Öncelikli"
    "docs/TAMAMLAMA/ILERLEME_DURUMU.md" = "# Modül Tamamlama İlerlemesi`n`n| Modül | Tamamlanma | Durum |`n|-------|------------|-------|"
}

foreach ($dosya in $yeniDosyalar.Keys) {
    if (-not (Test-Path $dosya)) {
        Set-Content $dosya $yeniDosyalar[$dosya]
        Write-Host "Oluşturuldu: $dosya" -ForegroundColor Cyan
    }
}

# 5. DOKÜMAN BÜTÜNLÜK KONTROL SCRIPTİNİ GÜNCELLE
$docCheckScript = @'
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
'@

Set-Content -Path "scripts/doc-integrity-check.ps1" -Value $docCheckScript
Write-Host "Güncellendi: scripts/doc-integrity-check.ps1" -ForegroundColor Magenta

# 6. SONUÇ RAPORU
Write-Host "`nİŞLEM TAMAMLANDI" -ForegroundColor White -BackgroundColor DarkGreen
Write-Host "Toplam silinen dosya: $($silinecekDosyalar.Count)"
Write-Host "Yeni doküman yapısı oluşturuldu"
Write-Host "Doküman bütünlük kontrol scripti güncellendi"
