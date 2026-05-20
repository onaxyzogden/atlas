# PowerShell sibling of scripts/git-hooks/pre-push. Git's Windows shim
# honours core.hooksPath and runs the POSIX hook via sh.exe; this .ps1
# is a manual fallback for environments without git-bash.
#
# Refuses any push that deletes wiki/log/*.md files relative to the
# upstream branch. See wiki/concepts/parallel-session-coordination.md.

$ErrorActionPreference = 'Stop'

try {
  $upstream = git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null
} catch {
  exit 0
}
if (-not $upstream) { exit 0 }

$parts = $upstream -split '/', 2
$remoteName = $parts[0]
$remoteBranch = $parts[1]

git fetch -q $remoteName $remoteBranch 2>$null | Out-Null

$dropped = git diff --diff-filter=D --name-only "$upstream...HEAD" -- wiki/log/

if ($dropped) {
  Write-Error @"
pre-push: REFUSED - this push deletes wiki/log/ entries:

$($dropped -join "`n  ")

Per-day log files are append-only (see
wiki/concepts/parallel-session-coordination.md). To restore:

$(($dropped | ForEach-Object { "  git checkout $upstream -- $_" }) -join "`n")

Then commit the restoration and push again.
"@
  exit 1
}

exit 0
