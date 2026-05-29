# Security Spec & TDD Payload Matrix

## 1. Data Invariants
- A user can only create/update their own profile.
- Trades can only be read/written by their owner.
- Signals can be read by any signed-in user, but cannot be modified indiscriminately.
- Tasks must belong to a valid Tribe.
- Only a member of a Tribe can write/update a Task for that Tribe.
- Tribes can be created by anyone, but only members can modify them.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing**: `{"uid": "attacker_id"}` in a `/users/{adminId}` update.
2. **Ghost Field Update**: `{"isAdmin": true}` in a `/users/{myId}` update.
3. **Array Deny**: Setting `members` array to 10,000 items in a Tribe.
4. **Relational Sync Failure**: Creating a task for a tribe ID the user is not a member of.
5. **PII Blanket**: Attempting to read `/users` list via a generic get.
6. **State Shortcutting**: Updating a Task's status directly from "pending" to "completed" while masquerading as someone else.
7. **Type Poisoning**: `{"title": 1234}` in a task.
8. **ID Poisoning**: `{"tribeId": "some_long_invalid_string_with_*("}`.
9. **Creation Orphan**: Creating a task lacking `assigner_id`.
10. **Immutable Field Attack**: Trying to modify `created_at` on an update.
11. **Timestamp Forgery**: `{"created_at": "ancient_past_string"}`.
12. **Unverified Auth**: Accessing rules with an auth token where `email_verified == false`.

## 3. Test Runner
(Simulated inside `firestore.rules.test.ts` to reject all payloads above.)
