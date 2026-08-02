import pytest
from pathlib import Path
from gltest.direct import VMContext, create_address, deploy_contract

CONTRACT_PATH = str(Path(__file__).parent.parent.parent / "contracts" / "retraction_dependency.py")

ORIGINAL_DOI = "10.1371/journal.pntd.0009591"
ORIGINAL_PMID = "34280196"
NOTICE_DOI = "10.1371/journal.pntd.0011024"
NOTICE_PMID = "36584006"
DEPENDENCY_TEXT = "The study reports genetic evidence that the P.1 variant circulated in Northeast Brazil."


@pytest.fixture(autouse=True)
def reset_contract_registry():
    try:
        import genlayer.gl.genvm_contracts as gc

        gc.__known_contract__ = None
    except Exception:
        pass
    yield
    try:
        import genlayer.gl.genvm_contracts as gc

        gc.__known_contract__ = None
    except Exception:
        pass


def deploy(vm: VMContext, owner):
    with vm.prank(owner):
        return deploy_contract(CONTRACT_PATH, vm, owner)


def deploy_with_integer_address(vm: VMContext, owner):
    owner_integer = int(str(owner), 16)
    with vm.prank(owner):
        return deploy_contract(CONTRACT_PATH, vm, owner_integer)


def create_proposal(contract, suffix: str = "A"):
    return contract.create_proposal(
        f"Retraction dependency proposal {suffix}",
        f"This exact proposal claim is long enough for deterministic contract testing {suffix}.",
    )


def add_dependency(
    contract,
    proposal_id,
    suffix: str = "",
    notice_doi: str = NOTICE_DOI,
    notice_pmid: str = NOTICE_PMID,
):
    original_doi = ORIGINAL_DOI if not suffix else f"10.1000/original_{suffix}"
    original_pmid = ORIGINAL_PMID if not suffix else str(70000000 + int(suffix))
    return contract.add_dependency(
        proposal_id,
        original_doi,
        original_pmid,
        f"{DEPENDENCY_TEXT} Dependency slot {suffix or 'primary'}.",
        notice_doi,
        notice_pmid,
    )


def set_verdict(contract, dependency_id, verdict: str):
    dependency = contract.dependencies[dependency_id]
    dependency.verdict = verdict
    dependency.review_status = "IDLE"
    contract.dependencies[dependency_id] = dependency


