# RetractionDependency verification

Checkpoint status: JUDGE_FEEDBACK_REPAIR — POST_DEPLOY_TEST EVIDENCE PREPARATION

Category: `PROJECT`

The prior V1 release evidence remains historical. The V2 judge-feedback repair
received exact-revision Codex and anonymous `PRE_DEPLOY` approval, then the
existing Studionet contract was upgraded and migrated in place. This document
keeps the V1 chronology separate from the new V2 evidence.

## Judge-feedback repair candidate

The candidate closes the requested issues by deriving effective dependency
status from the full accepted history, preserving established invalidation
across later notices and transient source failures, applying a 24-hour
permissionless review cooldown with owner recovery, and rejecting accepted or
conclusively rejected notice replays. The detailed requirement-to-test mapping
is in [`JUDGE-FEEDBACK-REMEDIATION.md`](JUDGE-FEEDBACK-REMEDIATION.md).

Candidate local evidence:

| Check | Result |
|---|---|
| GenVM lint and semantic validation | PASS - 22 methods (11 view, 11 write) |
| Deterministic contract/consensus tests | PASS - 71/71 |
| glsim live-web fixtures and upgrade persistence | PASS - 4/4 |
| Frontend TypeScript and ESLint | PASS |
| Vitest | PASS - 50/50 |
| Production Vite build | PASS |
| Playwright Chromium | PASS - 6/6 |

Candidate source, contract, specification, recovery, remediation-document,
verification, deployment-manifest, and canonical review-manifest hashes are recorded in
`docs/PREDEPLOY-REVIEW-MANIFEST.txt` after the final calculation.

- Candidate source package: `07bfec1a792e2762a09d491d19028df03f3bed9af82e38fa3dd21fc13348779f`
- Contract source: `86152374413bd1cf5d3e2a68e5278130026e6f3d759df17df230fcf0f0cce03a`
- Judge-remediation document: `da80c292ed6aa1384c0ebfc057ce8ac3eb461d0d66400b094a4d13a701dc0362`

### Codex PRE_DEPLOY verdict — V2 judge-feedback repair

Verdict: `APPROVED — PRE_DEPLOY`

This replacement verdict is bound to the candidate source, contract,
specification, recovery, and remediation-document hashes plus the verification
and deployment-manifest hashes in the canonical review manifest. The
specification now identifies the historical V1 target, the PRE_DEPLOY V2
boundary, fresh layout version `2`, and the authorized V1-to-V2 migration.
Codex verified the
judge's full-history, anti-griefing, successive-notice, repeated-request, and
source-failure-recovery requirements; append-only V1-to-V2 storage
compatibility; all local checks in the candidate matrix; production audit with
zero vulnerabilities; public-repository boundary; and secret scan. The
`time.time()` lint warning is accepted because GenVM pins the standard clock
to transaction time for deterministic consensus.

The anonymous co-reviewer also returned `APPROVED — PRE_DEPLOY` for the exact
source package and contract hash above. That approval authorized only the next
checkpoint; the V2 deployment and live behavior are verified separately below.

## V2 judge-feedback POST_DEPLOY evidence

| Evidence | Verified result |
|---|---|
| Contract | `0xcEe31f6b4B1718445b2480C56940cCF72912a410` on Studionet `61999` |
| Upgrade | `0x48d2288668a2a0c4ceb1680e495e63e980a4688dcd532bb61274870a77c3e213`: `FINALIZED`, `MAJORITY_AGREE`, leader `SUCCESS` |
| Migration | `0xd83bf6bce01c512da3922c8e8ecc61c16095edb264e6d6ef2d8a990d588253a1`: `FINALIZED`, `MAJORITY_AGREE`, leader `SUCCESS` |
| Deployed-source parity | 67,985 bytes; SHA-256 `86152374413bd1cf5d3e2a68e5278130026e6f3d759df17df230fcf0f0cce03a`, exact local contract match |
| Configuration readback | `UPGRADABLE`; configured upgrader `0x277bF20771129ae224042d23b0311C1AC5a9AC1b`; layout `2` |
| Preserved state | Five proposals and three dependencies before and after migration |
| Conservative history | Dependency `#2` retains its accepted `INVALID_FOR_CLAIM`; proposal `#4` remains `INVALIDATED` after two later unbound notices |
| Persistent replay history | Dependency `#2` retains both conclusive rejections; the first pair remains blocked after the second rejection |
| Permissionless cooldown | Non-owner second-notice request rolled back during cooldown; proposal owner opened the same review without changing the stored non-owner timestamp |
| Final readback | Dependency `#2`: `IDLE`, round `3`, accepted notices `1`, two conclusive rejections, verdict `INVALID_FOR_CLAIM`; proposal `#4`: revision `8`, `INVALIDATED` |

V2 live transaction sequence:

