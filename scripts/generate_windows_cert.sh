#!/usr/bin/env bash
# ==============================================================================
# CourseNest — Windows Code-Signing Certificate Generator (RSA 4096-bit)
# ==============================================================================
# This script creates an air-gapped, high-security Code-Signing Certificate
# with Code Signing EKU (1.3.6.1.5.5.7.3.3) for signing Windows .exe installers.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CERTS_DIR="${ROOT_DIR}/certs"

mkdir -p "${CERTS_DIR}"

KEY_FILE="${CERTS_DIR}/coursenest_codesign.key"
CRT_FILE="${CERTS_DIR}/coursenest_codesign.crt"
CER_FILE="${CERTS_DIR}/coursenest_codesign.cer"
PFX_FILE="${CERTS_DIR}/coursenest_codesign.pfx"
CONFIG_FILE="${CERTS_DIR}/openssl_codesign.cnf"

CERT_PASS="${1:-coursenest123}"
DAYS_VALID=1825 # 5 years

echo "======================================================================"
echo "  CourseNest: Generating Windows Code-Signing Certificate (4096-bit)  "
echo "======================================================================"

cat > "${CONFIG_FILE}" <<EOF
[ req ]
default_bits        = 4096
default_md          = sha256
distinguished_name  = req_distinguished_name
x509_extensions     = v3_codesign
prompt              = no

[ req_distinguished_name ]
C                   = US
ST                  = California
L                   = San Francisco
O                   = CourseNest Open Source Project
OU                  = Engineering & Release Security
CN                  = CourseNest Software Publisher

[ v3_codesign ]
basicConstraints    = critical, CA:TRUE
keyUsage            = critical, digitalSignature, keyCertSign, cRLSign
extendedKeyUsage    = critical, codeSigning
subjectKeyIdentifier= hash
EOF

# 1. Generate RSA 4096 Private Key and Self-Signed Certificate
echo "[1/4] Generating RSA 4096 Private Key & Certificate..."
openssl req -x509 -nodes -days "${DAYS_VALID}" \
  -config "${CONFIG_FILE}" \
  -newkey rsa:4096 \
  -keyout "${KEY_FILE}" \
  -out "${CRT_FILE}"

# 2. Export Public Certificate as DER (.cer) for Windows Certificate Store
echo "[2/4] Exporting Public Certificate (.cer) for Windows Certificate Store..."
openssl x509 -in "${CRT_FILE}" -outform DER -out "${CER_FILE}"

# 3. Export Private Key + Certificate as PKCS#12 (.pfx) bundle for Electron Builder
echo "[3/4] Exporting PKCS#12 (.pfx) Code-Signing bundle..."
openssl pkcs12 -export \
  -in "${CRT_FILE}" \
  -inkey "${KEY_FILE}" \
  -out "${PFX_FILE}" \
  -name "CourseNest Software Publisher" \
  -passout "pass:${CERT_PASS}"

# 4. Clean temporary config
rm -f "${CONFIG_FILE}"

echo "[4/4] Verifying generated certificate properties..."
openssl pkcs12 -info -in "${PFX_FILE}" -passin "pass:${CERT_PASS}" -noout

echo "======================================================================"
echo "  Code-Signing Certificate Generated Successfully!                     "
echo "======================================================================"
echo "  Private Bundle (.pfx): ${PFX_FILE}"
echo "  Public Root (.cer):    ${CER_FILE}"
echo "  Bundle Password:       ${CERT_PASS}"
echo ""
echo "  To build a signed Windows executable with electron-builder:"
echo "    CSC_LINK=\"${PFX_FILE}\" CSC_KEY_PASSWORD=\"${CERT_PASS}\" pnpm --filter @coursenest/desktop dist:win"
echo ""
echo "  To install public certificate on Windows (removes SmartScreen warning):"
echo "    powershell -ExecutionPolicy Bypass -File scripts/install_windows_cert.ps1"
echo "======================================================================"
