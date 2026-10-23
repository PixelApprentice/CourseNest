<#
.SYNOPSIS
    Installs the CourseNest Code-Signing Certificate into the Windows Certificate Store.
.DESCRIPTION
    This script imports the public CourseNest Code-Signing Certificate (.cer) into
    the "Trusted Root Certification Authorities" and "Trusted Publishers" certificate
    stores. Once installed, Windows SmartScreen and Windows Defender will recognize
    CourseNest installers as verified and trusted, completely bypassing the
    "Unknown Publisher" SmartScreen prompt.
.PARAMETER CertFile
    Path to the public certificate (.cer). Defaults to certs\coursenest_codesign.cer.
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\install_windows_cert.ps1
#>

[CmdletBinding()]
param(
    [string]$CertFile = "$PSScriptRoot\..\certs\coursenest_codesign.cer"
)

# 1. Ensure Administrator Privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Elevating privileges to install certificate into LocalMachine store..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" `"$CertFile`"" -Verb RunAs
    exit
}

# 2. Verify Certificate File Exists
$resolvedCertPath = [System.IO.Path]::GetFullPath($CertFile)
if (-not (Test-Path $resolvedCertPath)) {
    Write-Error "Certificate file not found at: $resolvedCertPath"
    Write-Host "Run './scripts/generate_windows_cert.sh' to generate the certificate bundle first." -ForegroundColor Red
    exit 1
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  CourseNest: Installing Windows Code-Signing Trust Certificate      " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Certificate Source: $resolvedCertPath" -ForegroundColor Gray

try {
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($resolvedCertPath)
    Write-Host "Subject:    $($cert.Subject)" -ForegroundColor White
    Write-Host "Issuer:     $($cert.Issuer)" -ForegroundColor White
    Write-Host "Thumbprint: $($cert.Thumbprint)" -ForegroundColor White
    Write-Host "Valid To:   $($cert.NotAfter.ToShortDateString())" -ForegroundColor White
    Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray

    # 3. Import to Trusted Root Certification Authorities (LocalMachine\Root)
    Write-Host "[1/2] Adding to 'Trusted Root Certification Authorities'..." -NoNewline
    $rootStore = New-Object System.Security.Cryptography.X509Certificates.X509Store([System.Security.Cryptography.X509Certificates.StoreName]::Root, [System.Security.Cryptography.X509Certificates.StoreLocation]::LocalMachine)
    $rootStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $rootStore.Add($cert)
    $rootStore.Close()
    Write-Host " [OK]" -ForegroundColor Green

    # 4. Import to Trusted Publishers (LocalMachine\TrustedPublisher)
    Write-Host "[2/2] Adding to 'Trusted Publishers'..." -NoNewline
    $pubStore = New-Object System.Security.Cryptography.X509Certificates.X509Store([System.Security.Cryptography.X509Certificates.StoreName]::TrustedPublisher, [System.Security.Cryptography.X509Certificates.StoreLocation]::LocalMachine)
    $pubStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $pubStore.Add($cert)
    $pubStore.Close()
    Write-Host " [OK]" -ForegroundColor Green

    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "  Success! CourseNest Certificate Installed and Fully Trusted.        " -ForegroundColor Green
    Write-Host "  Windows SmartScreen 'Unknown Publisher' warning will no longer show!" -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Cyan
}
catch {
    Write-Error "Failed to install certificate: $_"
    exit 1
}
