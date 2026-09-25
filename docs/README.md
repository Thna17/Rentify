# Platform documentation

This directory is the shared source of truth for Rentify's platform direction.
It separates decisions and planned architecture from the behavior of today's
code so implementation work can proceed without relying on chat history.

- [Platform architecture](platform-architecture.md) — product model, service
  boundaries, data ownership, and main user flows.
- [Current Rentify architecture](current-rentify-architecture.md) — verified
  service map and existing flows that migration must preserve.
- [Migration plan](migration-plan.md) — staged work for absorbing KhmerCraft's
  marketplace into Rentify, with release gates and rollback paths.
- [Shared catalog contract](catalog-migration-contract.md) — Rentify Product
  ownership, marketplace eligibility, and data checks.
- [COD checkout contract](checkout-migration-contract.md) — Phase 4 Commerce
  API, stock and cash state, and remaining client cutover gates.
- [Marketplace development rehearsal](marketplace-cutover-rehearsal.md) —
  Rentify-only local setup, seller approval check, and buyer journey.
- [Phase 5 release runbook](phase-5-release-runbook.md) — inventory, parity
  audits, staged release evidence, and retirement gates.
- [Notes and open questions](notes.md) — verified observations, unresolved
  choices, and items requiring product decisions.
- [Platform admin operations](admin-operations.md) — live admin scope,
  authority boundaries, and workflow gates adapted from the reference PRD.
- [Legacy KhmerCraft reference API](reference/legacy-khmercraft-api/README.md) —
  archived Express/Mongoose API and legacy design notes for reference only.

When a decision changes, update these documents in the same change as the
implementation or record the decision in `notes.md` while work is pending.
Use **Current**, **Target**, and **Open** labels to avoid mistaking plans for
completed features.
