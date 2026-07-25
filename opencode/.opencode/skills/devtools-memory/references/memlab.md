# Memlab fallback

Use Memlab only when the bundled MCP analysis tools cannot answer the question
and external local analysis is in scope. Do not silently download a package or
replace the plugin's pinned Chrome DevTools MCP runtime. Prefer a project-pinned
Memlab command or an already installed `memlab`; ask before installing it.

Never print, search, or load raw `.heapsnapshot` JSON into model context. Memlab
parses the files locally, but the files and its reports can still contain
sensitive strings and retaining paths.

## Prepare a valid triplet

Use three snapshots captured with the same browser build and environment:

1. `baseline`: stable state A before the suspect action.
2. `target`: state B after the suspect action.
3. `final`: state A after the explicit release or revert action.

Memlab approximates candidates as objects allocated between baseline and target
that remain in final. A final snapshot taken before cleanup settles, or a final
state that is not lifecycle-equivalent to baseline, produces misleading results.

## Run installed tooling

Verify the available CLI first:

```bash
memlab help
memlab find-leaks -h
```

Analyze an explicit triplet:

```bash
memlab find-leaks \
  --baseline /absolute/path/baseline.heapsnapshot \
  --target /absolute/path/target.heapsnapshot \
  --final /absolute/path/final.heapsnapshot
```

For interactive exploration of one snapshot, use the commands exposed by the
installed version, commonly:

```bash
memlab heap --snapshot /absolute/path/final.heapsnapshot
memlab view-heap --snapshot /absolute/path/final.heapsnapshot
```

Do not use `memlab analyze snapshot`; `analyze` expects a named analysis plugin,
not a generic `snapshot` subcommand. Confirm version-specific plugin options with
`memlab analyze -h`.

## Interpret output

Treat Memlab output as candidate evidence. Its default detectors emphasize
detached DOM and unmounted framework nodes and can miss other leak classes.
Inspect representative retainer traces, identify the application owner, and rule
out intentional caches before confirming a leak.

Record the Memlab version, exact command, input paths, lifecycle, and filters.
Report whether retained sizes describe an individual node or an aggregated trace
cluster. Re-run the same triplet after cleanup to verify that the candidate cluster
disappears or reaches a stable bound.

If Memlab is unavailable or fails on the artifacts, return a partial report. Do
not fall back to a whole-file `JSON.parse` comparison: it can exhaust memory and
cannot establish causality from class-name and shallow-size deltas.
