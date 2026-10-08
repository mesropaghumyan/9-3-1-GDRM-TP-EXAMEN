#!/usr/bin/env bash
# Démarre une story : crée la branche feature depuis master, liée à l'issue GitHub, et la checkout.
#
# Usage : scripts/git/start-story.sh <N.M>     ex. scripts/git/start-story.sh 1.1
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

STORY="${1:-}"
[[ "$STORY" =~ ^[0-9]+\.[0-9]+$ ]] || die "usage : start-story.sh <N.M>   (ex. 1.1)"

require_tools
goto_repo_root

[ -z "$(git status --porcelain)" ] || die "arbre de travail non propre : commit ou stash d'abord"

load_issues
NUMBER="$(issue_number_for "[Story $STORY]")"
[ -n "$NUMBER" ] || die "aucune issue \"[Story $STORY]\" : lancer scripts/git/sync-issues.sh"

STATE="$(gh issue view "$NUMBER" --json state --jq .state)"
[ "$STATE" = OPEN ] || die "l'issue #$NUMBER est déjà fermée"

# Les stories se font dans l'ordre : prévenir si une story précédente du même epic est encore ouverte.
EPIC="${STORY%%.*}"
OPEN_BEFORE="$(gh issue list --state open --label "epic-$EPIC" --label story --limit 100 --json number,title --jq '.[] | "\(.number)\t\(.title)"' \
  | awk -F'\t' -v s="$STORY" '
      match($2, /^\[Story [0-9]+\.[0-9]+\]/) {
        id = substr($2, 8, RLENGTH - 8); split(id, a, "."); split(s, b, ".")
        if (a[2] + 0 < b[2] + 0) print "  #" $1 " " $2
      }')"
if [ -n "$OPEN_BEFORE" ]; then
  printf 'Attention : des stories précédentes de l'\''epic %s sont encore ouvertes :\n%s\n' "$EPIC" "$OPEN_BEFORE" >&2
fi

TITLE="$(issue_title_for "$NUMBER")"
SLUG="$(slugify "${TITLE#\[Story $STORY\] }")"
BRANCH="feature/${NUMBER}-story-${STORY//./-}-${SLUG}"

git fetch origin "$BASE_BRANCH" --quiet
git show-ref --verify --quiet "refs/heads/$BRANCH" && die "la branche $BRANCH existe déjà en local"

# Crée la branche sur origin à partir de la base, la lie à l'issue, puis la checkout.
gh issue develop "$NUMBER" --base "$BASE_BRANCH" --name "$BRANCH" --checkout
gh issue edit "$NUMBER" --add-assignee "@me" --add-label in-progress >/dev/null

info "Branche $BRANCH prête (issue #$NUMBER, base $BASE_BRANCH)."
info "Rappel : mettre sprint-status.yaml à jour dans le même commit que le changement."
