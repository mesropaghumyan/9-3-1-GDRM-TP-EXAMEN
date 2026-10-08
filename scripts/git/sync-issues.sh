#!/usr/bin/env bash
# Crée sur GitHub une issue par epic et par story à partir de epics.md.
# Idempotent : une issue dont le titre commence par "[Epic N]" / "[Story N.M]" existe déjà = ignorée.
#
# Usage : scripts/git/sync-issues.sh [--dry-run]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

DRY_RUN=0
case "${1:-}" in
  "") ;;
  --dry-run) DRY_RUN=1 ;;
  *) die "usage : sync-issues.sh [--dry-run]" ;;
esac

require_tools
goto_repo_root
[ -f "$EPICS_FILE" ] || die "fichier introuvable : $EPICS_FILE"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
INDEX="$WORK_DIR/index.tsv"
: > "$INDEX"

# Découpe epics.md : un fichier par epic et par story, plus un index "type<TAB>id<TAB>titre".
# Les blocs de code sont ignorés ; tout autre titre markdown termine la capture.
awk -v dir="$WORK_DIR" -v index_file="$INDEX" '
  /^```/ { fence = !fence }
  {
    if (!fence && $0 ~ /^## Epic [0-9]+:/) {
      if (out != "") close(out)
      line = $0; sub(/^## Epic /, "", line)
      id = line; sub(/:.*/, "", id)
      title = line; sub(/^[0-9]+: */, "", title)
      out = dir "/epic-" id ".md"
      printf "epic\t%s\t%s\n", id, title >> index_file
      next
    }
    if (!fence && $0 ~ /^### Story [0-9]+\.[0-9]+:/) {
      if (out != "") close(out)
      line = $0; sub(/^### Story /, "", line)
      id = line; sub(/:.*/, "", id)
      title = line; sub(/^[0-9]+\.[0-9]+: */, "", title)
      out = dir "/story-" id ".md"
      printf "story\t%s\t%s\n", id, title >> index_file
      next
    }
    if (!fence && $0 ~ /^#+ /) { if (out != "") close(out); out = ""; next }
    if (out != "") print $0 >> out
  }
' "$EPICS_FILE"

[ -s "$INDEX" ] || die "aucun epic ni story trouvé dans $EPICS_FILE"

run() {
  if [ "$DRY_RUN" -eq 1 ]; then info "[dry-run] $*" >&2; else "$@"; fi
}

load_issues

# --- Libellés (labels) ---
ensure_label() { # nom couleur description
  run gh label create "$1" --color "$2" --description "$3" --force >/dev/null
}
info "Libellés…"
ensure_label epic 5319E7 "Epic BMAD"
ensure_label story 1D76DB "Story BMAD"
ensure_label in-progress FBCA04 "Story en cours de développement"
ensure_label review C2E0C6 "Pull request ouverte, en attente de revue QA"
while IFS=$'\t' read -r kind id _; do
  [ "$kind" = epic ] && ensure_label "epic-$id" BFD4F2 "Rattaché à l'epic $id"
done < "$INDEX"

# --- Jalons (milestones), un par epic ---
EXISTING_MILESTONES="$(gh api 'repos/{owner}/{repo}/milestones?state=all&per_page=100' --jq '.[].title')"
milestone_title() { printf 'Epic %s : %s' "$1" "$2"; }
info "Jalons…"
while IFS=$'\t' read -r kind id title; do
  [ "$kind" = epic ] || continue
  m="$(milestone_title "$id" "$title")"
  if printf '%s\n' "$EXISTING_MILESTONES" | grep -Fxq "$m"; then
    info "  existe déjà : $m"
  else
    run gh api -X POST 'repos/{owner}/{repo}/milestones' -f title="$m" -f description="Epic $id" >/dev/null
    [ "$DRY_RUN" -eq 1 ] || info "  créé : $m"
  fi
done < "$INDEX"

# --- Issues d'epics ---
create_issue() { # préfixe titre-complet fichier-corps libellés jalon
  local prefix="$1" title="$2" body_file="$3" labels="$4" milestone="$5" url
  local existing
  existing="$(issue_number_for "$prefix")"
  if [ -n "$existing" ]; then
    info "  existe déjà : #$existing $title"
    LAST_NUMBER="$existing"
    return 0
  fi
  if [ "$DRY_RUN" -eq 1 ]; then
    info "[dry-run] créerait : $title  (labels: $labels ; jalon: $milestone)"
    LAST_NUMBER="?"
    return 0
  fi
  url="$(gh issue create --title "$title" --body-file "$body_file" --label "$labels" --milestone "$milestone")"
  LAST_NUMBER="${url##*/}"
  info "  créé : #$LAST_NUMBER $title"
}

declare -a EPIC_IDS=()
info "Issues d'epics…"
while IFS=$'\t' read -r kind id title; do
  [ "$kind" = epic ] || continue
  EPIC_IDS+=("$id")
  create_issue "[Epic $id]" "[Epic $id] $title" "$WORK_DIR/epic-$id.md" "epic,epic-$id" "$(milestone_title "$id" "$title")"
  printf '%s' "$LAST_NUMBER" > "$WORK_DIR/epic-$id.number"
done < "$INDEX"

# --- Issues de stories ---
info "Issues de stories…"
while IFS=$'\t' read -r kind id title; do
  [ "$kind" = story ] || continue
  epic_id="${id%%.*}"
  epic_title="$(awk -F'\t' -v e="$epic_id" '$1 == "epic" && $2 == e { print $3 }' "$INDEX")"
  epic_number="$(cat "$WORK_DIR/epic-$epic_id.number")"
  body="$WORK_DIR/story-$id.issue.md"
  {
    cat "$WORK_DIR/story-$id.md"
    printf '\n---\n\n'
    printf 'Epic parent : #%s\n\n' "$epic_number"
    printf 'Sources : `%s`, `docs/SFD.md`, `docs/STD.md`.\n\n' "$EPICS_FILE"
    printf 'Pour démarrer : `scripts/git/start-story.sh %s` (voir `docs/GIT_WORKFLOW.md`).\n' "$id"
  } > "$body"
  create_issue "[Story $id]" "[Story $id] $title" "$body" "story,epic-$epic_id" "$(milestone_title "$epic_id" "$epic_title")"
  printf '%s\t%s\t%s\n' "$id" "$LAST_NUMBER" "$title" >> "$WORK_DIR/stories.tsv"
done < "$INDEX"

# --- Liste de suivi dans chaque issue d'epic (cases cochées automatiquement à la fermeture des stories) ---
info "Listes de suivi des epics…"
for epic_id in "${EPIC_IDS[@]}"; do
  epic_number="$(cat "$WORK_DIR/epic-$epic_id.number")"
  [ "$epic_number" != "?" ] || { info "[dry-run] mettrait à jour la liste de l'epic $epic_id"; continue; }
  {
    cat "$WORK_DIR/epic-$epic_id.md"
    printf '\n## Stories\n\n'
    awk -F'\t' -v e="$epic_id" 'index($1, e ".") == 1 { printf "- [ ] #%s [Story %s] %s\n", $2, $1, $3 }' "$WORK_DIR/stories.tsv"
  } > "$WORK_DIR/epic-$epic_id.final.md"
  gh issue edit "$epic_number" --body-file "$WORK_DIR/epic-$epic_id.final.md" >/dev/null
  info "  mis à jour : #$epic_number"
done

info "Terminé."