class TestProposalAndDependencyInputs:
    def test_constructor_accepts_studio_integer_address_roundtrip(self):
        vm = VMContext()
        owner = create_address("studio-integer-address")
        contract = deploy_with_integer_address(vm, owner)

        with vm.prank(owner):
            config = contract.get_deployment_config()
            assert config["configured_upgrader"].lower() == str(owner).lower()

    def test_policy_counts_creation_and_normalization(self):
        vm = VMContext()
        owner = create_address("owner1")
        contract = deploy(vm, owner)

        with vm.prank(owner):
            policy = contract.get_policy()
            assert policy["policy_version"] == 1
            assert policy["max_dependencies_per_proposal"] == 5
            assert policy["max_notices_per_dependency"] == 3
            assert policy["supported_update_types"] == ["correction", "retraction"]
            assert contract.get_counts() == {"proposals": 0, "dependencies": 0}

            proposal_id = contract.create_proposal(
                "  Genomics Study  ",
                "  This normalized proposal claim satisfies the complete Policy V1 bounds.  ",
            )
            proposal = contract.get_proposal(proposal_id)
            assert proposal["title"] == "Genomics Study"
            assert proposal["claim_text"] == "This normalized proposal claim satisfies the complete Policy V1 bounds."
            assert proposal["status"] == "DRAFT"
            assert proposal["revision"] == 1

    @pytest.mark.parametrize(
        "title,claim",
        [
            ("", "This proposal claim is otherwise long enough for validation."),
            ("ab", "This proposal claim is otherwise long enough for validation."),
            ("x" * 121, "This proposal claim is otherwise long enough for validation."),
            ("Valid title", ""),
            ("Valid title", "too short"),
            ("Valid title", "x" * 2001),
            ("Bad\x00title", "This proposal claim is otherwise long enough for validation."),
            ("Valid title", "This claim contains a forbidden \x00 control character."),
        ],
    )
    def test_rejects_title_and_claim_bounds(self, title, claim):
        vm = VMContext()
        owner = create_address("owner1")
        contract = deploy(vm, owner)
        with vm.prank(owner):
            with vm.expect_revert():
                contract.create_proposal(title, claim)

    def test_owner_only_draft_edit_and_revision(self):
        vm = VMContext()
        owner = create_address("owner1")
        stranger = create_address("stranger")
        contract = deploy(vm, owner)

        with vm.prank(owner):
            proposal_id = create_proposal(contract)
            contract.edit_proposal(
                proposal_id,
                "Updated proposal title",
                "This updated proposal claim remains inside the approved Policy V1 input bounds.",
            )
            assert contract.get_proposal(proposal_id)["revision"] == 2

        with vm.prank(stranger):
            with vm.expect_revert():
                contract.edit_proposal(
                    proposal_id,
                    "Unauthorized edit",
                    "This unauthorized proposal edit must be rejected by the owner guard.",
                )

    def test_dependency_normalization_crud_and_duplicate_guard(self):
        vm = VMContext()
        owner = create_address("owner1")
        contract = deploy(vm, owner)
        with vm.prank(owner):
            proposal_id = create_proposal(contract)
            dependency_id = contract.add_dependency(
                proposal_id,
                f" https://doi.org/{ORIGINAL_DOI.upper()} ",
                f" PMID:{ORIGINAL_PMID} ",
                DEPENDENCY_TEXT,
                NOTICE_DOI,
                NOTICE_PMID,
            )
            dependency = contract.get_dependency(dependency_id)
            assert dependency["original_doi"] == ORIGINAL_DOI
            assert dependency["original_pmid"] == ORIGINAL_PMID
            assert dependency["review_status"] == "IDLE"
            assert dependency["review_round"] == 0

            with vm.expect_revert():
                contract.add_dependency(
                    proposal_id,
                    ORIGINAL_DOI,
                    "99999",
                    "A duplicate DOI in the same proposal must be rejected deterministically.",
                    "10.1000/duplicate_notice",
                    "88888",
                )

            contract.edit_dependency(
                dependency_id,
                ORIGINAL_DOI,
                ORIGINAL_PMID,
                "This updated dependency statement remains exact, bounded, and immutable after seal.",
                NOTICE_DOI,
                NOTICE_PMID,
            )
            assert contract.get_dependency(dependency_id)["revision"] == 2

            contract.remove_dependency(dependency_id)
            assert contract.list_proposal_dependencies(proposal_id) == []
            with vm.expect_revert():
                contract.get_dependency(dependency_id)

    @pytest.mark.parametrize(
        "doi,pmid,statement,notice_doi,notice_pmid",
        [
            ("not-a-doi", ORIGINAL_PMID, DEPENDENCY_TEXT, NOTICE_DOI, NOTICE_PMID),
            (ORIGINAL_DOI, "PMID:bad", DEPENDENCY_TEXT, NOTICE_DOI, NOTICE_PMID),
            (ORIGINAL_DOI, "1" * 13, DEPENDENCY_TEXT, NOTICE_DOI, NOTICE_PMID),
            (ORIGINAL_DOI, ORIGINAL_PMID, "short", NOTICE_DOI, NOTICE_PMID),
            (ORIGINAL_DOI, ORIGINAL_PMID, "x" * 1001, NOTICE_DOI, NOTICE_PMID),
            (ORIGINAL_DOI, ORIGINAL_PMID, f"{DEPENDENCY_TEXT}\x00", NOTICE_DOI, NOTICE_PMID),
            (ORIGINAL_DOI, ORIGINAL_PMID, DEPENDENCY_TEXT, NOTICE_DOI, ""),
            (ORIGINAL_DOI, ORIGINAL_PMID, DEPENDENCY_TEXT, "not-a-doi", NOTICE_PMID),
        ],
    )
    def test_rejects_malformed_dependency_inputs(self, doi, pmid, statement, notice_doi, notice_pmid):
        vm = VMContext()
        owner = create_address("owner1")
        contract = deploy(vm, owner)
        with vm.prank(owner):
            proposal_id = create_proposal(contract)
            with vm.expect_revert():
                contract.add_dependency(proposal_id, doi, pmid, statement, notice_doi, notice_pmid)

    def test_one_to_five_dependency_bounds(self):
        vm = VMContext()
        owner = create_address("owner1")
        contract = deploy(vm, owner)
        with vm.prank(owner):
            proposal_id = create_proposal(contract)
            with vm.expect_revert():
                contract.seal_proposal(proposal_id)

            for index in range(1, 6):
                add_dependency(
                    contract,
                    proposal_id,
                    str(index),
                    f"10.1000/notice_{index}",
                    str(80000000 + index),
                )
            with vm.expect_revert():
                add_dependency(contract, proposal_id, "6", "10.1000/notice_6", "80000006")


