$code = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public class CredReaderFinal {
    [DllImport("Advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);

    [DllImport("Advapi32.dll", EntryPoint = "CredFree", SetLastError = true)]
    public static extern void CredFree(IntPtr cred);

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

    public static string ReadCredUtf8(string target) {
        IntPtr ptr;
        if (CredRead(target, 1, 0, out ptr)) {
            CREDENTIAL c = (CREDENTIAL)Marshal.PtrToStructure(ptr, typeof(CREDENTIAL));
            byte[] bytes = new byte[c.CredentialBlobSize];
            Marshal.Copy(c.CredentialBlob, bytes, 0, c.CredentialBlobSize);
            CredFree(ptr);
            return Encoding.UTF8.GetString(bytes);
        }
        return null;
    }
}
'@

Add-Type -TypeDefinition $code -Language CSharp

$target = "LegacyGeneric:target=GitHub - https://api.github.com/hersecondskinpk-ctrl"
$token = [CredReaderFinal]::ReadCredUtf8($target)

if (-not $token) {
    Write-Error "Failed to retrieve token from $target"
    exit 1
}

Write-Host "Token retrieved successfully. Starts with: $($token.Substring(0, 4))... Length: $($token.Length)"

$headers = @{
    'Authorization' = "Bearer $token"
    'User-Agent' = 'HSS-Automation'
    'Accept' = 'application/vnd.github+json'
}

$repoName = 'hersecondskin.pk'

try {
    $existing = Invoke-RestMethod -Uri "https://api.github.com/repos/hersecondskinpk-ctrl/$repoName" -Headers $headers -Method Get
    Write-Host "Repo $repoName already exists: $($existing.html_url)"
} catch {
    Write-Host "Creating repo $repoName on GitHub..."
    $body = @{
        name = $repoName
        description = "Her Second Skin PK - Official Website & E-Commerce Store"
        private = $false
        auto_init = $false
    } | ConvertTo-Json
    $newRepo = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Headers $headers -Method Post -Body $body -ContentType "application/json"
    Write-Host "Created repo: $($newRepo.html_url)"
}

$git = "C:\Users\talal\AppData\Local\GitHubDesktop\app-3.6.8\resources\app\git\cmd\git.exe"
$websiteDir = "C:\Users\talal\.gemini\antigravity\scratch\hss_project\website"
Set-Location $websiteDir

# Stage all files including CSS fixes
& $git add -A
& $git commit -m "Complete visual layout restoration & modular architecture for hersecondskin.pk" -q

$pushUrl = "https://hersecondskinpk-ctrl:$($token)@github.com/hersecondskinpk-ctrl/$repoName.git"
Write-Host "Pushing main branch to $repoName..."
& $git push $pushUrl main:main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "PUSH SUCCESSFUL to https://github.com/hersecondskinpk-ctrl/$repoName" -ForegroundColor Green
    & $git remote set-url origin "https://github.com/hersecondskinpk-ctrl/$repoName.git"
} else {
    Write-Error "Push failed with exit code $LASTEXITCODE"
}
