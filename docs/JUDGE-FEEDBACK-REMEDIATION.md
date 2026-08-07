# Judge feedback remediation

This document maps the single resubmission request to implemented contract
behavior, reproducible tests, and the verified Studionet V2 upgrade. The exact
contract source received Codex and anonymous PRE_DEPLOY approval before the
authorized upgrade and migration.

## 1. Conservative dependency status

The effective dependency verdict is derived from the complete accepted
on-chain evaluation history. Policy V1 applies this precedence:

1. `INVALID_FOR_CLAIM`
2. `UNRESOLVED`
3. `DISPUTED`
4. `USABLE`
5. `UNREVIEWED`

Therefore, once any accepted bound notice establishes
`INVALID_FOR_CLAIM`, a later usable correction, disputed result, unbound
notice, or transient source failure cannot restore the dependency or proposal.
Proposal status and invalid-dependency counts use the same derived value rather
than trusting a cached latest verdict.

## 2. Permissionless anti-griefing

Permissionless review requests have a 24-hour cooldown per dependency. The
cooldown timestamp is stored on-chain and exposed by `get_dependency`; callers
cannot bypass it through the frontend. The proposal owner is exempt so a
transient Crossref or Europe PMC failure can be retried immediately.

An accepted DOI/PMID notice pair cannot be replayed. The contract permanently
retains up to twelve conclusive rejection records per dependency, so an older
pair remains blocked after intervening rejections. At the cap, new review
requests fail closed rather than evicting replay protection. Only explicitly
retryable source failures may reuse the same pair. Concurrent requests remain
rejected while a review is pending, and `resolve_review` remains permissionless
so no requester receives exclusive resolution authority.

## 3. Required regression coverage

| Requested scenario | Test coverage |
|---|---|
| Successive notices | invalid -> usable, invalid -> disputed, invalid -> source failure |
| Repeated requests | pending rejection, cooldown, owner bypass, accepted replay rejection, earlier conclusive replay after an intervening rejection, and fail-closed twelve-entry cap |
| Source-failure recovery | source failure -> `EVIDENCE_HOLD` -> owner retries same notice -> accepted `USABLE` result |
| Upgrade/stale cache | views rederive invalidation from accepted history even if the cached verdict is stale |

Reproduce locally:

```powershell
wsl.exe bash -lc "cd /mnt/e/Genlayer-Projects/retraction-dependency && uv run --python 3.13 --with genlayer-test==0.29.2 --with pytest pytest tests/contract -q"

$env:PYTHONIOENCODING='utf-8'
genvm-lint check contracts\retraction_dependency.py
```

Expected result: `71 passed`; GenVM lint and validation PASS with 22 public
methods (11 view, 11 write). The `time.time()` lint warning is expected: GenVM
pins the standard clock to the transaction datetime, making the cooldown value
deterministic for consensus.

## 4. Storage migration

V2 appends `permissionless_review_last_requested_at` and
`conclusive_rejected_triggers` after all V1 fields. It does not reorder, remove,
or change an existing field. An authorized,
idempotence-guarded `migrate_v2()` advances an upgraded V1 deployment from
storage layout version 1 to 2. Fresh deployments start at V2.

The Studionet release is accepted only after the exact reviewed source is
upgraded, `migrate_v2()` finalizes successfully, source parity is confirmed,
and live readback demonstrates the conservative-history and anti-griefing
behavior.

The integration suite retries at most twice after the contract reports an
explicit retryable source failure. Each retry is a separate owner-authorized
review round and preserves the same fail-safe contract behavior; semantic or
conclusive failures are never retried. Playwright uses a dedicated strict port
and never reuses an existing development server.

## 5. Studionet V2 evidence

Contract: `0xcEe31f6b4B1718445b2480C56940cCF72912a410` on Studionet
chain ID `61999`.

| Check | Transaction | Verified result |
|---|---|---|
| Authorized V2 upgrade | `0x48d2288668a2a0c4ceb1680e495e63e980a4688dcd532bb61274870a77c3e213` | `FINALIZED`, `MAJORITY_AGREE`, leader `SUCCESS`, exact deployed-source SHA-256 `86152374413bd1cf5d3e2a68e5278130026e6f3d759df17df230fcf0f0cce03a` |
| V1-to-V2 migration | `0xd83bf6bce01c512da3922c8e8ecc61c16095edb264e6d6ef2d8a990d588253a1` | `FINALIZED`, `MAJORITY_AGREE`, leader `SUCCESS`, layout `2`, counts preserved at five proposals and three dependencies |
| Non-owner request | `0x212b9a595853e38ace5d26f026694da8803a1fb6cfc8420b735122fa014d6abe` | First permissionless request accepted; cooldown timestamp stored |
| Unbound notice resolution | `0x9cc52f74873d14506aae2b0913d532af29e0ef676729c04c37b9abb3de966bca` | Conclusive `NOTICE_NOT_BOUND_TO_ORIGINAL` recorded without clearing the established invalidation |
| Rejected-pair replay | `0x060894f519b4a1cb8572b81e3ccc78681755829ada78d23afd1d833934dcf41c` | Expected rollback: conclusively rejected notice cannot be replayed |
| Permissionless cooldown | `0xe0c23fcd87811959306436bad694b999661d3c6b815361bfb0916774bf8e28a0` | Expected rollback while the 24-hour cooldown is active |
| Owner recovery request | `0x093c6b1d2fc145d9cd5fc309c251446906901a303846cc507b33ae0adff1800f` | Owner opened the next review during the permissionless cooldown |
| Owner resolution | `0xc56cfd185bd2a50afbbcfa2198a992fba86972f2d863aa8348d492e026b05451` | Second conclusive rejection stored; established invalidation preserved |
| Earlier rejection replay after intervening rejection | `0xc0f98f50791eb2e424952a343843755c1cca3df90e819ecacc16286ce7fdf80c` | Expected rollback; the first rejected pair remains permanently blocked |

Final contract readback reports layout `2`, five proposals, three dependencies,
two retained conclusive rejections for dependency `#2`, and one accepted
invalidating evaluation. Dependency `#2` remains `INVALID_FOR_CLAIM`; proposal
`#4` remains `INVALIDATED`. The non-owner cooldown timestamp is unchanged by
the owner-exempt round.

Source-failure recovery is proved by the deterministic contract suite and the
exact deployed-source match. No artificial Studionet outage was claimed or
induced: the live network evidence instead covers conservative history,
replay protection, cooldown, and owner recovery without weakening production
source handling.
