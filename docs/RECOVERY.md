# Contract recovery and upgrade runbook

## Classification and authority

RetractionDependency is intentionally `UPGRADABLE`.

The constructor receives one external user-controlled wallet and registers it
in `gl.storage.Root.get().upgraders`. `get_deployment_config()` exposes the
configured address and storage layout version for verification.

The upgrader can replace all contract code. It is therefore a powerful,
explicit trust and recovery authority even though no ordinary application
method allows it to inject or override a verdict. Losing that wallet can make
the existing deployment non-recoverable; compromising it can compromise the
contract.

## Safe upgrade procedure

1. Lock the candidate source revision and compute its SHA-256.
2. Verify the new source preserves every existing storage field in the same
   order and type; append-only fields are allowed.
3. Deploy the candidate to a separate test deployment with the same constructor
   pattern.
4. Prove that:
   - the configured upgrader can call `upgrade(bytes)`;
   - an unrelated wallet is rejected;
   - existing proposal/dependency state survives;
   - contract schema and key read/write smoke tests still pass.
5. Connect the confirmed external upgrader wallet.
6. Call `upgrade(bytes)` with the exact reviewed source bytes.
7. Wait for `FINALIZED` and successful execution.
8. When upgrading a V1 deployment to this V2 layout, call `migrate_v2()` from
   the configured upgrader and require `FINALIZED` plus successful execution.
9. Read `get_deployment_config()`, key application state, and current contract
   code through the current RPC.
10. Confirm storage layout version `2`, conservative history readback, and the
    permissionless cooldown fields.
11. Compare returned code/source hash to the reviewed revision.
12. Record the upgrade and migration transactions, source commit/hash, readback, and test
    evidence in the deployment manifest.

V2 appends `permissionless_review_last_requested_at` and
`conclusive_rejected_triggers` after every V1 storage field. Existing fields
are not reordered or rewritten. `migrate_v2()` changes only the explicit
layout-version marker and rejects unauthorized or repeated execution.

Never switch the frontend to replacement code/address before the smoke tests
and source-parity checks pass.

## Studio/local UI reset while Studionet state remains

1. Reconnect the confirmed external upgrader wallet.
2. Import/load the contract by the manifest address.
3. Load the exact source from the recorded commit.
4. Verify network `61999`, code hash, deployment config, counts, and a known
   proposal readback.
5. Resume normal use or perform the reviewed upgrade procedure.

No browser-local transaction record is authoritative. Reconcile all retained
hashes against Studionet and contract state.

## Studionet or chain-state reset

Studionet persistence is temporary. If chain state resets, the old address and
state cannot be recovered.

1. Redeploy the recorded source to Studionet with the user-confirmed external
   upgrader wallet.
2. Complete deployment acceptance, code/source parity, upgrade rehearsal, and
   smoke tests.
3. Record the new address and transaction.
4. Update `VITE_CONTRACT_ADDRESS` only after acceptance.
5. Rebuild/redeploy the frontend and update Explorer/submission evidence.

Do not present an address from the reset chain as current.

## Lost or compromised upgrader

- Lost sole upgrader: deploy a replacement contract; do not claim the old
  deployment is recoverable.
- Suspected compromise: stop frontend release actions, preserve evidence,
  deploy/review a replacement, and update all manifests and public links.
- Never place wallet secrets in this repository or recovery documentation.
