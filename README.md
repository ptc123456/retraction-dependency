# RetractionDependency

RetractionDependency is a GenLayer research-literature auditor that turns a
bound correction or retraction into an enforceable proposal-eligibility
decision on Studionet.

## Verified links

- Public repository:
  [`ptc123456/retraction-dependency`](https://github.com/ptc123456/retraction-dependency)
- Studionet contract:
  [`0xcEe31f6b4B1718445b2480C56940cCF72912a410`](https://explorer-studio.genlayer.com/address/0xcEe31f6b4B1718445b2480C56940cCF72912a410)
- Deployment transaction:
  [`0xe8f331f421b4f5e580af3b6af395b3cde261cd5919fd2edb67809cb0efebdcff`](https://explorer-studio.genlayer.com/tx/0xe8f331f421b4f5e580af3b6af395b3cde261cd5919fd2edb67809cb0efebdcff)
- Network: GenLayer Studionet, chain ID `61999` (`0xf22f`)
- Live app:
  [`https://retraction-dependency.vercel.app`](https://retraction-dependency.vercel.app)

## Trust problem

A proposal owner should not decide whether a correction or retraction
invalidates the owner's own frozen literature dependency. A permissionless
auditor should not be able to inject a verdict, choose an arbitrary evidence
URL, or redirect the review to a different paper. A frontend operator should
not be able to replace the consensus result with an off-chain LLM answer.

RetractionDependency freezes the exact claim and dependency on-chain, derives
bounded Crossref and Europe PMC evidence URLs from canonical DOI/PMID pairs,
and lets GenLayer validators independently decide whether the notice changes
the exact proposition being relied upon.

## Why GenLayer is essential

Bibliographic APIs can show that two records are linked, but they cannot
deterministically decide whether corrected prose, a changed threshold, or a
retraction materially removes support for one frozen dependency statement. A
single hosted model would merely move that trust to one operator.

The Intelligent Contract owns the nondeterministic evidence fetch, semantic
decision, validator equivalence check, verdict, and state transition. Its
consensus result changes a real on-chain consequence:

- `USABLE` dependencies can make a sealed proposal `ELIGIBLE`;
- pending, disputed, or unresolved evidence keeps it in `EVIDENCE_HOLD`;
- any `INVALID_FOR_CLAIM` dependency makes it `INVALIDATED`;
- only an `ELIGIBLE` proposal can become `ACTIVE`.

The product does not determine misconduct, fraud, legal liability, or medical
truth. It answers one bounded policy question: whether a named paper may still
support one frozen dependency after a bound correction or retraction.

## How it works

### Proposal owner

1. Connect a compatible injected EVM wallet and switch to Studionet.
2. Create a narrow claim and register one to five exact literature
   dependencies.
3. Edit the draft if needed, then seal it. Sealing freezes the proposal and
   opens each initial review.
4. Resolve the reviews. If every dependency is `USABLE`, activate the
   `ELIGIBLE` proposal.

### Permissionless auditor

1. Open any sealed dependency.
2. Request a new review using the DOI/PMID of a later correction or retraction.
3. Resolve the review; the contract, not the caller, derives the verdict and
   applies the proposal consequence.

### Interrupted user

Open **Activity Ledger** and run reconciliation. It is read-only: the app
rechecks an existing transaction hash, execution result, and contract state.
It never resubmits a write. A failed wallet attempt with no returned hash is
shown separately because no on-chain transaction exists to resume.

## Architecture

```text
Browser wallet
  -> React/Vite dApp
      -> genlayer-js (Studionet reads, writes, finality, reconciliation)
          -> RetractionDependency Intelligent Contract
              -> derived Crossref + Europe PMC requests
              -> leader semantic evaluation
              -> validator refetch and equivalence verification
              -> on-chain verdict and proposal state
```

The contract is the source of truth for proposals, dependencies, evidence
history, verdicts, and consequences. The frontend owns only interaction state,
wallet selection, and a local ledger of submitted transaction hashes. There is
no backend, relayer, cron job, or off-chain verdict database.

## Intelligent Contract

The contract exposes 11 view methods and 10 write methods. Its primary flow is:

```text
DRAFT
  -> seal_proposal
  -> EVIDENCE_HOLD
      -> ELIGIBLE -> activate_proposal -> ACTIVE
      -> INVALIDATED
```

Draft methods are `create_proposal`, `edit_proposal`, `add_dependency`,
`edit_dependency`, and `remove_dependency`. After sealing,
`request_review` is permissionless and `resolve_review` runs full consensus.
The caller never supplies the verdict.

Policy V1 requires exact original and notice DOI/PMID binding, a Crossref
update relation, a corresponding Europe PMC correction/retraction relation,
bounded open notice text, and independent validator comparison of every
consequence-critical field. Missing, malformed, oversized, conflicting, or
unsupported evidence fails safely.

The tenth write is the operational `upgrade(bytes)` recovery path. It is not a
public product action and is absent from the dApp. The constructor registers
the user-confirmed external wallet in the GenVM Root Slot upgrader list. That
wallet can replace code and is therefore a disclosed trust authority; it
cannot inject a normal application verdict.

## Transaction lifecycle

Every frontend write follows the same boundary:

1. obtain an explicit wallet signature;
2. retain the returned transaction hash under chain `61999` and the configured
   contract address;
3. poll up to six minutes for `FINALIZED`;
4. require `FINISHED_WITH_RETURN`, including equivalent verified consensus
   receipt shapes;
5. perform method-specific contract readback before showing success.

A timeout is not success and does not trigger resubmission. Transient reads
receive one bounded retry. Activity reconciliation remains idempotent,
restart-safe, and duplicate-safe.

## Run locally

Requirements: Node.js/npm, Python 3.13, `genlayer-test` with simulator support,
and an injected EIP-1193 browser wallet for live writes.

```powershell
cd frontend
Copy-Item .env.example .env
# Set VITE_CONTRACT_ADDRESS only to the verified Studionet contract address.
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Public reads work without a wallet. Live writes
require Studionet chain ID `61999` and a funded test wallet.

Repository layout:

```text
contracts/                  Intelligent Contract source
frontend/src/               React application
frontend/e2e/               Playwright journeys
tests/contract/             deterministic contract tests
tests/integration/          glsim live-web consensus tests
scripts/                    lint and reproducible hashing
docs/                       verification, deployment, and recovery evidence
```

## Tests and verification

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

Current verified results:

- GenVM lint/validation: PASS, 21 methods;
- deterministic contract tests: PASS, 58/58;
- glsim live-web fixtures and upgrade persistence: PASS, 4/4;
- TypeScript and ESLint: PASS;
- Vitest: PASS, 49/49;
- Vite production build: PASS;
- Playwright Chromium: PASS, 6/6.

The integration suite fetches live Crossref and Europe PMC responses, mocks
only local LLM responses, and asserts three simulator consensus votes plus
contract readback. Full evidence and exact hashes are in
[`docs/VERIFICATION.md`](docs/VERIFICATION.md).

## Deployment

The production candidate contract is deployed and source-verified on
Studionet. `gen_getContractCode` hashes to
`e45f12279e886eeec8e3f2bf18e6f59030077d06787e66511c705d94bfcff769`,
matching [`contracts/retraction_dependency.py`](contracts/retraction_dependency.py).

All three locked fixtures reached their expected live consequences:

| Fixture | Evidence notice | Dependency verdict | Proposal state |
|---|---|---|---|
| A: unrelated correction | `10.1371/journal.pntd.0011024` | `USABLE` | `ACTIVE` |
| B: material correction | `10.1371/journal.pntd.0011026` | `INVALID_FOR_CLAIM` | `INVALIDATED` |
| C: retraction | `10.1126/sciadv.adv4615` | `INVALID_FOR_CLAIM` | `INVALIDATED` |

A separate rehearsal deployment passed an authorized code upgrade with exact
post-upgrade source parity and preserved pre-existing proposal state. See
[`docs/DEPLOYMENT-MANIFEST.md`](docs/DEPLOYMENT-MANIFEST.md) and
[`docs/RECOVERY.md`](docs/RECOVERY.md).

The application is Studionet-only:

- RPC: `https://studio.genlayer.com/api`;
- Explorer: `https://explorer-studio.genlayer.com`;
- `VITE_CONTRACT_ADDRESS`: required, with no fallback or example address.

The production frontend is deployed from `frontend` with `npm run build` and
the `dist` output directory. `frontend/vercel.json` preserves SPA deep links.
Vercel production environment `VITE_CONTRACT_ADDRESS` is bound to the verified
Studionet contract above.

## Security and trust boundaries

- Proposal owners cannot edit or add dependencies after sealing.
- Auditors cannot submit a verdict or arbitrary evidence URL.
- Validators independently refetch and evaluate consequence-critical fields.
- Conflicting or incomplete evidence fails closed.
- The frontend never treats a hash, finality alone, or a failed execution as
  success.
- No private key, seed phrase, wallet export, API key, or token belongs in the
  repository.
- The configured upgrader is powerful and external; upgrades require the
  reviewed recovery procedure and fresh evidence.

## Known limitations

- Studionet persistence is temporary and is not a production durability claim.
- Crossref and Europe PMC availability and schemas are external dependencies;
  safe failure can delay liveness.
- Local glsim semantic tests mock LLM responses; live Studionet fixtures provide
  the separate real-provider evidence.
- WalletConnect/mobile QR is not claimed because no WalletConnect Project ID is
  provisioned. Installed EIP-6963/EIP-1193 wallets are supported.
- The configured Root Slot upgrader remains a disclosed trust authority.
- Final dual approval remains pending. The public GitHub repository and live
  Vercel application are available from **Verified links** above.

## License

MIT. See [`LICENSE`](LICENSE).

## References

- [GenLayer networks](https://docs.genlayer.com/developers/networks)
- [Intelligent Contracts introduction](https://docs.genlayer.com/developers/intelligent-contracts/introduction)
- [Decentralized application architecture](https://docs.genlayer.com/developers/decentralized-applications/architecture-overview)
- [Crossref REST API](https://api.crossref.org)
- [Europe PMC REST API](https://europepmc.org/RestfulWebService)