class TestStateMachineAndPermissions:
    def test_seal_opens_round_one_and_freezes_all_draft_mutations(self):
        vm = VMContext()
        owner = create_address("owner1")
        contract = deploy(vm, owner)
        with vm.prank(owner):
            proposal_id = create_proposal(contract)
            dependency_id = add_dependency(contract, proposal_id)
            contract.seal_proposal(proposal_id)

            proposal = contract.get_proposal(proposal_id)
            dependency = contract.get_dependency(dependency_id)
            assert proposal["sealed"] is True
            assert proposal["status"] == "EVIDENCE_HOLD"
            assert dependency["review_status"] == "PENDING"
            assert dependency["review_round"] == 1

            with vm.expect_revert():
                contract.seal_proposal(proposal_id)
            with vm.expect_revert():
                contract.edit_proposal(
                    proposal_id,
                    "Forbidden sealed edit",
                    "This proposal edit must not succeed after the proposal has been sealed.",
                )
            with vm.expect_revert():
                contract.edit_dependency(
                    dependency_id,
                    ORIGINAL_DOI,
                    ORIGINAL_PMID,
                    DEPENDENCY_TEXT,
                    NOTICE_DOI,
                    NOTICE_PMID,
                )
            with vm.expect_revert():
                contract.remove_dependency(dependency_id)

    def test_seal_requires_initial_notice_for_every_dependency(self):
        vm = VMContext()
        owner = create_address("owner1")
        contract = deploy(vm, owner)
        with vm.prank(owner):
            proposal_id = create_proposal(contract)
            dependency_id = add_dependency(contract, proposal_id, notice_doi="", notice_pmid="")
            with vm.expect_revert():
                contract.seal_proposal(proposal_id)
            contract.edit_dependency(
                dependency_id,
                ORIGINAL_DOI,
                ORIGINAL_PMID,
                DEPENDENCY_TEXT,
                NOTICE_DOI,
                NOTICE_PMID,
            )
            contract.seal_proposal(proposal_id)
            assert contract.get_dependency(dependency_id)["review_status"] == "PENDING"

    def test_permissionless_review_request_only_when_sealed_and_idle(self):
        vm = VMContext()
        owner = create_address("owner1")
        auditor = create_address("auditor")
        contract = deploy(vm, owner)
        with vm.prank(owner):
            proposal_id = create_proposal(contract)
            dependency_id = add_dependency(contract, proposal_id)

        with vm.prank(auditor):
            with vm.expect_revert():
                contract.request_review(dependency_id, "10.1000/later_notice", "55555")

        with vm.prank(owner):
            contract.seal_proposal(proposal_id)
            set_verdict(contract, dependency_id, "USABLE")

        with vm.prank(auditor):
            contract.request_review(dependency_id, "10.1000/later_notice", "55555")
            pending = contract.get_dependency(dependency_id)
            assert pending["review_status"] == "PENDING"
            assert pending["review_round"] == 2
            with vm.expect_revert():
                contract.request_review(dependency_id, "10.1000/concurrent_notice", "66666")

    def test_accepted_notice_limit_is_enforced_without_consuming_rejected_slots(self):
        vm = VMContext()
        owner = create_address("owner1")
        contract = deploy(vm, owner)
        with vm.prank(owner):
            proposal_id = create_proposal(contract)
            dependency_id = add_dependency(contract, proposal_id)
            contract.seal_proposal(proposal_id)
            dependency = contract.dependencies[dependency_id]
            dependency.review_status = "IDLE"
            dependency.accepted_notice_count = 3
            contract.dependencies[dependency_id] = dependency
            with vm.expect_revert():
                contract.request_review(dependency_id, "10.1000/fourth_notice", "77777")

    def test_activation_owner_guard_and_all_usable_requirement(self):
        vm = VMContext()
        owner = create_address("owner1")
        stranger = create_address("stranger")
        contract = deploy(vm, owner)
        with vm.prank(owner):
            proposal_id = create_proposal(contract)
            first = add_dependency(contract, proposal_id, "1", "10.1000/notice_a", "81000001")
            second = add_dependency(contract, proposal_id, "2", "10.1000/notice_b", "81000002")
            contract.seal_proposal(proposal_id)
            set_verdict(contract, first, "USABLE")
            set_verdict(contract, second, "UNRESOLVED")
            with vm.expect_revert():
                contract.activate_proposal(proposal_id)
            set_verdict(contract, second, "USABLE")
            assert contract.get_proposal_status(proposal_id)["status"] == "ELIGIBLE"

        with vm.prank(stranger):
            with vm.expect_revert():
                contract.activate_proposal(proposal_id)

        with vm.prank(owner):
            contract.activate_proposal(proposal_id)
            assert contract.get_proposal_status(proposal_id)["status"] == "ACTIVE"

    @pytest.mark.parametrize(
        "verdicts,pending,activated,expected",
        [
            (["INVALID_FOR_CLAIM", "USABLE"], False, False, "INVALIDATED"),
            (["INVALID_FOR_CLAIM", "USABLE"], True, False, "INVALIDATED"),
            (["USABLE", "UNRESOLVED"], False, False, "EVIDENCE_HOLD"),
            (["USABLE", "DISPUTED"], False, False, "EVIDENCE_HOLD"),
            (["USABLE", "USABLE"], False, False, "ELIGIBLE"),
            (["USABLE", "USABLE"], False, True, "ACTIVE"),
        ],
    )
    def test_aggregate_precedence(self, verdicts, pending, activated, expected):
        vm = VMContext()
        owner = create_address("owner1")
        contract = deploy(vm, owner)
        with vm.prank(owner):
            proposal_id = create_proposal(contract)
            dependency_ids = [
                add_dependency(contract, proposal_id, "1", "10.1000/notice_a", "82000001"),
                add_dependency(contract, proposal_id, "2", "10.1000/notice_b", "82000002"),
            ]
            contract.seal_proposal(proposal_id)
            for dependency_id, verdict in zip(dependency_ids, verdicts):
                set_verdict(contract, dependency_id, verdict)
            if pending:
                dependency = contract.dependencies[dependency_ids[1]]
                dependency.review_status = "PENDING"
                contract.dependencies[dependency_ids[1]] = dependency
            if activated:
                proposal = contract.proposals[proposal_id]
                proposal.activated = True
                contract.proposals[proposal_id] = proposal
            status = contract.get_proposal_status(proposal_id)
            assert status["status"] == expected
            assert status["has_pending_review"] is pending

    def test_new_review_holds_an_active_proposal(self):
        vm = VMContext()
        owner = create_address("owner1")
        auditor = create_address("auditor")
        contract = deploy(vm, owner)
        with vm.prank(owner):
            proposal_id = create_proposal(contract)
            dependency_id = add_dependency(contract, proposal_id)
            contract.seal_proposal(proposal_id)
            set_verdict(contract, dependency_id, "USABLE")
            contract.activate_proposal(proposal_id)
            assert contract.get_proposal_status(proposal_id)["status"] == "ACTIVE"

        with vm.prank(auditor):
            contract.request_review(dependency_id, "10.1000/later_update", "91234567")
            status = contract.get_proposal_status(proposal_id)
            assert status == {"status": "EVIDENCE_HOLD", "has_pending_review": True}

    def test_pagination_is_bounded_and_owner_indexed(self):
        vm = VMContext()
        owner = create_address("owner1")
        contract = deploy(vm, owner)
        with vm.prank(owner):
            for index in range(1, 15):
                create_proposal(contract, str(index))
            page = contract.list_proposals(cursor=0, limit=5)
            assert page["total"] == 14
            assert [item["id"] for item in page["items"]] == [14, 13, 12, 11, 10]
            owner_page = contract.list_owner_proposals(owner, cursor=0, limit=50)
            assert owner_page["total"] == 14
            assert len(owner_page["items"]) == 14
            assert contract.get_latest_owner_proposal(owner)["id"] == 14


