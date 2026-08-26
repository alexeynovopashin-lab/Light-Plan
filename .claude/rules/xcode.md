---
paths:
  - "**/*.swift"
  - "**/*.pbxproj"
  - "**/*.xcconfig"
  - "**/*.entitlements"
  - "**/Info.plist"
---

# Xcode rules

<!-- Loaded into context only when a file matching paths: above is read.
     While the work is web-only, none of this is in context. -->

## Builds

- Never run `xcodebuild` without filtering its output. A raw build log is tens
  of thousands of tokens that stay in context until the session ends.
- Canonical form:

  ```
  xcodebuild -scheme <S> -destination '<D>' build \
    > /tmp/cc-xcodebuild.log 2>&1; echo "exit=$?"
  grep -nE 'error:|\*\* BUILD (SUCCEEDED|FAILED) \*\*' /tmp/cc-xcodebuild.log | head -40
  ```

- If `xcbeautify` is installed, use `| xcbeautify --quiet | tail -40`.
- Don't pull warnings into context until I ask you to work through them.
- Swift errors cascade: one real error spawns a dozen derived ones. Take the
  first 3 unique errors, fix them, rebuild. Don't work through the whole list.

## Project files and config

- Don't read `.pbxproj` in full — it is a machine-generated file thousands of
  lines long. Need a target, a flag, or a file reference — `grep` it out.
- Propose project-structure changes in text so I make them in the Xcode UI.
  Hand-editing `.pbxproj` breaks the project more often than it helps.

## Device and simulator logs

- `log stream`, `log show`, `xcrun simctl spawn ... log` are unbounded streams.
  Redirect to a file and `grep`, never straight into context.
- For debugging the PWA in WKWebView: I paste the Safari Web Inspector console
  myself. Don't ask for a full dump — ask for specific lines or a saved file.

## Screenshots

- Every simulator or Xcode Preview screenshot is roughly 1–1.5k tokens, and it
  stays in context forever.
- Don't ask for a screenshot on every layout iteration. State a hypothesis in
  text first, ask for one screenshot to check it, then edit blind.
- Ask for a before/after pair as a single image, not two.

## Tests

- `xcodebuild test` is 2–5× more verbose than a build. Always route through a
  file plus grep on `Testing failed|error:|failed`.
- Delegate parsing a large test log to a subagent.
