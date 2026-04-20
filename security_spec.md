# Zion Trading System Security Specification

## Data Invariants
1. **User Safety**: A user can only access and modify their own profile, trades, and private AI messages.
2. **Signal Integrity**: Signals can be read by everyone (or restricted by tier), but can only be created by authenticated users (or system-logic).
3. **Financial Integrity**: Trades must have valid entry/exit prices and belong to a valid user.
4. **Chat Decorum**: Community messages are public but immutable by other users.

## The "Dirty Dozen" Payloads (Rejected Cases)
1.  **Identity Spoofing**: Attempt to update `users/otherUID` as `request.auth.uid`.
2.  **Role Escalation**: Attempt to set `role: 'creator'` on self.
3.  **Tier Sabotage**: Attempt to set `tier: 'mythic'` on self without payment.
4.  **Orphaned Trade**: Attempt to create a trade with a non-existent `uid`.
5.  **Status Shortcut**: Transitioning a trade from 'closed' back to 'open'.
6.  **Value Poisoning**: Injecting a 2MB string into a signal's `analysis` field.
7.  **Resource Poisoning**: Using a 10KB string as a `tradeId`.
8.  **Shadow Update**: Adding a field `is_admin: true` to a user profile.
9.  **Time Spoofing**: Setting `created_at` to a date in the past.
10. **PnL Injection**: Manually updating `pnl` without closing a trade properly.
11. **Cross-User Leak**: Non-admin querying all private AI messages.
12. **Blanket Read Attack**: Requesting `list /users` without being an admin.

## Evaluation & Mitigation
-   Uses `affectedKeys().hasOnly()` for all state transitions.
-   Uses `isValidId()` for all document IDs.
-   Enforces `request.time` for all timestamps.
-   Uses `get()` to verify owner/user existence where applicable.
