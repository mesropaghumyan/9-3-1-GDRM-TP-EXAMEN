#!/usr/bin/env bash
# Fonctions partagées par les scripts du workflow git. À sourcer, pas à exécuter.
# Dépendances : bash, git, gh (authentifié), awk, perl (modules du cœur). Aucun package npm.

EPICS_FILE="${EPICS_FILE:-_bmad-output/planning-artifacts/epics.md}"
BASE_BRANCH="${BASE_BRANCH:-master}"

die() { printf 'Erreur : %s\n' "$*" >&2; exit 1; }
info() { printf '%s\n' "$*"; }

require_tools() {
  local tool
  for tool in git gh awk perl; do
    command -v "$tool" >/dev/null 2>&1 || die "outil manquant : $tool"
  done
  gh auth status >/dev/null 2>&1 || die "gh n'est pas authentifié (gh auth login)"
}

goto_repo_root() {
  cd "$(git rev-parse --show-toplevel)" || die "pas dans un dépôt git"
}

# Slug ASCII minuscule, accents retirés, borné à 50 caractères.
slugify() {
  printf '%s' "$1" \
    | perl -CS -MUnicode::Normalize -ne 'chomp; $_ = NFD($_); s/\pM//g; $_ = lc; s/[^a-z0-9]+/-/g; s/^-+|-+$//g; print substr($_, 0, 50)' \
    | sed 's/-$//'
}

# Cache "numéro<TAB>titre" de toutes les issues (ouvertes et fermées).
load_issues() {
  ISSUES_TSV="$(gh issue list --state all --limit 500 --json number,title --jq '.[] | "\(.number)\t\(.title)"')"
}

# Numéro de la première issue dont le titre commence par le préfixe donné, ex. "[Story 1.1]".
issue_number_for() {
  printf '%s\n' "$ISSUES_TSV" | awk -F'\t' -v p="$1" 'index($2, p) == 1 { print $1; exit }'
}

issue_title_for() {
  printf '%s\n' "$ISSUES_TSV" | awk -F'\t' -v n="$1" '$1 == n { print $2; exit }'
}
