---
name: devtools-memory
description: Investigate live Chromium JavaScript heap usage through the bundled Chrome DevTools MCP. Use for suspected memory leaks, repeatable heap growth, detached DOM nodes, retained objects, heap snapshots, retainers, retaining paths, dominators, and memory growth across repeated navigation or interactions. Do not trigger for general slowness without a memory symptom.
---

# DevTools Memory

Analyze browser memory through the MCP server named `devtools`. Treat the sibling
`devtools` skill as the connection, page-control, snapshot, and safety contract;
apply its rules without copying them here.

## Scope and inputs

Record the URL or selected page, exact repeatable scenario, expected object
lifecycle, viewport, authentication state, and number of repetitions. Decide where
heap artifacts may be written before capture. Never save `.heapsnapshot` files in
the repository by default.

Heap snapshots can contain strings, URLs, user data, and tokens. Stop before
capturing a sensitive attached profile unless the user explicitly placed that data
in scope. Do not publish or transfer a snapshot without explicit authorization.

## Preconditions and tools

Use `take_heapsnapshot` for capture. Use `get_heapsnapshot_summary`,
`get_heapsnapshot_details`, `get_heapsnapshot_class_nodes`,
`get_heapsnapshot_retainers`, `get_heapsnapshot_retaining_paths`,
`get_heapsnapshot_dominators`, `get_heapsnapshot_edges`, and
`close_heapsnapshot` for analysis.

Check analysis-tool availability before running a long scenario. Those tools
require the runtime flag `--memoryDebugging=true`. If only `take_heapsnapshot` is
available, capture only when useful and report that full MCP analysis was not
possible.

## Workflow

1. Stabilize the target page and describe the lifecycle that should release the
   suspected objects.
2. Capture a baseline snapshot in an approved temporary or output location.
3. Repeat the minimal scenario consistently several times.
4. Allow asynchronous work and garbage collection to settle as far as the
   environment permits. Never claim forced GC unless it actually occurred.
5. Capture a post-scenario snapshot. Repeat the cycle when needed to distinguish
   sustained growth from initialization or delayed cleanup.
6. Compare summary and aggregate details. Identify classes and instances with
   repeatable retained growth.
7. For suspicious nodes, inspect class nodes, retainers, retaining paths,
   dominators, and edges until the evidence identifies a plausible owner.
8. Close loaded snapshots with `close_heapsnapshot` after analysis and report the
   paths of artifacts that remain on disk.

## Interpretation rules

- Do not call one large snapshot a leak. Require repeatable growth plus retention
  evidence after the expected lifecycle ends.
- Consider cache growth, lazy initialization, pooling, and delayed cleanup before
  diagnosing a leak.
- Do not treat a class name alone as causal evidence.
- Label an incomplete retention chain as a suspicion and name the next capture or
  interaction needed to test it.
- Distinguish retained size, object count, and user-visible memory symptoms.
- Use `critical` only when memory behavior blocks or crashes a key scoped flow.

## Result format

Return:

1. **Scope** — page, scenario, repetitions, auth, environment, and artifact paths.
2. **Summary** — `confirmed`, `suspected`, or `not confirmed`, with concise reason.
3. **Findings** — ordered by `critical`, `high`, `medium`, `low`, or `info`.
4. **Evidence** — snapshot comparison, class/node IDs, counts or sizes, retainers,
   retaining paths, dominators, edges, and lifecycle steps.
5. **Recommendations** — ownership or cleanup direction and the repeated test.
6. **Limitations** — unavailable tools, GC uncertainty, sensitive data boundaries,
   or insufficient repetitions.

For every finding state observation, impact, evidence, confidence (`high`,
`medium`, or `low`), recommendation, and verification method.

## Stop and degrade safely

Return a partial report when analysis tools are unavailable, capture fails, the
scenario is not reproducible, or sensitive data is out of scope. Name completed
checks, the exact limitation, and the smallest next step. Confirm a leak only when
repeatable growth and an evidence-backed retention path are both present.

