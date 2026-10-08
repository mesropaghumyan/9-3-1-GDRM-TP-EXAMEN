#!/usr/bin/env bash
# Termine une story : vérifie, pousse la branche et ouvre une pull request vers master.
# Active la fusion automatique (squash) : GitHub fusionne dès que la CI (job "verify", porte QA) est verte.
#
# Usage : scripts/git/finish-story.sh [--type feat|fix|test|refactor|docs|chore] [--draft] [--skip-verify]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

TYPE="feat"
DRAFT=0
SKIP_VERIFY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --type) TYPE="${2:-}"; shift 2 ;;
    --draft) DRAFT=1; shift ;;
    --skip-verify) SKIP_VERIFY=1; shift ;;
    *) die "option inconnue : $1" ;;
  esac
done
case "$TYPE" in feat|fix|test|refactor|docs|chore) ;; *) die "type invalide : $TYPE" ;; esac

require_tools
goto_repo_root

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[[ "$BRANCH" =~ ^feature/([0-9]+)-story-([0-9]+)-([0-9]+)- ]] \
  || die "la branche courante ($BRANCH) n'est pas une branche de story (feature/<issue>-story-N-M-…)"
NUMBER="${BASH_REMATCH[1]}"
STORY="${BASH_REMATCH[2]}.${BASH_REMATCH[3]}"

[ -z "$(git status --porcelain)" ] || die "arbre de travail non propre : commit d'abord"

git fetch origin "$BASE_BRANCH" --quiet
[ "$(git rev-list --count "origin/$BASE_BRANCH..HEAD")" -gt 0 ] || die "aucun commit en avance sur $BASE_BRANCH"

# Definition of Done de CLAUDE.md §5.1 : verify doit être vert avant la revue.
if [ "$SKIP_VERIFY" -eq 0 ] && [ -f package.json ]; then
  info "npm run verify…"
  npm run verify
elif [ ! -f package.json ]; then
  info "Pas de package.json : verify ignoré."
else
  info "Attention : --skip-verify, la Definition of Done n'a pas été contrôlée."
fi

git push --set-upstream origin "$BRANCH"

EXISTING_PR="$(gh pr list --head "$BRANCH" --state open --json url --jq '.[0].url // empty')"
if [ -n "$EXISTING_PR" ]; then
  info "Une pull request existe déjà : $EXISTING_PR"
  enable_auto_merge "$EXISTING_PR"
  exit 0
fi

load_issues
ISSUE_TITLE="$(issue_title_for "$NUMBER")"
SHORT_TITLE="${ISSUE_TITLE#\[Story $STORY\] }"
PR_TITLE="$TYPE(story-$STORY): $SHORT_TITLE"

BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT
{
  printf 'Closes #%s\n\n' "$NUMBER"
  cat .github/pull_request_template.md
} > "$BODY_FILE"

ARGS=(--base "$BASE_BRANCH" --head "$BRANCH" --title "$PR_TITLE" --body-file "$BODY_FILE" --label review)
[ "$DRAFT" -eq 1 ] && ARGS+=(--draft)
URL="$(gh pr create "${ARGS[@]}")"

gh issue edit "$NUMBER" --remove-label in-progress --add-label review >/dev/null
info "Pull request ouverte : $URL"
enable_auto_merge "$URL"
