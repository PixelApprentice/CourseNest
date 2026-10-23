# CourseNest Desktop 🖥️

> **High-Performance, Private, Air-Gapped Desktop Learning Studio for Windows, Linux & macOS**

CourseNest Desktop packages the React 19 learning studio with sandboxed Chromium, high-throughput SQLite WAL storage, hardware acceleration, and native filesystem integration.

---

## 🔏 Windows Code-Signing Guide (EV / OV & Self-Signed Trust)

### ❓ What Causes the Windows SmartScreen Warning?
When an `.exe` installer is downloaded on Windows, Microsoft Defender SmartScreen checks the digital signature:
1. **Unsigned**: Shows *"Windows protected your PC: Microsoft Defender SmartScreen prevented an unrecognized app from starting. Publisher: Unknown publisher."*
2. **Standard OV (Organization Validation)**: Displays your verified organization name (`Publisher: CourseNest Open Source Project`). SmartScreen reputation builds naturally over time as users install the application.
3. **EV (Extended Validation) / Azure Trusted Signing**: Provides **instant SmartScreen reputation** from day one with **zero warning dialogs**.
4. **Self-Signed with Installed Root Trust (Air-Gapped & University Labs)**: When the public root certificate is installed into the Windows Certificate Store, Windows treats your installer as 100% verified and safe, bypassing SmartScreen without commercial certificate fees.

---

### Option 1: Modern Cloud EV Signing (Microsoft Azure Trusted Signing)
*Recommended for production releases ($9.99/month, no physical USB hardware tokens).*

1. Set up an Azure Trusted Signing account in the Azure Portal.
2. In your CI/CD or local environment, set the following variables:
   ```bash
   export AZURE_TRUSTED_SIGNING_ENDPOINT="https://eus.codesigning.azure.net"
   export AZURE_TRUSTED_SIGNING_PROFILE="CourseNestReleaseProfile"
   ```
3. Run the Windows build:
   ```bash
   pnpm --filter @coursenest/desktop dist:win
   ```
   *The custom signer hook in `scripts/windows-sign.cjs` will automatically invoke Microsoft Azure Trusted Signing to digitally sign all binaries with EV level trust.*

---

### Option 2: Commercial OV Certificate (.pfx / .p12)
*For certificates purchased from DigiCert, Sectigo, or GlobalSign.*

1. Place your `.pfx` file in a secure location (e.g. `certs/my_cert.pfx`).
2. Set the environment variables:
   ```bash
   export CSC_LINK="/path/to/my_cert.pfx"
   export CSC_KEY_PASSWORD="YourCertificatePassword"
   export RFC3161_TIMESTAMP_SERVER="http://timestamp.digicert.com"
   ```
3. Run the Windows build:
   ```bash
   pnpm --filter @coursenest/desktop dist:win
   ```

---

### Option 3: Free Air-Gapped / University Lab Root Trust (Zero SmartScreen Warnings)
*Ideal for educational institutions, school computer labs, internal testing, and offline deployments.*

#### Step 1: Generate the 4096-bit Code Signing Certificate Bundle
```bash
# Generates certs/coursenest_codesign.pfx and certs/coursenest_codesign.cer
./scripts/generate_windows_cert.sh [optional_password]
```

#### Step 2: Build the Signed Windows Executables
```bash
CSC_LINK="certs/coursenest_codesign.pfx" \
CSC_KEY_PASSWORD="coursenest123" \
pnpm --filter @coursenest/desktop dist:win
```

#### Step 3: Install Public Trust on Windows Machines (One-Click)
On any Windows machine or across a school lab network, run the PowerShell installer:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\install_windows_cert.ps1
```
*This imports the public certificate into `Cert:\LocalMachine\Root` and `Cert:\LocalMachine\TrustedPublisher`. Once installed, Windows Defender SmartScreen instantly recognizes CourseNest as trusted and safe.*

---

## 🛠️ Desktop Build Commands

```bash
# 1. Dev Mode with Hot Reload
pnpm --filter @coursenest/desktop dev

# 2. Compile TypeScript & bundle renderer
pnpm --filter @coursenest/desktop build

# 3. Build Windows Executables (.exe Setup & Portable)
pnpm --filter @coursenest/desktop dist:win

# 4. Build Linux Packages (.AppImage & .deb)
pnpm --filter @coursenest/desktop dist:linux
```
