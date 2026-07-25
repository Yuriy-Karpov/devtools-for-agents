---
name: devtools-memory
description: Investigate Chromium/V8 JavaScript heap memory through the bundled Chrome DevTools MCP. Use for browser-tab memory growth or OOM symptoms, suspected leaks, detached DOM nodes, retained objects, heap snapshot capture or comparison, retainers, retaining paths, dominators, and growth across repeated navigation or interactions. Do not trigger for general slowness without a memory symptom or for Node.js-only server leaks without a compatible heap snapshot.
---

# DevTools Memory

Analyze browser memory through the MCP server named `devtools`. Before the first
MCP call, read the sibling [devtools](../devtools/SKILL.md) skill and apply its
connection, page-control, snapshot, and safety rules.

## Operational checklist

1. Select the page and define stable states A and B.
2. Define the minimal A → B action and explicit B → A release.
3. Record browser, viewport, auth, inputs, repetitions, and settling rule.
4. Choose an approved snapshot directory outside the repository.
5. Check capture and analysis-tool availability.
6. Warm up state A and capture `baseline`.
7. Repeat the same lifecycle and capture `target` in B.
8. Release back to A under the same conditions and capture `final`.
9. Compare baseline → target and baseline → final aggregates.
10. Drill into surviving classes, nodes, retaining paths, and owners.
11. Classify the result conservatively and state confidence and limitations.
12. Close loaded snapshots, report remaining files, and name the next test.

## Establish scope

Record the selected page or input snapshot, exact repeatable scenario, state that
should release the suspected objects, viewport, authentication state, browser
version, and repetition count. Keep the environment fixed across captures.

Choose an approved temporary or output directory before capture. Never save
`.heapsnapshot` files in the repository by default. Snapshots can contain strings,
URLs, user data, and tokens. Stop before capturing a sensitive attached profile
unless the user explicitly placed that data in scope. Never publish or transfer a
snapshot without explicit authorization.

## Check the tool contract

Use `take_heapsnapshot` for capture. The pinned runtime exposes these analysis
tools only with `--memoryDebugging=true` (`--experimentalMemory` is an alias):

- `get_heapsnapshot_summary`
- `get_heapsnapshot_details`
- `compare_heapsnapshots`
- `get_heapsnapshot_class_nodes`
- `get_heapsnapshot_duplicate_strings`
- `get_heapsnapshot_retainers`
- `get_heapsnapshot_retaining_paths`
- `get_heapsnapshot_dominators`
- `get_heapsnapshot_edges`
- `close_heapsnapshot`

Check analysis-tool availability before a long scenario. `get_heapsnapshot_details`
and `get_heapsnapshot_class_nodes` accept these optional `filterName` values:
`objectsRetainedByDetachedDomNodes`, `objectsRetainedByConsole`,
`objectsRetainedByEventHandlers`, and `objectsRetainedByContexts`. Treat a filter
as an investigation lens, not proof of a leak.

Use the exact 1.6.0 parameter names:

- `take_heapsnapshot`: `filePath`.
- `compare_heapsnapshots`: `baseFilePath`, `currentFilePath`, and optional
  `classIndex`. The same tool returns either the summary or one class's detail.
- `get_heapsnapshot_details`: `filePath`, optional `filterName`, `pageIdx`, and
  `pageSize`.
- `get_heapsnapshot_class_nodes`: `filePath`, class `id`, optional `filterName`,
  `pageIdx`, and `pageSize`.
- `get_heapsnapshot_duplicate_strings`: `filePath`, optional `pageIdx` and
  `pageSize`.
- Retainers, dominators, and edges: `filePath` and `nodeId`; retaining paths also
  accept `maxDepth`, `maxNodes`, and `maxSiblings`.
- `close_heapsnapshot`: `filePath`.

Never substitute similar names such as `snapshotPath`, `baselineSnapshotPath`,
`targetSnapshotPath`, or `index`. Inspect the live tool schema if runtime version
or availability differs.