1. Non-owner request `0x212b9a595853e38ace5d26f026694da8803a1fb6cfc8420b735122fa014d6abe` finalized successfully.
2. Resolution `0x9cc52f74873d14506aae2b0913d532af29e0ef676729c04c37b9abb3de966bca` stored `NOTICE_NOT_BOUND_TO_ORIGINAL`.
3. Replay `0x060894f519b4a1cb8572b81e3ccc78681755829ada78d23afd1d833934dcf41c` rolled back as already conclusively rejected.
4. Permissionless cooldown attempt `0xe0c23fcd87811959306436bad694b999661d3c6b815361bfb0916774bf8e28a0` rolled back.
5. Owner request `0x093c6b1d2fc145d9cd5fc309c251446906901a303846cc507b33ae0adff1800f` opened round `3` despite the permissionless cooldown.
6. Owner resolution `0xc56cfd185bd2a50afbbcfa2198a992fba86972f2d863aa8348d492e026b05451` stored the second conclusive rejection.
7. Earlier-pair replay `0xc0f98f50791eb2e424952a343843755c1cca3df90e819ecacc16286ce7fdf80c` rolled back, proving persistent full-history replay protection.

The exact deployed contract also passed 71 deterministic contract tests,
including successive invalid-to-usable/disputed/source-failure histories,
source-failure recovery, replay, cooldown, owner bypass, the twelve-record cap,
and stale-cache derivation. Live source outages were not manufactured on
Studionet; this evidence claim is limited to deterministic recovery coverage
plus exact deployed-code parity.

### Codex POST_DEPLOY_TEST verdict — V2 judge-feedback repair

Verdict: `APPROVED — POST_DEPLOY_TEST`

This verdict is bound to source package SHA-256
`5bb5e826bb93cf529a0ff99156eb68410a6796a374aab8f6df5e22332b27adb8`,
contract source SHA-256
`86152374413bd1cf5d3e2a68e5278130026e6f3d759df17df230fcf0f0cce03a`,
the transactions and final state readback above, and the component hashes in
`POSTDEPLOY-REVIEW-MANIFEST.txt`.

Codex independently rechecked deployed-source parity, upgrade and migration
authorization, finality, majority agreement, leader execution success, layout
and preserved-state readback, every live anti-griefing scenario, the complete
local release suite, production dependency audit, secret scan, and current
official Studionet network values. No V2 source-failure outage is claimed as a
live test. The independent anonymous co-review subsequently returned
`APPROVED` for the same exact V2 source and POST_DEPLOY evidence package with
no checkpoint-scoped blocker.

## Historical V1 release evidence

## Trust and chain authority

Proposal owners cannot be trusted to decide whether a correction or retraction
invalidates their own frozen literature dependency. Permissionless auditors
cannot be trusted to submit a verdict or arbitrary evidence URL. The contract
derives bounded Crossref and Europe PMC URLs from canonical identifiers,
requires dual binding, evaluates the exact frozen dependency, and has validators
independently refetch and verify every consequence-critical field.

The Intelligent Contract alone changes `EVIDENCE_HOLD`, `ELIGIBLE`, `ACTIVE`,
or `INVALIDATED`. The frontend treats a write as successful only after
`FINALIZED`, `FINISHED_WITH_RETURN`, and method-specific contract readback.

## Local evidence matrix

| Check | Result |
|---|---|
| GenVM lint and validation | PASS - 21 methods (11 view, 10 write) |
| Deterministic contract/consensus tests | PASS - 58 |
| glsim live-web fixtures | PASS - A, B, C with 3/3 agree votes |
| glsim upgrade authorization/persistence rehearsal | PASS |
| Frontend TypeScript | PASS |
| ESLint with zero warnings | PASS |
| Vitest | PASS - 49 |
| Production Vite build | PASS |
| Playwright Chromium | PASS - 6, including multi-provider wallet selection |
| Python dependency consistency | PASS - `pip check` |

Reproduction commands:

```powershell
py -3.13 scripts\lint-contract.py
py -3.13 -m pytest tests\contract -v

glsim --port 4000 --validators 3 --max-rotations 3 --no-browser
gltest tests\integration\test_glsim_live_consensus.py -v

cd frontend
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm run e2e
```

Contract source SHA-256:

`e45f12279e886eeec8e3f2bf18e6f59030077d06787e66511c705d94bfcff769`

PRE_DEPLOY source package SHA-256:

`d460505c41edafa724112061b0b8f37ed1bba2590c9aaa89a2f84c79baaa4082`

Current POST_DEPLOY source package SHA-256:

`1077cb133bd4a471674af97632c72112ba8ceccb23fbed47cc720150c4f44e01`

Current final release-candidate source package SHA-256:

`92c258a6e576e6a59895ccf549aeb98ad3215999e4458784fd2cf1815aac06f3`

