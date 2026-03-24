# Game & Go Booking

## Current State
Full booking and resource management system with Motoko backend. The canister `dbc47-7yaaa-aaaac-qgb6a-cai` is stopped, causing all backend calls to fail.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- Regenerate backend to provision a fresh canister replacing the stopped one

### Remove
- Nothing

## Implementation Plan
- Regenerate Motoko backend with identical logic to provision a new active canister
- Keep all existing frontend code unchanged