If only capture is available, take snapshots only when the artifacts are useful
to the user and report that MCP analysis was unavailable. Use the exact path
returned by `take_heapsnapshot` for later calls because the runtime normalizes the
`.heapsnapshot` extension. If an output path is rejected outside negotiated MCP
roots, use an approved OS temporary path; never enable unrestricted paths merely
for convenience.

Never read, search, or parse raw `.heapsnapshot` JSON with `cat`, `read_file`,
`JSON.parse`, or a general text tool. Use the MCP analysis tools first. For an
authorized external fallback, read [references/memlab.md](references/memlab.md).

## Run the lifecycle experiment

1. Stabilize the initial state **A** and complete obvious warm-up work.
2. Capture `baseline` in state A.
3. Perform the minimal action A → B. For three initial action exposures in a
   cheap scenario, complete two A → B → A cycles, then perform a third A → B and
   end in B. Preserve identical inputs and record the actual count.
4. Let expected asynchronous work settle. Use forced garbage collection only
   when the environment exposes a verified mechanism; otherwise keep the settling
   window consistent and report GC uncertainty. Never claim forced collection
   unless it actually occurred.
5. Capture `target` in state B.
6. Perform the defined release action B → A, wait under the same settling rule,
   and capture `final`.
7. If growth may be initialization noise, repeat the triplet or extend to at most
   ten consistent action exposures when safe and inexpensive. Prefer more
   evidence over a fixed repetition count.

If no meaningful B → A release exists, use repeated post-scenario captures, state
that the triplet leak criterion is unavailable, and lower confidence.

### Minimal lifecycle example

For a search-dialog suspicion, use A = dialog closed, B = dialog opened with one
fixed query, and B → A = clear the query and close the dialog. Repeat only those
actions. Do not mix navigation, carousel clicks, changing queries, or unrelated
requests into the same experiment. If the suspected leak requires results to
render, include that deterministic wait in every cycle and record it.

## Analyze from aggregates to ownership

1. Load `summary` for baseline, target, and final. Compare totals and verify that
   each artifact is readable.
2. Run `compare_heapsnapshots` from baseline to target and from baseline to final
   without `classIndex` first. Prioritize classes added by the action that remain
   elevated after release. Diff sizes are shallow-size deltas, not retained
   impact.
3. For a suspicious class, rerun the relevant comparison with its 0-based
   `classIndex` to obtain added and deleted node IDs. An index belongs to one
   specific summary result because each comparison is sorted independently;
   never reuse it across comparisons.
   Optionally compare target to final to measure release directly, but do not
   derive that diff by subtracting two independent summaries.
4. Page through unfiltered `details` when broader aggregates are needed. Apply a
   named filter only to test a concrete detached-DOM, console, event-handler, or
   context-retention hypothesis.
5. Use the class ID from the relevant snapshot's `details` with
   `get_heapsnapshot_class_nodes`. Preserve the same `filterName` when drilling
   into filtered aggregates. Inspect representative final-snapshot nodes, not
   only the largest instance.
6. Bound the first retaining-path query with conservative depth and node limits.
   Expand only the promising branch. Use retainers and dominators to identify
   ownership; use outgoing edges to understand what the retained node owns.
7. When string growth dominates, use `get_heapsnapshot_duplicate_strings` on the
   final snapshot, page the result, and inspect retaining paths for representative
   node IDs. Use group totals for ranking; overlapping retained graphs make them
   unsafe to sum as independent impact.
8. Continue until the path reaches a plausible application owner or an
   environment/runtime root. Read
   [references/common-leaks.md](references/common-leaks.md) only after the
   evidence points to a concrete pattern.
9. Close every loaded artifact with `close_heapsnapshot`, including on partial
   failure. Closing releases MCP-server memory; it does not delete the file.

### Size interpretation example

Treat shallow size as the bytes owned directly by a node and retained size as the
memory that could become collectible if that node were removed, subject to shared
ownership. For example, a cache `Map` with 100 KB shallow size and a unique 20 MB
retained graph is a more important owner than a standalone 2 MB string with about
2 MB retained size. Do not add retained sizes from overlapping dominator branches
or infer ownership from a large shallow delta alone.

