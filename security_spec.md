# Security Specification - FinTrack AI

## Data Invariants
1. A Transaction must always have a `userId` matching the authenticated user.
2. Amounts must be positive numbers.
3. Transactions must have a valid `type` ('income' or 'expense').
4. Custom categories must belong to the authenticated user.
5. Users cannot read other users' transactions or categories.

## The Dirty Dozen Payloads (To be Blocked)

1. **Identity Spoofing (Create)**: Transaction with `userId` of another user.
2. **Identity Spoofing (Update)**: Changing `userId` to another user's ID.
3. **Negative Amount**: Transaction with `amount: -100`.
4. **Invalid Type**: Transaction with `type: 'stolen'`.
5. **PII Leak**: Querying all transactions without a `userId` filter (if rules didn't check resource data).
6. **Shadow Update**: Adding `isVerified: true` to a transaction.
7. **Orphaned Transaction**: (N/A for this structure as it's flat).
8. **Resource Poisoning**: Document ID with 2KB string.
9. **Terminal State Bypass**: (N/A currently).
10. **Admin Escalation**: Setting `role: 'admin'` on a user profile (if it existed).
11. **Cross-User Read**: Trying to `get` a transaction document ID belonging to user B while logged in as user A.
12. **Future Timestamp Spoof**: Sending a `createdAt` in the future instead of `request.time`.

## Test Runner (Logic)
The following rules will be tested to ensure these payloads are denied.
