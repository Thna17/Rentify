# Subscription lifecycle policy status

DEC-014 through DEC-020 in [the Release 1 register](decisions/release-1-register.md)
are recorded as **proposed**, not accepted. The proposed plan prices and
limits, 14-day trial, renewal notices, seven-day grace period, grace and
suspension notices, and 90-day historical-read period are therefore not
approved policy merely because they appear in the register.

The new pure schedule calculator in `subscriptionPolicy.js` refuses to
evaluate unless `P5_SUBSCRIPTION_POLICY_ENABLED=true` and a nonempty
`P5_SUBSCRIPTION_POLICY_VERSION` are supplied. Enabling that calculator does
not itself enable billing, change entitlements, schedule jobs, or send notices.
It is a testable policy input, not an acceptance or rollout mechanism.

The existing P2 entitlement implementation in
`rentify-server/src/modules/billing/entitlements/` contains hard-coded tier
limits and time periods, and already evaluates some of those proposals. It is
not a completed, configuration-gated P5 lifecycle. In particular, the
existing `Subscription` record and `PaymentAttempt` do not provide a verified,
idempotent subscription-renewal binding, a complete lifecycle event ledger,
or a safe provider rollback contract. A flag must not be presented as solving
those missing foundations by itself.

The merchant billing view reads the current Core entitlement result and
recent Core plan-payment records. It does not infer subscription revenue from
Commerce COD or pretend that upgrade, downgrade, cancellation, or a payment
flow succeeded. Plan changes are unavailable until the lifecycle and payment
foundations are implemented and the relevant policy is explicitly configured.

Required follow-up for P5-SUB-001 includes a single audited, versioned
subscription/entitlement transition authority, policy-gated timers and notices,
payment-to-subscription binding with exact minor-unit validation and replay
protection, provider rollout and rollback, historical-read enforcement, and
clock-controlled integration tests. The human decision owners remain those
listed in the Release 1 register.