### Capture-only fallback example

If `take_heapsnapshot` exists but comparison tools do not, do not parse raw JSON.
Capture the triplet only when the files are useful for an authorized later
analysis. Otherwise run bounded repeated lifecycle measurements available in the
browser, report the result as `not confirmed` or `suspected` with low confidence,
and name one next step: restart MCP with `--memoryDebugging=true`, or use the
authorized [Memlab fallback](references/memlab.md).

## Interpret conservatively

- Confirm a leak only when objects allocated or multiplied by the scenario remain
  after their expected release and a retaining chain identifies a plausible
  owner.
- Treat a single large snapshot, target-only growth, or a class name as
  insufficient evidence.
- Consider warm-up, lazy initialization, bounded caches, pooling, history,
  framework development mode, DevTools instrumentation, and delayed cleanup.
- Distinguish object count, shallow size, retained size, process memory, and a
  user-visible symptom.
- Do not make forced garbage collection a prerequisite or recommendation unless
  a verified mechanism is actually available in the scoped environment.
- Label incomplete paths as suspected and name the next experiment needed.
- Recommend code changes during diagnosis; implement them only when the user also
  requested a fix.

## Decide when growth is not a leak

Use this decision tree after comparable A → B → A cycles:

- If target grows but final repeatedly returns near the warmed baseline, classify
  the allocations as released and the leak as `not confirmed`.
- If the first final jumps and later finals plateau within normal GC variability,
  test more identical cycles and cache capacity. A stable bound supports warm-up,
  lazy initialization, a bounded cache, or a pool rather than a leak.
- If finals fall only after longer settling or later snapshots, classify delayed
  cleanup or GC uncertainty; keep confidence low unless objects accumulate across
  equivalent settled states.
- If finals grow roughly with exposure count, inspect the same surviving class
  and retaining owner across cycles. Persistent scenario-created objects plus a
  plausible owner support `confirmed`; missing ownership evidence supports only
  `suspected`.
- If growth changes with input diversity but stabilizes when entries repeat,
  investigate cache keys, capacity, and eviction. Confirm a leak only if growth
  exceeds the intended bound or entries outlive their documented lifecycle.
- If process memory grows while JS heap, DOM counts, and snapshots stay bounded,
  do not diagnose a JavaScript heap leak; redirect the investigation to renderer,
  GPU, media, native, or browser-process memory.

## Report

Choose the user-facing report language in this order: an explicit user request,
an explicitly established workspace or project language, then the language of the
current request or conversation. If it still cannot be determined, use Russian.
Do not default to English merely because this skill is written in English.
Localize headings, conclusion states, severity and confidence labels,
limitations, and recommendations. The English labels below define semantic
categories; they are not required literal output. Keep only unavoidable technical
identifiers and literal tool or API names in English.

Return:

1. **Scope** — page, A/B lifecycle, repetitions, environment, auth, and artifacts.
2. **Conclusion** — `confirmed`, `suspected`, or `not confirmed`, with confidence.
3. **Findings** — observation, impact, evidence, retaining owner/path, confidence,
   recommendation, and verification method for each item.
4. **Limitations** — tool availability, GC uncertainty, sensitive-data boundary,
   missing release state, or insufficient repetitions.
5. **Artifacts and cleanup** — remaining snapshot paths, loaded snapshots closed,
   and any browser or throttling state restored.
6. **Next step** — the smallest experiment or code verification that would
   increase confidence; state that no further action is justified when applicable.

Order findings by `critical`, `high`, `medium`, `low`, then `info`. Use `critical`
only when memory behavior blocks or crashes a key scoped flow. When blocked,
return completed checks, the exact limitation, remaining artifact paths, and the
smallest useful next step.

Always return all six sections, even when there are no findings or the analysis is
partial. Write `none` in the report language instead of silently omitting a
section. End the response only after stating cleanup status and the next step.
