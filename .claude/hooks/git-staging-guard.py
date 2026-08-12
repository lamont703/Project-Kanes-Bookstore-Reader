#!/usr/bin/env python3
"""PreToolUse guard for Bash: keep all git writes on the `staging` branch.

Enforces the rule documented in CLAUDE.md ("Git workflow — STAGING ONLY"):

  * `git push` is allowed only as an explicit `git push origin staging`.
    Bare `git push`, any other remote/ref, and all force variants are denied.
  * Commands that create commits (`commit`, `merge`, `rebase`, `cherry-pick`,
    `revert`) are denied unless HEAD is currently on `staging`.

`main` is the Vercel production branch; promotion off `staging` is the user's
call, not Claude's. Everything else (status, log, diff, checkout, fetch, ...)
passes straight through.

Reads the hook payload on stdin, prints a PreToolUse deny decision on stdout
when it blocks, and exits 0 either way. Failing open on parse errors is
deliberate: a malformed payload must not wedge every Bash call.
"""

import json
import os
import re
import shlex
import subprocess
import sys

ALLOWED_BRANCH = "staging"
ALLOWED_PUSH = ["origin", ALLOWED_BRANCH]

# Commands that write a commit object onto the current branch.
COMMIT_CREATING = {"commit", "merge", "rebase", "cherry-pick", "revert"}

# `git`-level options that consume the following token as their value.
GIT_OPTS_WITH_VALUE = {"-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"}

# `git push` options that consume the following token as their value.
PUSH_OPTS_WITH_VALUE = {"--repo", "-o", "--push-option", "--receive-pack", "--exec"}

FORCE_FLAGS = {"-f", "--force", "--force-with-lease", "--force-if-includes"}

# Push flags that fan out beyond a single explicit ref.
BROAD_FLAGS = {"--all", "--mirror", "--tags", "--follow-tags", "--delete", "-d"}

# Start of a heredoc: <<EOF, <<'EOF', <<"EOF", <<-EOF.
HEREDOC_START = re.compile(r"<<-?\s*(?:'([^']*)'|\"([^\"]*)\"|([A-Za-z_][A-Za-z0-9_]*))")

# Shell operators that separate one command from the next.
SEPARATORS = {"&&", "||", ";", "|", "&", "(", ")", "\n"}

# Redirection operators. These do NOT end the command — they and their target
# are plumbing that must be skipped, along with any leading fd number, so that
# `git push origin staging 2>&1` does not read `2` as a positional argument.
REDIRECTS = {">", ">>", "<", "<<", "<<<", ">&", "<&", "&>", "&>>", ">|"}


def deny(reason):
    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason,
            }
        },
        sys.stdout,
    )
    sys.exit(0)


def current_branch():
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
        )
    except Exception:
        return None
    if out.returncode != 0:
        return None
    return out.stdout.strip() or None


def strip_heredocs(command):
    """Remove heredoc bodies — they are data, not commands.

    Without this, a commit message that merely mentions `git push origin main`
    would be scanned as if it were a command and blocked.
    """
    lines = command.split("\n")
    kept = []
    i = 0
    while i < len(lines):
        line = lines[i]
        delimiters = [
            m.group(1) or m.group(2) or m.group(3) for m in HEREDOC_START.finditer(line)
        ]
        kept.append(HEREDOC_START.sub(" ", line))
        i += 1
        for delimiter in delimiters:
            while i < len(lines) and lines[i].strip() != delimiter:
                i += 1
            i += 1  # skip the terminator line itself
    return "\n".join(kept)


def tokenize(command):
    """Split into shell tokens, keeping operators separate and quotes intact.

    Quoted strings survive as single tokens even across newlines, so
    `git commit -m "... git push origin main ..."` is one -m value, not a
    second command.
    """
    lexer = shlex.shlex(command, posix=True, punctuation_chars=True)
    lexer.whitespace_split = True
    return list(lexer)


def git_invocations(command):
    """Yield the argv tail of every `git` call in a compound shell command."""
    command = strip_heredocs(command)
    try:
        tokens = tokenize(command)
    except ValueError:
        # Unbalanced quotes — fall back to whitespace splitting so an
        # obfuscated push still gets inspected. May over-block; that is the
        # safe direction for a guard.
        tokens = command.split()

    def flush(segment):
        for i, candidate in enumerate(segment):
            if os.path.basename(candidate) == "git":
                return segment[i + 1 :]
        return None

    segment = []
    i = 0
    while i < len(tokens):
        token = tokens[i]
        if token in REDIRECTS:
            # Drop the fd number that belongs to this redirection (the `2` of
            # `2>&1`), then skip the operator and its target.
            if segment and segment[-1].isdigit():
                segment.pop()
            i += 2
            continue
        if token in SEPARATORS or (token and all(c in "&|;()<>" for c in token)):
            argv = flush(segment)
            if argv is not None:
                yield argv
            segment = []
            i += 1
            continue
        segment.append(token)
        i += 1

    argv = flush(segment)
    if argv is not None:
        yield argv


def subcommand_and_args(argv):
    """Skip git-level options to find the subcommand and its arguments."""
    i = 0
    while i < len(argv):
        token = argv[i]
        if not token.startswith("-"):
            return token, argv[i + 1 :]
        if token in GIT_OPTS_WITH_VALUE:
            i += 2
        else:
            i += 1
    return None, []


def check_push(args):
    for arg in args:
        if arg in FORCE_FLAGS or arg.startswith("--force-with-lease="):
            deny(
                "Force-push is blocked by the staging-only git guard "
                "(.claude/hooks/git-staging-guard.py). Never force-push this repo — "
                "`main` is the live Vercel production branch."
            )
        if arg in BROAD_FLAGS:
            deny(
                "`git push %s` pushes more than one explicit ref and is blocked by the "
                "staging-only git guard. Use `git push origin staging`." % arg
            )

    positional = []
    i = 0
    while i < len(args):
        arg = args[i]
        if arg in PUSH_OPTS_WITH_VALUE:
            i += 2
            continue
        if arg.startswith("-"):
            i += 1
            continue
        positional.append(arg)
        i += 1

    if positional != ALLOWED_PUSH:
        target = " ".join(positional) if positional else "(no explicit remote/ref)"
        deny(
            "Blocked: this repo only allows `git push origin staging`. You tried to push "
            "to: %s. `main` serves production on Vercel and promotion from staging is the "
            "user's decision — stop and tell them instead of pushing. "
            "(.claude/hooks/git-staging-guard.py)" % target
        )


def check_commit_creating(sub, branch):
    if branch == ALLOWED_BRANCH:
        return
    where = "a detached HEAD" if branch == "HEAD" else ("`%s`" % branch if branch else "an unknown branch")
    deny(
        "Blocked: `git %s` creates a commit, and HEAD is on %s — not `staging`. This repo "
        "only allows commits on `staging`; `main` is the live Vercel production branch. Do "
        "not switch branches to work around this — stop and tell the user. "
        "(.claude/hooks/git-staging-guard.py)" % (sub, where)
    )


def main():
    try:
        payload = json.load(sys.stdin)
        command = payload.get("tool_input", {}).get("command", "")
    except Exception:
        sys.exit(0)

    if not command or "git" not in command:
        sys.exit(0)

    branch = None
    for argv in git_invocations(command):
        sub, args = subcommand_and_args(argv)
        if sub == "push":
            check_push(args)
        elif sub in COMMIT_CREATING:
            if branch is None:
                branch = current_branch()
            check_commit_creating(sub, branch)

    sys.exit(0)


if __name__ == "__main__":
    main()
