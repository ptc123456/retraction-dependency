# RetractionDependency deployment manifest

Status: LIVE_VERIFIED — CODEX AND ANONYMOUS POST_DEPLOY_TEST APPROVED

This document is secret-free. Never add a private key, seed phrase, API key,
wallet backup, or access token.

## Deployed contract

| Field | Value |
|---|---|
| Network | GenLayer Studionet |
| Chain ID | `61999` (`0xf22f`) |
| RPC | `https://studio.genlayer.com/api` |
| Explorer | `https://explorer-studio.genlayer.com` |
| Contract | `RetractionDependency` |
| Classification | `UPGRADABLE` |
| Constructor arguments | One external user-controlled upgrader address |
| Selected deployment wallet | `0x277bf20771129ae224042d23b0311c1ac5a9ac1b` (external user-controlled wallet) |
| Selected upgrader wallet | `0x277bf20771129ae224042d23b0311c1ac5a9ac1b` (same external user-controlled wallet) |
| Wallet/network verification | Studio screenshot and public RPC confirm chain `0xf22f` / `61999` and the selected wallet |
| User deployment authorization | CONFIRMED - deploy RetractionDependency to Studionet 61999 from the selected wallet with the same address as upgrader |
| PRE_DEPLOY source package SHA-256 | `d460505c41edafa724112061b0b8f37ed1bba2590c9aaa89a2f84c79baaa4082` |
| Current POST_DEPLOY source package SHA-256 | `1077cb133bd4a471674af97632c72112ba8ceccb23fbed47cc720150c4f44e01` |
| Current GitHub-preparation source package SHA-256 | `a7c4785162fb1130cea5b866a0b40c3d7f949363eeaa3854bfe6738468d74475` |
| Contract source SHA-256 | `e45f12279e886eeec8e3f2bf18e6f59030077d06787e66511c705d94bfcff769` |
| Exact Git commit | Current `main` HEAD; exact 40-character SHA is recorded in the pre-push report and final immutable review package |
| Contract address | `0xcEe31f6b4B1718445b2480C56940cCF72912a410` |
| Deployment transaction | `0xe8f331f421b4f5e580af3b6af395b3cde261cd5919fd2edb67809cb0efebdcff` |
| Explorer evidence | [Contract](https://explorer-studio.genlayer.com/address/0xcEe31f6b4B1718445b2480C56940cCF72912a410) / [transaction](https://explorer-studio.genlayer.com/tx/0xe8f331f421b4f5e580af3b6af395b3cde261cd5919fd2edb67809cb0efebdcff) |
| Separate rehearsal contract | `0xF666b50B2096fdA2fCa3D7af7DC5BaB6e4907213` |
| Rehearsal deployment transaction | `0x4ace3128a800b07a2e214095e5ca7914f6332f314fdeea228003282cd4b61189` |
| Authorized upgrade transaction | `0xacdf70d1c9c5844da08f38f565e66d3afb5af2a2ee65930522fc2a6330222f1d` |
| Upgrade rehearsal result | PASS - `FINALIZED`, `MAJORITY_AGREE`, all effective receipts `SUCCESS`, exact code parity and state persistence |
| Rehearsal draft CRUD | PASS - edit proposal, add/edit/remove dependency, exact finality/execution/readback evidence |
| Live web | NOT YET CREATED — POST_GITHUB_VERCEL_FINAL |

The selected deployment wallet and upgrader are the same external
user-controlled wallet. Codex and the anonymous co-review AI approved the exact
pre-deploy source package before the user submitted the transaction. The Studio
screenshot and RPC transaction both identify the selected wallet and Studionet.

RPC verification for the successful deployment shows `FINALIZED`,
`MAJORITY_AGREE`, no transaction error, and `SUCCESS` execution receipts from
the leader and all four validators. Both `from_address` and `origin_address`
are `0x277bF20771129ae224042d23b0311C1AC5a9AC1b`.

`gen_getContractCode` reproduces contract SHA-256
`e45f12279e886eeec8e3f2bf18e6f59030077d06787e66511c705d94bfcff769`.
`get_deployment_config()` returns classification `UPGRADABLE`, storage layout
version `1`, and the selected wallet as `configured_upgrader`.

The prior user-run deployment attempts reached consensus but failed during
constructor execution because Studio serialized the Address constructor input
as an integer. Those failed transaction hashes are diagnostic only; no
contract address from them is accepted or wired into the frontend.

The source package hash is reproducible with
`powershell -ExecutionPolicy Bypass -File scripts\hash-source.ps1`. It covers
contract, frontend source/E2E, tests, scripts, root public files, and build/test
configuration; it excludes internal governance documents, dependencies, caches,
and build output.

The current POST_DEPLOY package adds deterministic test isolation, live-address
E2E mode, multi-wallet EIP-6963/EIP-1193 discovery, and a wallet-facing gas
compatibility floor for Studionet's zero-price RPC response. Compatible EVM
wallets retain direct signing through their selected provider; MetaMask keeps
its additional Snap bootstrap. Wallet account strings are normalized to EIP-55
before owner-indexed reads so providers that return lowercase accounts reconcile
against the contract's checksum owner key. The contract source remains byte-identical to
the reviewed and deployed contract hash.
Transient RPC read failures receive a ten-second per-attempt timeout and one
bounded retry, then expose a manual `Retry chain read` recovery control;
deterministic contract errors remain single-attempt failures.
Finality polling uses a three-second interval for up to six minutes, replacing
the SDK's 30-second default observation window without changing transaction
submission or consensus behavior.
Exact pre-signing Studionet execution-slot capacity rejections receive bounded
backoff; wallet rejection and unknown send errors remain non-retryable.

## Separate upgrade rehearsal evidence

The authorized recovery path was tested on rehearsal contract
[`0xF666b50B2096fdA2fCa3D7af7DC5BaB6e4907213`](https://explorer-studio.genlayer.com/address/0xF666b50B2096fdA2fCa3D7af7DC5BaB6e4907213),
deployed by transaction
[`0x4ace3128a800b07a2e214095e5ca7914f6332f314fdeea228003282cd4b61189`](https://explorer-studio.genlayer.com/tx/0x4ace3128a800b07a2e214095e5ca7914f6332f314fdeea228003282cd4b61189).
Proposal `#1` was created before upgrade by transaction
[`0x9eabf47f0c99cb4897df7902d90c7d63feed50b4c9ddb101616f0877789fad16`](https://explorer-studio.genlayer.com/tx/0x9eabf47f0c99cb4897df7902d90c7d63feed50b4c9ddb101616f0877789fad16).

The configured upgrader then called the contract recovery method in
[`0xacdf70d1c9c5844da08f38f565e66d3afb5af2a2ee65930522fc2a6330222f1d`](https://explorer-studio.genlayer.com/tx/0xacdf70d1c9c5844da08f38f565e66d3afb5af2a2ee65930522fc2a6330222f1d).
RPC verification reports `FINALIZED`, `MAJORITY_AGREE`, and `SUCCESS` for the
leader and all five validators. The post-upgrade deployed code hash remains
`e45f12279e886eeec8e3f2bf18e6f59030077d06787e66511c705d94bfcff769`.
Configuration remains `UPGRADABLE`, layout version `1`, with upgrader
`0x277bF20771129ae224042d23b0311C1AC5a9AC1b`. Counts remain one proposal and
zero dependencies; proposal `#1` retains its exact owner, title, claim,
revision, seal state, and `DRAFT` status. The production fixture contract was
not upgraded.

After that persistence checkpoint, proposal `#1` exercised the complete draft
CRUD surface through the frontend and external wallet:

- edit proposal:
  `0x07d92da942beaaa4613b73d8b655d84ac41ff5a7fa347ff75493a50eb834021e`;
- add dependency:
  `0xe8e4f2819d8d1fcfd1370c61b4ba42e875da44f1d4b7c5d47ab3462833d158ba`;
- edit dependency:
  `0x645f3b7f6dceea4ec0e1e17268a9159e5f0c6fa5b1c2628a60a85b222a8877f5`;
- remove dependency:
  `0x7b0f51f3a81cbc59d2543a1427068a2494049f9c47e009c1b7bbfe028112f747`.

All four writes finalized successfully. The frontend lifecycle ledger confirmed
method-specific readback for the first three. Explorer reports the removal as
`FINALIZED`, `SUCCESS`, and `Accepted`; public contract readback reports
proposal revision `5` and an empty proposal-scoped dependency list. A transient
RPC failure was reconciled against the retained removal hash without duplicate
submission.

## Storage compatibility plan

Storage layout version: `1`.

Existing contract storage fields, in order:

1. `proposals`
2. `dependencies`
3. `proposal_dependency_ids`
4. `dependency_evaluations`
5. `latest_rejected_triggers`
6. `owner_proposal_ids`
7. `proposal_count`
8. `dependency_count`
9. `configured_upgrader`
10. `storage_layout_version`

Future upgrades must not reorder, remove, or change the type of any existing
field. New fields may be appended only. Any incompatible migration requires a
new Codex-approved migration plan and separate deployment.

## Linked configuration

This is a single-contract architecture. There are no linked writers,
registries, child contracts, bounties, or funding transactions.

The real contract address is configured only in the ignored local
`frontend/.env` for POST_DEPLOY testing. Vercel/production configuration remains
unset until live acceptance and the later Vercel identity/confirmation gate.

## Remaining release evidence

- final source commit and hash after the user selects and confirms the GitHub account;
- frontend/Vercel production address configuration record after the user selects
  and confirms the Vercel account/team;
- `POST_GITHUB_VERCEL_FINAL` dual review for one exact public revision and live URL.

The completed POST_DEPLOY_TEST approval is bound to source package SHA-256
`1077cb133bd4a471674af97632c72112ba8ceccb23fbed47cc720150c4f44e01`
and canonical evidence-package SHA-256
`93ba9546e6d44ca19a70541ffafacbcfc9818d85feda7b38fb46838606d140c6`.
It does not approve the later GitHub/Vercel release revision.
