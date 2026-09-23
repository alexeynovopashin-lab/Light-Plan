# Project rules

<!-- Loaded in full at the start of every session. Keep under 200 lines.
     Anything not needed every session goes to .claude/rules/ with paths: or to a skill. -->

**Always reply to me in Russian.** These instructions are in English only to
save context tokens; the conversation language is Russian.

## Stack

PWA prototype, tested as a wrapper in Xcode on a real device. Node is only a
tool for running scripts and builds. Migrating to native Swift later.

## Project memory

- Long-term decisions live in files on disk, not in conversation history.
  Need context — open the specific file by path, don't try to recall the session.
- Read memory documents selectively: headings/table of contents first,
  then only the section you need.

## Context economy: reading

1. Don't read a whole file when you need a fragment. `grep`/`glob` first,
   then read the matched lines with `offset`/`limit`.
2. Don't re-read a file already read this session without a reason
   (you edited it, or I explicitly asked).
3. Never read in full: `package-lock.json`, `pnpm-lock.yaml`, `*.pbxproj`,
   `*.xcworkspace/*`, anything under `node_modules/`, `DerivedData/`,
   `dist/`, `build/`, assets, binaries.
   Need a fact from a lock file — `grep` it out, don't read the file.
4. Before a change touching more than 2–3 files, give me a plan in text
   with no edits. Wait for confirmation.

## Context economy: command output

The main cost driver is not code size, it is the volume of command output.
Every tool result stays in context until the end of the session and is
re-sent with every subsequent request.

5. Write any command with potentially large output like this:
   `<cmd> > /tmp/cc-<name>.log 2>&1; echo "exit=$?"; grep -nE '<pattern>' /tmp/cc-<name>.log | head -40`
   Only matched lines and the exit code should reach context.
   The full log stays on disk — grep it again if needed.
6. `npm install` / `npm ci` — `| tail -5` only.
   Tests and builds — failures and the summary line only.
7. Stack traces: never paste in full. First 5 frames from project code;
   drop frames inside `node_modules/`.
8. Don't restate or quote output that is already visible in context.

## Delegate to subagents

9. Run any operation with predictably large reads through a subagent (Task):
   parsing a long log, searching an unfamiliar part of the codebase, reading
   documentation, taking inventory of files. What returns to the main context
   should be the conclusion, not the raw material.
10. Pick the subagent model by task: `haiku` for mechanical work and search,
    `sonnet` for analysis and edits, `opus` where a wrong verdict is costly
    (audit, second opinion). Migration iterations: the table in
    `SWIFT_MIGRATION_PLAN.md` decides.

## What you cannot do yourself — warn me instead of trying

11. You cannot run slash commands (`/compact`, `/clear`, `/context`, `/model`)
    and cannot switch your own model. I do that. So never write
    "running /compact" — write "you should run /compact, because ...".
12. You cannot see your context window fill level as a number. Estimate it
    indirectly, from how much you have read and how long the session is, and
    say plainly that it is an estimate.
13. Triggers where you must proactively suggest `/compact` or `/clear`:
    - task closed, next one unrelated → suggest `/clear` (it is free), and
      first dump the task outcome into a memory file;
    - task open, but the session is long or a large log landed in context →
      suggest `/compact` with a focus, e.g.
      `/compact keep decisions and open questions, drop build logs`;
    - I am about to break off with an open task → remind me about `/compact`
      before the break, without waiting for me to ask.
14. `/compact` is not free: it reads the whole history it summarizes. Don't
    suggest it reflexively on a short context — only when the context is
    genuinely large and there is still a lot of work left.

## Breaks

15. Prompt cache lives about an hour on a subscription. A longer pause means
    the next request reprocesses the entire context and burns a noticeable
    slice of the 5-hour window in one shot.
16. Before a break: task closed → dump the outcome to a memory file, then
    `/clear`. Task open → `/compact` before the break.
17. When resuming a large session on Pro, Claude Code offers "resume from a
    summary" — remind me to accept it instead of restoring full history.

## Parallel sessions

18. Several Claude sessions work in this folder at once. `SESSIONS_CHAT.md`
    is their shared channel (not in git). Read it at session start after
    `git log`, before committing, and when you need something only another
    session can do. Rules are at the top of the file: append to the end
    only, never rewrite or delete entries, sign with your task name.
19. **Code changes go through your own git worktree.** Main folder =
    `/Users/alexey/Documents/Light_Plan/Light_Plan`. Documentation-only work
    (ROADMAP, DECISIONS, prompts, memory) may stay in the main folder;
    anything that edits `beta/`, `tools/`, root `index.html`, `lang.js`,
    `icons.js` starts in a worktree, before the first edit:
    - create: `git -C <main> worktree add .claude/worktrees/<task> -b wt/<task> origin/main`,
      then `EnterWorktree` with `path` = that folder. Works from either
      launch folder;
    - `SESSIONS_CHAT.md` is not in worktrees — read and append it by the
      absolute path in the main folder; announce which worktree you took;
    - verify in your worktree, never on `localhost:8788/beta/` — that server
      and the simulator webclip show the main folder. `preview_start` reads
      the `launch.json` of the folder the session was launched from, not of
      the worktree. Launched from `/Users/alexey/Documents/Light_Plan`: add
      your own entry to that folder's `.claude/launch.json` — name
      `wt-<task>`, `python3 -m http.server <port> -d Light_Plan/.claude/worktrees/<task>`,
      port 8791–8799 — and delete it when done. Launched from the repo
      folder: `wt-1`…`wt-3` (8791–8793) serve the current worktree. Either
      way check the port is free first (`lsof -iTCP:<port> -sTCP:LISTEN`) —
      a busy port is someone else's server. URL: `localhost:<port>/beta/`;
    - finish: commit in the worktree → `git fetch origin && git rebase origin/main`
      (re-verify if the rebase touched your files) → `git push origin HEAD:main`,
      never force; rejected → fetch and rebase again. Then
      `git -C <main> pull --ff-only` so the webclip shows it; if that pull
      refuses because of someone's uncommitted edits, write it to the chat,
      do not work around it. Remove the worktree only when your commits are
      in `origin/main` (`git worktree remove`, no `--force`).
20. **Guard hook.** `~/.claude/hooks/light-plan-guard.py` denies, in the main
    folder: `git checkout/switch/restore/stash/clean/rebase`, `reset --hard`
    or HEAD-moving reset, `pull`/`merge` without `--ff-only`,
    `add -A`/`add .`/`commit -a`/`--amend`, `worktree remove --force`,
    whole-file overwrite of shared files (Write, `>`, `tee`); force push
    anywhere. A denial is not an obstacle to route around — it means the
    command would erase or absorb another chat's uncommitted work. In the
    main folder stage your files by name and `git pull --ff-only` before
    committing. `DECISIONS.md` merges with `merge=union` (`.gitattributes`):
    parallel appends at the end are glued, not conflicted.

# Compact instructions

When compacting, keep: decisions made and why, current task state, open
questions, paths to files touched, reproducible commands. Drop: build and
test output, stack traces, contents of files that were read, intermediate
reasoning, options already rejected.
