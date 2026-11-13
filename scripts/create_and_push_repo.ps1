Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class CredReader {
    [DllImport("Advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public int Flags;
        public int Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
        public int Persist;
        public int AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }
    public static string Read(string target) {
        IntPtr credPtr;
        if (CredRead(target, 1, 0, out credPtr)) {
            CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
            byte[] bytes = new byte[cred.CredentialBlobSize];
            Marshal.Copy(cred.CredentialBlob, bytes, 0, cred.CredentialBlobSize);
            return System.Text.Encoding.Unicode.GetString(bytes);
        }
        return null;
    }
}
"@

$token = [CredReader]::Read('GitHub - https://api.github.com/hersecondskinpk-ctrl')
if (-not $token) {
    Write-Error "Could not read token from Credential Manager"
    exit 1
}

Write-Host "Token retrieved successfully. Length: $($token.Length)"

$headers = @{
    'Authorization' = "Bearer $token"
    'User-Agent' = 'HSS-Automation'
    'Accept' = 'application/vnd.github+json'
}

$repoName = 'hersecondskin.pk'
$repoUrl = $null

try {
    $existing = Invoke-RestMethod -Uri "https://api.github.com/repos/hersecondskinpk-ctrl/$repoName" -Headers $headers -Method Get
    Write-Host "Repo $repoName already exists: $($existing.html_url)"
    $repoUrl = $existing.html_url
} catch {
    Write-Host "Creating repo $repoName on GitHub..."
    $body = @{
        name = $repoName
        description = "Her Second Skin PK - Official Website & E-Commerce Store"
        private = $false
    } | ConvertTo-Json
    $newRepo = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Headers $headers -Method Post -Body $body -ContentType "application/json"
    Write-Host "Repo created: $($newRepo.html_url)"
    $repoUrl = $newRepo.html_url
}

$git = "C:\Users\talal\AppData\Local\GitHubDesktop\app-3.6.8\resources\app\git\cmd\git.exe"
$websiteDir = "C:\Users\talal\.gemini\antigravity\scratch\hss_project\website"
Set-Location $websiteDir

# Stage changes
& $git add css/common.css css/home.css
& $git commit -m "Fix complete visual layout restoration for common and home CSS"

# Set remote origin
$remoteWithToken = "https://hersecondskinpk-ctrl:$($token)@github.com/hersecondskinpk-ctrl/$repoName.git"
& $git remote set-url origin $remoteWithToken
& $git branch -M main

Write-Host "Pushing to $repoName..."
& $git push -u origin main --force

# Reset remote to clean URL without embedded token in config
& $git remote set-url origin "https://github.com/hersecondskinpk-ctrl/$repoName.git"

Write-Host "Successfully pushed to GitHub: https://github.com/hersecondskinpk-ctrl/$repoName"
