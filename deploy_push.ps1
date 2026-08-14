<#
Usage: .\deploy_push.ps1 -RepoUrl "https://github.com/OWNER/REPO.git" -Branch "ozarkroosts-monetize-ozark-roost"

This script configures the 'origin' remote (if missing) and pushes the current branch to the provided remote.
If your Git host requires a token, provide it via your credential helper or embed it in the RepoUrl (not recommended).
#>
param(
  [Parameter(Mandatory=$true)][string]$RepoUrl,
  [string]$Branch = 'ozarkroosts-monetize-ozark-roost'
)
n# ensure running from repo rootnSet-Location -Path $PSScriptRootnn# add origin if missingn$remotes = git remotenif (-not $remotes.Contains('origin')) {
  Write-Host "Adding origin -> $RepoUrl"
  git remote add origin $RepoUrln} else {
  Write-Host "Origin exists. Setting URL to $RepoUrl"
  git remote set-url origin $RepoUrln}
nWrite-Host "Pushing branch $Branch to origin"ngit push --set-upstream origin $Branch
nif ($LASTEXITCODE -ne 0) { Write-Error "Push failed. Check credentials and remote URL." ; exit $LASTEXITCODE }
Write-Host "Push succeeded. Open a PR on GitHub to merge to main/master and Pages will deploy."