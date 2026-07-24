---
name: devtools-accessibility
description: Audit the accessibility of a live rendered Chromium page or user flow through the bundled Chrome DevTools MCP. Use for accessible names and semantics, accessibility-tree inspection, keyboard navigation, focus order and visibility, keyboard traps, ARIA, forms and errors, dialogs and dynamic widgets, contrast signals, zoom or reflow, and Lighthouse accessibility findings. Do not trigger for generic visual review without an accessibility question.
---

# DevTools Accessibility

Audit the current page or flow through the MCP server named `devtools`. Treat the
sibling `devtools` skill as the connection, page-control, snapshot, screenshot,
Console, Network, and safety contract; do not duplicate its setup workflow.

## Scope and inputs

Record the page and state, key user flow, desktop/mobile, viewport, authentication,
and component states in scope. Identify whether the request covers a single page,
one flow, or named states such as default, hover, focus, error, disabled, modal,
and high contrast. Choose harmless defaults only when they do not change the
meaning of the test, then report them.

## Workflow

1. Open the relevant state and capture a fresh snapshot with accessibility
   information plus a screenshot when visual state matters.
2. Run `lighthouse_audit` as an automated baseline and inspect concrete
   accessibility audits instead of relying on the category score.
3. Inspect structure, roles, states, and accessible names for interactive and
   content elements using snapshot/AX evidence.
4. Complete the key flow using keyboard input only. Check reachability, order,
   visible focus, activation, escape from overlays, focus restoration, and absence
   of keyboard traps.
5. Check forms for labels, instructions, required and invalid states, and programmatic
   association of errors with controls.
6. Check dynamic components such as dialogs, menus, tabs, disclosures, toasts, and
   live regions in every scoped state.
7. Check tool-observable visual conditions: contrast findings, zoom/reflow,
   viewport or orientation behavior, focus visibility, and lost or obscured
   content.
8. Use `evaluate_script`, emulation, Console, and Network only when needed to
   confirm semantics, state, or a failure that blocks accessible behavior.

## Interpretation rules

- Do not claim full WCAG conformance from an automated audit.
- Do not treat correct DOM semantics as proof that a custom control behaves
  accessibly.
- Prefer native semantics; ARIA does not repair incorrect behavior by itself.
- Do not claim screen-reader testing unless a real screen reader was used. Say
  "checked through the accessibility tree and semantics" when that is the evidence.
- A screenshot does not prove screen-reader behavior.
- Assess contrast and focus in the exact state tested; do not generalize to hover,
  error, disabled, high-contrast, or other states outside scope.
- Describe the affected user group and functional impact, not only the violated
  attribute or audit.

## Result format

Return:

1. **Scope** — page, flow, viewport/device, auth, and component states.
2. **Summary** — key barriers and tested paths without a conformance claim.
3. **Findings** — ordered by `critical`, `high`, `medium`, `low`, or `info`.
4. **Evidence** — audit ID, element/state, role/name, focus sequence, screenshot,
   AX/DOM observation, and reproduction steps.
5. **Recommendations** — concrete semantic or behavioral correction and re-test.
6. **Limitations** — untested assistive technology, states, pages, or failed tools.

For each finding state observation, affected users and impact, evidence, confidence
(`high`, `medium`, or `low`), recommendation, and verification. Use `critical` only
when a key scoped flow or its content is effectively unavailable to the affected
users.

## Stop and degrade safely

If Lighthouse fails, retain manual keyboard, AX, DOM, and visual findings and mark
the audit partial. Return a partial report when the target state cannot be reached,
authorization is missing, interaction is blocked, or required tools are
unavailable. Name completed checks, the exact limitation, and the smallest next
step. Complete the audit only after testing the automated baseline and the key
manual flow, with reproducible evidence for every material finding.

