<#
  Removes GoatBar: stops it, removes the login entry and Start menu shortcut,
  and deletes %LOCALAPPDATA%\GoatBar. Hook entries you added to Claude Code /
  Codex settings are left for you to remove.
#>
$ErrorActionPreference = 'SilentlyContinue'
Get-Process GoatBar | Stop-Process -Force
Remove-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'GoatBar'
Remove-Item (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\GoatBar.lnk')
Start-Sleep -Milliseconds 500
Remove-Item (Join-Path $env:LOCALAPPDATA 'GoatBar') -Recurse -Force
Write-Host 'GoatBar removed.'