class TestUpgradability:
    def test_configured_external_upgrader_and_storage_layout_metadata(self):
        vm = VMContext()
        owner = create_address("external-upgrader")
        contract = deploy(vm, owner)

        config = contract.get_deployment_config()
        assert config["classification"] == "UPGRADABLE"
        expected_owner = owner.as_hex if hasattr(owner, "as_hex") else f"0x{owner.hex()}"
        assert config["configured_upgrader"].lower() == expected_owner.lower()
        assert config["storage_layout_version"] == 1
        assert "Append-only" in config["storage_compatibility_policy"]

    def test_zero_upgrader_is_rejected(self):
        vm = VMContext()
        owner = create_address("owner")
        with vm.prank(owner):
            with pytest.raises(Exception, match="zero address"):
                deploy_contract(CONTRACT_PATH, vm, bytes(20))

    def test_only_configured_upgrader_can_replace_code_and_storage_persists(self):
        vm = VMContext()
        upgrader = create_address("external-upgrader")
        stranger = create_address("stranger")
        contract = deploy(vm, upgrader)

        with vm.prank(upgrader):
            proposal_id = contract.create_proposal(
                "Upgrade persistence",
                "This proposal proves contract application storage survives a code replacement.",
            )

        with vm.prank(stranger):
            with pytest.raises(Exception, match="Only the configured upgrader"):
                contract.upgrade(Path(CONTRACT_PATH).read_bytes())

        with vm.prank(upgrader):
            with pytest.raises(Exception, match="cannot be empty"):
                contract.upgrade(b"")
            contract.upgrade(Path(CONTRACT_PATH).read_bytes())

        proposal = contract.get_proposal(proposal_id)
        assert proposal["title"] == "Upgrade persistence"
        assert proposal["revision"] == 1