The final release-candidate hash differs from the POST_DEPLOY package only
because release hygiene removed trailing whitespace from frontend source,
deployment-local Vercel files were added to the ignore boundary, and the
reviewer-facing README now records public repository/live-web status. Contract
source and deployed-source parity are unchanged. The complete local release
suite was rerun. The exact 40-character commit containing this document is
recorded in the final immutable review package.

## GitHub publication evidence

- Public repository:
  [`ptc123456/retraction-dependency`](https://github.com/ptc123456/retraction-dependency)
- Account/owner: `ptc123456`
- Default branch: `main`
- First public reviewed commit:
  [`b88a9b0f81e1965df29c7156a4bfe06315f0eaa8`](https://github.com/ptc123456/retraction-dependency/commit/b88a9b0f81e1965df29c7156a4bfe06315f0eaa8)
- Repository visibility: `PUBLIC`
- Post-push inspection: root tree, commit history, README headings, tables,
  contract links, deployment links, and verification links rendered on GitHub;
  no forbidden internal files were visible.

This release-metadata successor removes stale pre-push language. The exact
final release commit is recorded in the immutable
`POST_GITHUB_VERCEL_FINAL` package containing this document.

## Vercel production evidence

- Live application:
  [`https://retraction-dependency.vercel.app`](https://retraction-dependency.vercel.app)
- Vercel team/scope: `Shin` / `shingg`
- Vercel project: `retraction-dependency`
- Deployment ID: `dpl_2fwvkndFFJ2REppgBJQ9tNdjNwXb`
- Public-release URL policy: the production alias above is the only Vercel
  application URL presented as public release evidence. Vercel's generated
  deployment hostname and account-level inspector are management surfaces that
  may require team authentication; they are intentionally excluded from the
  public-link evidence set.
- Target/status: `production` / `READY`
- Production environment: `VITE_CONTRACT_ADDRESS` is configured as the
  verified Studionet contract
  `0xcEe31f6b4B1718445b2480C56940cCF72912a410`.
- Remote build: `tsc && vite build` PASS; 1,943 modules transformed.
- Static verification: production bundle contains the exact contract address
  and chain ID `61999`; no Bradbury reference is present.
- HTTP/SPA verification: `/` and `/proposals/1` return HTTP 200 and serve the
  React root.
- Browser verification: the registry read 5 proposals and 3 dependencies from
  Studionet; proposal `#3` read `ACTIVE`, dependency `#1` read `USABLE`, and
  `/guide`, `/methodology`, `/activity`, and `/proposals/3` rendered correctly.
- Anonymous-link verification: fresh requests without cookies or credentials
  returned the application from the production alias and its documented SPA
  routes without a login or SSO redirect. Authenticated Vercel management
  surfaces are not represented as public application links.
- Browser console: no warning or error entries during the live review.

## Studionet deployment evidence

- Contract: [`0xcEe31f6b4B1718445b2480C56940cCF72912a410`](https://explorer-studio.genlayer.com/address/0xcEe31f6b4B1718445b2480C56940cCF72912a410)
- Deployment transaction: [`0xe8f331f421b4f5e580af3b6af395b3cde261cd5919fd2edb67809cb0efebdcff`](https://explorer-studio.genlayer.com/tx/0xe8f331f421b4f5e580af3b6af395b3cde261cd5919fd2edb67809cb0efebdcff)
- Network: GenLayer Studionet, chain ID `61999` (`0xf22f`)
- Transaction status/result: `FINALIZED` / `MAJORITY_AGREE`
- GenVM execution: leader and four validator receipts report `SUCCESS`; no
  error, stderr, error code, or error description
- `from_address` and `origin_address`:
  `0x277bF20771129ae224042d23b0311C1AC5a9AC1b`
- Deployed code SHA-256:
  `e45f12279e886eeec8e3f2bf18e6f59030077d06787e66511c705d94bfcff769`
  — exact parity with the reviewed contract source
- Contract schema: 21 methods
- `get_deployment_config()` readback: classification `UPGRADABLE`, configured
  upgrader `0x277bF20771129ae224042d23b0311C1AC5a9AC1b`, storage layout version `1`
- Initial `get_counts()` readback: zero proposals and zero dependencies
- Initial `get_policy()` readback: policy version `1`, maximum five
  dependencies per proposal and three accepted notices per dependency

The real address is present in ignored local environment files for testing and
in the Vercel production environment for the live build. No placeholder or
example contract address is used by production.

After the real address was configured, the deployment-boundary tests were made
environment-independent: Vitest always exercises the unconfigured boundary,
while Playwright can run both unconfigured and live-address modes. The current
package passes TypeScript, ESLint, Vitest 49/49, production build, Playwright
6/6 unconfigured, and Playwright 6/6 against the real Studionet contract.

The frontend now discovers all installed EIP-6963 providers and legacy
EIP-1193 providers, presents an explicit selector when more than one wallet is
available, and routes account, network, and signing requests through the chosen
provider. MetaMask-specific Snap RPCs are isolated to MetaMask. Other compatible
EVM wallets use their own EIP-1193 signing path. Studionet currently returns
zero for both `eth_gasPrice` and the latest block base fee; the frontend applies
a 1-gwei wallet-facing compatibility floor so OKX and similar wallets do not
stall indefinitely during fee estimation.
Contract reads now retry only transient transport failures (`Failed to fetch`,
connection resets, and timeouts), with a ten-second cap per attempt and one
bounded retry. Deterministic contract errors are never retried. If both attempts
fail, the proposal page preserves an explicit `Retry chain read` action instead
of loading indefinitely or misrepresenting the transport failure as missing
on-chain state. Retry and hanging-request boundaries have Vitest coverage.
Repeated announcements and legacy provider wrappers are deduplicated by the
wallet's reverse-DNS identity, so each installed wallet appears once.
Wallet-returned accounts are normalized to EIP-55 before client creation,
owner-indexed reads, and transaction persistence. This keeps a lowercase OKX
account and the contract's checksum owner key identical during reconciliation.
WalletConnect/mobile QR is not claimed without a separately provisioned
WalletConnect Project ID.

The header labels the raw `get_counts()` values as registered proposals and
registered dependencies. It does not mislabel those totals as active or audited
subsets, which the count method does not return. When RPC reads are unavailable,
the header shows an unknown marker instead of fake zero counts and recovers on
focus, successful chain-state refresh, or a bounded visible-tab interval.

The current frontend adds an in-app Project Guide with the trust problem,
six-step operating flow, state glossary, recovery guidance, and product safety
boundary. The editorial shell now uses a warm ivory, deep blue-green,
terracotta, and spruce palette; a dense colophon exposes network, evidence, and
policy context on every route. README usage documentation and social preview
metadata match the same revision. The sixth public route is covered by unit and
Playwright navigation tests.

Studionet may expose transaction enum values numerically in simplified SDK
receipts (`7` for `FINALIZED`, `1` for `FINISHED_WITH_RETURN`). The frontend
normalizes both numeric and named receipt shapes before applying finality and
execution guards. Locally retained hashes that were rejected only by the older
numeric-status incompatibility are eligible for reconciliation without sending
a duplicate transaction.

Hash-bearing transactions remain recoverable after an SDK polling timeout or
other local failure. Reconciliation is read-only: it rechecks finality,
execution, and method-specific state before changing the local lifecycle, and
never resubmits the write.

The Activity Ledger now exposes its recovery state instead of silently running
a no-op. Its control displays the recoverable hash count, reports how many
hashes were confirmed or remain unresolved, and explicitly distinguishes a
failed pre-submission wallet attempt with no hash from an on-chain transaction.
Clearing confirmed records preserves failed and unresolved evidence.

GenLayerJS defaults to only ten three-second finality polls. The live Studionet
consensus runs exceeded that 30-second window despite finalizing successfully,
so the frontend now polls every three seconds for up to six minutes before
declaring a timeout. This changes only client-side observation; it does not
resubmit, accelerate, or otherwise alter consensus.

Studionet can reject a pre-signing wallet RPC while all eight execution slots
are occupied. The wallet compatibility adapter retries only the exact
`server busy: all ... execution slots occupied, retry later` rejection with
bounded backoff. Wallet rejection and unknown send failures are never retried,
which preserves the duplicate-transaction safety boundary.

Studionet may also omit `txExecutionResult` while reporting execution inside
`consensus_data`. The frontend derives execution success only for
`MAJORITY_AGREE` when the leader and participating `agree` validator receipts
report `SUCCESS`. Validators cancelled after quorum are marked `idle` with
`CONSENSUS_VALIDATOR_QUORUM_REACHED`; those non-participating receipts are not
execution failures. A non-agree consensus or any failure in an effective
receipt remains fail-closed. Hashes rejected only by the former receipt-shape
compatibility gap are reconciled without resubmission.

First external-wallet live write:

- action: `create_proposal`;
- wallet: `0x5D598f10a428fB2039edbC3aCE83351650B286E0`;
- transaction: [`0x2872bc28c037b22a8d8742e3e90a6b153bbd0ea1772481b4b5f9c938dcff091f`](https://explorer-studio.genlayer.com/tx/0x2872bc28c037b22a8d8742e3e90a6b153bbd0ea1772481b4b5f9c938dcff091f);
- RPC result: `FINALIZED`, `MAJORITY_AGREE`, two leader receipts and four
  validator receipts all `SUCCESS`;
- transaction calldata decodes to the locked Fixture A title and claim.

First dependency live write:

- action: `add_dependency` for proposal `#3`;
- transaction: [`0x94b9d308e0b583e7f9acb98458136ac8ca858d6b30dd684aa814ce61f7d40cc2`](https://explorer-studio.genlayer.com/tx/0x94b9d308e0b583e7f9acb98458136ac8ca858d6b30dd684aa814ce61f7d40cc2);
- RPC result: `FINALIZED`, `MAJORITY_AGREE`, three validator agree votes;
- state readback: proposal `#3` revision `2`, dependency `#1`, Fixture A
  identifiers and frozen statement, verdict `UNREVIEWED`;
- the initial SDK wait expired at status `5`; the on-chain write was not
  duplicated and is recoverable through the lifecycle ledger.

First seal live write:

- action: `seal_proposal(3)`;
- transaction: [`0xc54736c60ae6c8c0674757fe965f322595cc6b675f47ce2b343dacad0e0df34e`](https://explorer-studio.genlayer.com/tx/0xc54736c60ae6c8c0674757fe965f322595cc6b675f47ce2b343dacad0e0df34e);
- RPC result: `FINALIZED`, `MAJORITY_AGREE`, all five validator votes
  `agree`, all effective receipts `SUCCESS`;
- state readback: proposal `#3` revision `3`, `sealed=true`, status
  `EVIDENCE_HOLD`; dependency `#1` revision `2`, review `PENDING`, round `1`.

First live consensus resolution:

- action: `resolve_review(1)`;
- transaction: [`0x76c2c3091ffaf9507692450640d5d514f1610f019046302d218a64481e17fcc1`](https://explorer-studio.genlayer.com/tx/0x76c2c3091ffaf9507692450640d5d514f1610f019046302d218a64481e17fcc1);
- RPC result: `FINALIZED`, `MAJORITY_AGREE`; three validator votes `agree`
  and two validators `idle` after quorum; all participating receipts report
  `SUCCESS` with the same contract-state hash;
- state readback: dependency `#1` revision `3`, verdict `USABLE`, one accepted
  notice, review `IDLE`; proposal `#3` revision `4`, status `ELIGIBLE`, with no
  pending review;
- the frontend polling window expired while the transaction was at status `5`;
  the finalized hash and method-specific readback prove that no retry write is
  required.

First live activation:

- action: `activate_proposal(3)`;
- transaction: [`0x21817630eefb44a7f7c4ce0c209303554c71ed7ba3458be68c2d1f899b477530`](https://explorer-studio.genlayer.com/tx/0x21817630eefb44a7f7c4ce0c209303554c71ed7ba3458be68c2d1f899b477530);
- RPC result: `FINALIZED`, `MAJORITY_AGREE`; all five validator votes `agree`,
  all participating execution receipts report `SUCCESS`, and all returned the
  same contract-state hash;
- state readback: proposal `#3` revision `5`, `activated=true`, status `ACTIVE`,
  zero invalid dependencies, and no pending review;
- the frontend polling window expired at status `5`, but finalized execution
  and state readback prove activation succeeded and must not be resubmitted.

## Complete live semantic fixture matrix

Public Studionet reads on the deployed contract confirm all three locked
fixtures reached their Policy V1 consequences through live consensus:

| Fixture | Proposal / dependency | Accepted evidence | Final dependency verdict | Proposal consequence |
|---|---|---|---|---|
| A - unrelated correction | `#3` / `#1` | DOI `10.1371/journal.pntd.0011024`, binding `BOUND`, effect `NO_MATERIAL_EFFECT`, reason `CORRECTION_UNRELATED_TO_DEPENDENCY` | `USABLE` | `ACTIVE` |
| B - material correction | `#4` / `#2` | DOI `10.1371/journal.pntd.0011026`, binding `BOUND`, effect `MATERIALLY_UNDERMINES`, reason `CORRECTION_CHANGES_DEPENDENCY` | `INVALID_FOR_CLAIM` | `INVALIDATED` |
| C - retraction | `#5` / `#3` | DOI `10.1126/sciadv.adv4615`, binding `BOUND`, effect `MATERIALLY_UNDERMINES`, reason `RETRACTION_REMOVES_SUPPORT` | `INVALID_FOR_CLAIM` | `INVALIDATED` |

Each dependency has one accepted evaluation, review round `1`, and review
status `IDLE`. The contract reports five registered proposals and three
registered dependencies. Fixture A demonstrates the usable/activation branch;
Fixtures B and C independently demonstrate correction and retraction
invalidation branches. These values were read directly from
`get_proposal()`, `get_dependency()`, and `get_dependency_history()` after the
transactions finalized.

## Separate safe upgrade rehearsal

The recovery path was exercised on a separate Studionet deployment so the
submission contract and its live fixture state were not placed at risk.

- rehearsal contract: [`0xF666b50B2096fdA2fCa3D7af7DC5BaB6e4907213`](https://explorer-studio.genlayer.com/address/0xF666b50B2096fdA2fCa3D7af7DC5BaB6e4907213);
- rehearsal deployment: [`0x4ace3128a800b07a2e214095e5ca7914f6332f314fdeea228003282cd4b61189`](https://explorer-studio.genlayer.com/tx/0x4ace3128a800b07a2e214095e5ca7914f6332f314fdeea228003282cd4b61189);
- pre-upgrade state creation: [`0x9eabf47f0c99cb4897df7902d90c7d63feed50b4c9ddb101616f0877789fad16`](https://explorer-studio.genlayer.com/tx/0x9eabf47f0c99cb4897df7902d90c7d63feed50b4c9ddb101616f0877789fad16);
- authorized upgrade: [`0xacdf70d1c9c5844da08f38f565e66d3afb5af2a2ee65930522fc2a6330222f1d`](https://explorer-studio.genlayer.com/tx/0xacdf70d1c9c5844da08f38f565e66d3afb5af2a2ee65930522fc2a6330222f1d);
- sender/origin and configured upgrader:
  `0x277bF20771129ae224042d23b0311C1AC5a9AC1b`;
- upgrade result: `FINALIZED`, `MAJORITY_AGREE`; leader and five validators
  report `SUCCESS`, all with state hash
  `b9ff1a78c1f19c6c5811373cf4b05146f40981d847751a3160fc32989e0d81db`;
- post-upgrade code SHA-256:
  `e45f12279e886eeec8e3f2bf18e6f59030077d06787e66511c705d94bfcff769`,
  exactly matching the reviewed contract source;
- post-upgrade configuration: `UPGRADABLE`, layout version `1`, same
  configured upgrader and append-only storage policy;
- persistence readback: counts remain one proposal and zero dependencies;
  proposal `#1` remains revision `1`, `DRAFT`, unsealed, owned by the upgrader,
  with title `Upgrade Rehearsal State` and its exact pre-upgrade claim text.

This satisfies the live authorization, deployed-code parity, and storage
persistence requirements without modifying the production fixture contract.

### Rehearsal draft CRUD evidence

After upgrade persistence was established, the same rehearsal proposal was
used to exercise every remaining draft mutation through the external wallet
and frontend transaction lifecycle:

| Action | Transaction | Finality / execution / readback |
|---|---|---|
| `edit_proposal(1, ...)` | [`0x07d92da942beaaa4613b73d8b655d84ac41ff5a7fa347ff75493a50eb834021e`](https://explorer-studio.genlayer.com/tx/0x07d92da942beaaa4613b73d8b655d84ac41ff5a7fa347ff75493a50eb834021e) | `FINALIZED` / `FINISHED_WITH_RETURN` / `READBACK_CONFIRMED` |
| `add_dependency(1, ...)` | [`0xe8e4f2819d8d1fcfd1370c61b4ba42e875da44f1d4b7c5d47ab3462833d158ba`](https://explorer-studio.genlayer.com/tx/0xe8e4f2819d8d1fcfd1370c61b4ba42e875da44f1d4b7c5d47ab3462833d158ba) | `FINALIZED` / `FINISHED_WITH_RETURN` / `READBACK_CONFIRMED` |
| `edit_dependency(1, ...)` | [`0x645f3b7f6dceea4ec0e1e17268a9159e5f0c6fa5b1c2628a60a85b222a8877f5`](https://explorer-studio.genlayer.com/tx/0x645f3b7f6dceea4ec0e1e17268a9159e5f0c6fa5b1c2628a60a85b222a8877f5) | `FINALIZED` / `FINISHED_WITH_RETURN` / `READBACK_CONFIRMED` |
| `remove_dependency(1, 1)` | [`0x7b0f51f3a81cbc59d2543a1427068a2494049f9c47e009c1b7bbfe028112f747`](https://explorer-studio.genlayer.com/tx/0x7b0f51f3a81cbc59d2543a1427068a2494049f9c47e009c1b7bbfe028112f747) | `FINALIZED` / Explorer `SUCCESS` and `Accepted` / contract readback confirmed |

Final public readback reports proposal `#1` revision `5`, title
`Upgrade Rehearsal Draft CRUD`, `DRAFT`, unsealed, and zero registered
dependencies for that proposal. The remove transaction was retained after a
transient RPC `QueuePool` failure and reconciled without duplicate submission.
The rehearsal contract's cumulative dependency counter remains monotonic; the
proposal-scoped dependency list is empty.

## Permissionless re-review and safe rejected trigger

A wallet that does not own proposal `#3` exercised the later-audit path against
dependency `#1`:

- third-party requester: `0x277bF20771129ae224042d23b0311C1AC5a9AC1b`;
- proposal owner: `0x5D598f10a428fB2039edbC3aCE83351650B286E0`;
- `request_review(1, "10.1371/journal.pntd.0011026", "36584025")`:
  [`0x228ac28ee8a0f54550566d2c42ab2b1ba6d5a03d603fd6929b18cb8202657f3f`](https://explorer-studio.genlayer.com/tx/0x228ac28ee8a0f54550566d2c42ab2b1ba6d5a03d603fd6929b18cb8202657f3f);
- `resolve_review(1)`:
  [`0x9b1b95610d6d719d74688c6976cad3b8c7385983776e0fa2202eed2697c07cec`](https://explorer-studio.genlayer.com/tx/0x9b1b95610d6d719d74688c6976cad3b8c7385983776e0fa2202eed2697c07cec).

Both transactions are `FINALIZED`. Participating leader/validator receipts
report `SUCCESS` with one identical state hash per transaction; idle validators
were cancelled only after quorum. Method-specific readback confirms review
round `2` returned to `IDLE`, accepted notice count remained `1`, dependency
verdict remained `USABLE`, and proposal `#3` returned to `ACTIVE`.
`get_dependency_history(1)` records the attempted notice only as
`latest_rejected_trigger`, with requester `0x277b...AC1b` and rejection code
`NOTICE_NOT_BOUND_TO_ORIGINAL`. No accepted evidence or prior verdict was
overwritten. This proves the advertised permissionless trigger and safe
wrong-subject rejection path end to end.

## Codex PRE_DEPLOY verdict — current revision

Verdict: `APPROVED — PRE_DEPLOY`

This verdict applies only to source package SHA-256
`d460505c41edafa724112061b0b8f37ed1bba2590c9aaa89a2f84c79baaa4082` and
contract source SHA-256
`e45f12279e886eeec8e3f2bf18e6f59030077d06787e66511c705d94bfcff769`.

Codex independently re-ran the repaired revision: GenVM lint and semantic
validation PASS (21 methods, 11 view, 10 write); direct contract loader PASS
(`RetractionDependency` resolves as a `gl.Contract` subclass); contract tests
PASS (58/58); glsim live-web consensus and upgrade persistence PASS (4/4);
frontend typecheck PASS; ESLint PASS with zero warnings; Vitest PASS (25/25);
production build PASS; and Playwright PASS (5/5).

The repair adds backward-compatible normalization for the integer
representation that GenLayer Studio used for the `Address` constructor input,
plus a regression test that exercises the exact integer round-trip. Frontend
source, dependencies, and runtime configuration were unchanged at that
checkpoint, but the source and test revision therefore received new hashes.
The anonymous co-review AI subsequently approved the exact package, and the
successful deployment evidence is recorded below.

Reproduce with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\hash-source.ps1
```

## Final evidence scorecard

Category: `PROJECT`

Validity gate: `PASS`

| Axis | Score | Evidence | Remaining weakness |
|---|---:|---|---|
| GenLayer fit | 5/5 | Consensus-critical semantic decision changes proposal eligibility; all three live semantic fixtures reached the expected on-chain consequences | Studionet persistence is temporary |
| Contract quality | 5/5 | Exact deployed-source parity, independent dual-source validator verification, safe failures, 58 tests, and live upgrade persistence | External Root Slot upgrader remains a disclosed trust authority |
| Engineering | 5/5 | Public reproducible repository, five meaningful commits before final evidence, full local release suite, deployment manifest, recovery runbook, source hashes and clean post-push review | GenVM linter reports a newer runner as informational only |
| Frontend / UX | 5/5 | Production Vercel app reads the exact Studionet deployment; multi-provider wallet journeys, strict finality/execution/readback guards, bounded RPC recovery, SPA deep links, project guide and reconciliation are verified | WalletConnect/mobile QR is not claimed; installed EIP-6963/EIP-1193 wallets are supported |

Overall evidence-based assessment: exceptional GenLayer necessity and contract
rigor, with a complete public product path and unusually strong live evidence.

Submission recommendation: `READY`

## Codex POST_DEPLOY_TEST verdict — current revision

Verdict: `APPROVED — POST_DEPLOY_TEST`

This verdict is bound to source package SHA-256
`1077cb133bd4a471674af97632c72112ba8ceccb23fbed47cc720150c4f44e01`
and contract source SHA-256
`e45f12279e886eeec8e3f2bf18e6f59030077d06787e66511c705d94bfcff769`.

Codex verified exact deployed-source parity, deployment and upgrader readback,
the three live semantic fixture branches, permissionless safe re-review,
authorized upgrade persistence, and every public write method. The final
rehearsal CRUD state is proposal `#1` revision `5` with an empty
proposal-scoped dependency list. Retained hashes were reconciled after
transient Studionet failures; no duplicate write is accepted as evidence.

The final V2 release rerun passed GenVM lint/semantic validation (22 methods),
71 contract tests, TypeScript, ESLint with zero warnings, 50 Vitest tests,
production build, six Playwright flows, `pip check`, secret scanning, and
`npm audit --omit=dev` with zero vulnerabilities. GitHub post-push presentation
and Vercel production/live-read checks also PASS.

## POST_DEPLOY_TEST closure

Codex and the anonymous co-review AI both returned
`APPROVED — POST_DEPLOY_TEST` for source package SHA-256
`5bb5e826bb93cf529a0ff99156eb68410a6796a374aab8f6df5e22332b27adb8`
and contract-source SHA-256
`86152374413bd1cf5d3e2a68e5278130026e6f3d759df17df230fcf0f0cce03a`.
The anonymous review reported no checkpoint-scoped blocker. This closes the
live-integration checkpoint only; it is not final completion approval.

Submission recommendation: READY for independent
`POST_GITHUB_VERCEL_FINAL` review. Final completion remains pending until Codex
and the anonymous co-review AI both return `APPROVED` for one exact public
revision and evidence package.

## POST_GITHUB_VERCEL_FINAL candidate

The public V2 implementation was pushed at commit
`80dd6ee89e820d728be8f5fb1410f1e573bf4848`. Vercel Git integration uses
`frontend` as its Root Directory, and the `READY` production build is aliased
to `https://retraction-dependency.vercel.app`. Its application bundle
`index-DXxQeneq.js` has SHA-256
`7c3d3feaeac9f50669add94ce3cc417edc32861e267c64d50584a8bedac3d2a0`,
which matches the local production build byte-for-byte and contains the exact
Studionet contract address.

Final completion remains pending the exact-revision Codex and anonymous
`POST_GITHUB_VERCEL_FINAL` verdicts. No final or `DUAL_APPROVED` claim is made
by this candidate document.

## Known limitations

- Studionet persistence is temporary.
- Local glsim tests use live Crossref/Europe PMC web responses but deterministic
  mocked LLM responses. The deployed Studionet fixture matrix separately proves
  live semantic-provider behavior for all three locked evidence branches.
- Crossref and Europe PMC availability/schema stability are external
  dependencies; failures resolve safely but may delay liveness.
- The configured Root Slot upgrader can replace contract code and is a disclosed
  trust authority.
- React Router was completely removed from production dependencies and source code to eliminate GHSA-qwww-vcr4-c8h2.
  `npm audit --omit=dev` reports 0 production vulnerabilities.

## PRE_DEPLOY closure

Codex and the anonymous co-review AI both returned `APPROVED — PRE_DEPLOY` for
source package
`d460505c41edafa724112061b0b8f37ed1bba2590c9aaa89a2f84c79baaa4082` and
contract source
`e45f12279e886eeec8e3f2bf18e6f59030077d06787e66511c705d94bfcff769`.
The Studio screenshot and RPC transaction confirm the selected wallet and
Studionet deployment target were used.

Selected deployment/upgrader wallet:

`0x277bf20771129ae224042d23b0311c1ac5a9ac1b`

Pre-deploy public RPC verification confirmed Studionet chain ID `61999`
(`0xf22f`) and a non-zero wallet balance. No private key, seed phrase, or other
credential is stored or required.

The user explicitly authorized deployment of RetractionDependency to
Studionet chain ID `61999` from the selected wallet, using that same address as
the upgrader. This authorization does not bypass anonymous `PRE_DEPLOY` review
or the final visible wallet/network check before signing.

## Revision repair note

The first Studio schema check on the prior revision returned `no contract
defined` because `RetractionDependency` did not extend `gl.Contract`. Codex
took over after three failed Antigravity attempts for the same acceptance
criterion and applied the minimal inheritance correction. The corrected
revision passes local lint/validation and direct contract loading, and Studio
now exposes the `upgrader_address` constructor field and Deploy control.

The prior anonymous `PRE_DEPLOY` approval covered source hash
`3f0b7593c7ab1a0c69e7e41e81cdf89d2ad4d2fb9c7b0df23d0851e52b4d3055` and was not
valid for the corrected source. The corrected package later received a fresh
anonymous `PRE_DEPLOY` approval before the successful deployment recorded
above.

## Studionet constructor failure and repair

Two user-run Studionet deployment attempts from the authorized wallet reached
consensus but failed during GenVM constructor execution because Studio supplied
`upgrader_address` as an integer to `Address(...)`:

- `0xcb666e9b1c57d85aeab03fb2d6f00b23520a7154424d42bae630f04d576ffd16`
- `0x4ff5c9135f64b5723334ed01f1cf9b898b630579ccf7d42a44b4740a3b93eb1c`

Both attempts produced `OverflowError: cannot fit 'int' into an index-sized
integer`, empty contract state, and no accepted contract address. They are
retained as failed diagnostic evidence only and must not be used by the
frontend or submission package.
