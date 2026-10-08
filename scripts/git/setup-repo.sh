#!/usr/bin/env bash
# Réglages GitHub requis par la fusion automatique. À lancer une fois, par le propriétaire du dépôt.
# Il modifie les réglages et la protection de master : relire avant d'exécuter.
#
# Usage : scripts/git/setup-repo.sh [--dry-run]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1

require_tools
goto_repo_root
REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"

run() {
  if [ "$DRY" -eq 1 ]; then printf '[dry-run] %s\n' "$*"; else "$@"; fi
}

info "Dépôt : $REPO"
run gh api -X PATCH "repos/$REPO" \
  -F allow_auto_merge=true -F delete_branch_on_merge=true \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false >/dev/null

# Porte QA : le contrôle "verify" (CI) est requis ; aucune approbation humaine exigée ;
# enforce_admins=false laisse le propriétaire pousser sur master (documentation, planification).
run gh api -X PUT "repos/$REPO/branches/$BASE_BRANCH/protection" --input - >/dev/null <<'JSON'
{
  "required_status_checks": { "strict": false, "contexts": ["verify"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
info "Réglages appliqués."
