#!/bin/sh

echo "========================================="
echo "Alpine musl glibc Uyumluluk Testi"
echo "========================================="
echo ""

# Test 1: Node.js Version
echo "1. Node.js Versiyonu:"
node --version
if [ $? -eq 0 ]; then
  echo "✓ Node.js çalışıyor"
else
  echo "✗ Node.js çalışmıyor"
  exit 1
fi
echo ""

# Test 2: npm Version
echo "2. npm Versiyonu:"
npm --version
if [ $? -eq 0 ]; then
  echo "✓ npm çalışıyor"
else
  echo "✗ npm çalışmıyor"
  exit 1
fi
echo ""

# Test 3: glibc Binary Check
echo "3. glibc Kontrolü:"
if [ -f /lib/libc.so.6 ]; then
  echo "✓ glibc yüklü (glibc tabanlı sistem)"
  ldd --version
elif [ -f /lib/ld-musl-x86_64.so.1 ]; then
  echo "✓ musl libc yüklü (Alpine)"
  /lib/ld-musl-x86_64.so.1 --version
else
  echo "⚠ libc bulunamadı"
fi
echo ""

# Test 4: Build Tools Check
echo "4. Build Tools Kontrolü:"
if command -v python3 >/dev/null 2>&1; then
  echo "✓ Python3 yüklü"
else
  echo "✗ Python3 bulunamadı"
fi

if command -v g++ >/dev/null 2>&1; then
  echo "✓ g++ yüklü"
else
  echo "✗ g++ bulunamadı"
fi

if command -v make >/dev/null 2>&1; then
  echo "✓ make yüklü"
else
  echo "✗ make bulunamadı"
fi
echo ""

# Test 5: Native Module Build Test
echo "5. Native Module Build Testi:"
mkdir -p /tmp/test-build
cd /tmp/test-build
npm init -y >/dev/null 2>&1
npm install bcrypt 2>&1 | grep -q "added" && echo "✓ Native modül derlendi (bcrypt)" || echo "✗ Native modül derlemesi başarısız"
cd - >/dev/null
rm -rf /tmp/test-build
echo ""

# Test 6: OpenTelemetry Check
echo "6. OpenTelemetry Paketleri:"
if [ -d node_modules/@opentelemetry ]; then
  echo "✓ OpenTelemetry paketleri yüklü"
  ls node_modules/@opentelemetry | head -5
else
  echo "⚠ OpenTelemetry paketleri yok (npm install gerekiyor)"
fi
echo ""

# Test 7: Memory and Limits
echo "7. Sistem Kaynakları:"
echo "Memory: $(free -h | grep Mem | awk '{print $2}')"
echo "CPU Cores: $(nproc)"
echo "Disk Space: $(df -h / | tail -1 | awk '{print $4}')"
echo ""

# Test 8: Docker Environment
echo "8. Docker Environment:"
if [ -f /.dockerenv ]; then
  echo "✓ Docker container içinde çalışıyor"
else
  echo "⚠ Native ortamda çalışıyor"
fi
echo ""

echo "========================================="
echo "Test Tamamlandı!"
echo "========================================="
