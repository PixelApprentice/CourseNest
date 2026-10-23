const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Custom Windows Code Signing Handler for CourseNest
 * 
 * Supports:
 * 1. Microsoft Windows SDK signtool.exe (when building on Windows or CI runners)
 * 2. Microsoft Azure Trusted Signing (modern cloud HSM, zero hardware tokens)
 * 3. OpenSSL / osslsigncode (when available on Linux/macOS)
 * 4. Java jsign (Authenticode signing on Linux/macOS/Windows)
 * 5. Turnkey Fallback: Skips with informative instructions if no certificate is provided.
 */
module.exports = async function (configuration) {
  const filePath = configuration.path;
  const certPath = process.env.CSC_LINK || process.env.WIN_CSC_LINK || configuration.options?.certificateFile;
  const certPassword = process.env.CSC_KEY_PASSWORD || process.env.WIN_CSC_KEY_PASSWORD || configuration.options?.certificatePassword;
  const timestampServer = process.env.RFC3161_TIMESTAMP_SERVER || 'http://timestamp.digicert.com';

  console.log(`\n🔏 [CodeSign] Inspecting binary for Windows Authenticode: ${path.basename(filePath)}`);

  // 1. Check if Azure Trusted Signing is configured (Modern EV Cloud Signing)
  if (process.env.AZURE_TRUSTED_SIGNING_ENDPOINT && process.env.AZURE_TRUSTED_SIGNING_PROFILE) {
    console.log('🛡️ [CodeSign] Signing with Microsoft Azure Trusted Signing (EV Cloud HSM)...');
    try {
      const azCommand = `Invoke-TrustedSigning -Endpoint "${process.env.AZURE_TRUSTED_SIGNING_ENDPOINT}" -CertificateProfileName "${process.env.AZURE_TRUSTED_SIGNING_PROFILE}" -FilePath "${filePath}" -TimestampServer "${timestampServer}"`;
      execSync(`pwsh -Command "${azCommand}"`, { stdio: 'inherit' });
      console.log('✅ [CodeSign] Successfully signed with Azure Trusted Signing.');
      return;
    } catch (err) {
      console.error('❌ [CodeSign] Azure Trusted Signing failed:', err.message);
      throw err;
    }
  }

  // 2. Check if a standard PFX / P12 certificate is provided (OV or Self-Signed)
  if (certPath && fs.existsSync(certPath)) {
    console.log(`🛡️ [CodeSign] Certificate detected at: ${certPath}`);

    // If on native Windows, use signtool.exe from Windows SDK
    if (process.platform === 'win32') {
      try {
        console.log('🔨 [CodeSign] Executing Windows SDK signtool.exe...');
        const passArg = certPassword ? `/p "${certPassword}"` : '';
        const signCmd = `signtool.exe sign /fd SHA256 /tr "${timestampServer}" /td SHA256 /f "${certPath}" ${passArg} "${filePath}"`;
        execSync(signCmd, { stdio: 'inherit' });
        console.log('✅ [CodeSign] Successfully signed with signtool.exe.');
        return;
      } catch (err) {
        console.error('❌ [CodeSign] signtool.exe signing failed:', err.message);
        throw err;
      }
    }

    // On Linux/macOS: Check if osslsigncode is installed
    try {
      execSync('which osslsigncode', { stdio: 'ignore' });
      console.log('🔨 [CodeSign] Signing via osslsigncode on Linux/macOS...');
      const tmpOut = `${filePath}.signed`;
      const passArg = certPassword ? `-pass "${certPassword}"` : '';
      const signCmd = `osslsigncode sign -pkcs12 "${certPath}" ${passArg} -h sha256 -t "${timestampServer}" -in "${filePath}" -out "${tmpOut}"`;
      execSync(signCmd, { stdio: 'inherit' });
      fs.renameSync(tmpOut, filePath);
      console.log('✅ [CodeSign] Successfully signed binary with osslsigncode.');
      return;
    } catch {
      // osslsigncode not available
    }

    // Check if jsign jar is available in scripts/ or tools/
    const jsignJar = path.resolve(__dirname, 'jsign.jar');
    if (fs.existsSync(jsignJar)) {
      try {
        console.log('🔨 [CodeSign] Signing via Java jsign Authenticode engine...');
        const passArg = certPassword ? `--storepass "${certPassword}"` : '';
        const jsignCmd = `java -jar "${jsignJar}" --keystore "${certPath}" ${passArg} --tsaurl "${timestampServer}" --tsmode RFC3161 "${filePath}"`;
        execSync(jsignCmd, { stdio: 'inherit' });
        console.log('✅ [CodeSign] Successfully signed binary with jsign.');
        return;
      } catch (err) {
        console.error('❌ [CodeSign] jsign execution failed:', err.message);
        throw err;
      }
    }

    console.warn('⚠️ [CodeSign] Certificate was found, but neither signtool.exe, osslsigncode, nor jsign are available on this host.');
    console.warn('             To complete signing, either run the build on a Windows machine/GitHub Actions runner, or install jsign/osslsigncode.');
    return;
  }

  // 3. Fallback: No certificate configured in environment
  console.log('ℹ️ [CodeSign] No Windows Code-Signing Certificate (CSC_LINK / WIN_CSC_LINK) provided.');
  console.log('             Binary generated with "asInvoker" user-mode manifest.');
  console.log('             See README.md for instructions on adding an EV / OV certificate or local self-signed root trust.');
};
