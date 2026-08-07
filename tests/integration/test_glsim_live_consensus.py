"""Bounded glsim proof for the three locked live evidence fixtures.

This suite intentionally does not mock web responses. Crossref and Europe PMC
are fetched by the leader and refetched by each validator inside the contract.
Only the two LLM calls are mocked because the local test environment has no
provider credential. Run this file against `glsim --validators 3`.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import pytest
from genlayer_py import create_account
from genlayer_py.types import SimConfig
from gltest import get_default_account, get_validator_factory
from gltest.assertions import tx_execution_failed, tx_execution_succeeded
from gltest.clients import get_gl_client
from gltest.types import TransactionStatus
from gltest.utils import extract_contract_address


CONTRACT_PATH = Path(__file__).parents[2] / "contracts" / "retraction_dependency.py"
RETRYABLE_SOURCE_FAILURES = {
    "MISSING_CROSSREF_RECORD",
    "MISSING_EUROPE_PMC_RECORD",
    "MISSING_OPEN_NOTICE_TEXT",
    "SOURCE_CONFLICT",
    "SOURCE_TEMPORARILY_UNAVAILABLE",
    "SOURCE_RESPONSE_MALFORMED",
}


FIXTURES = [
    {
        "fixture": "A",
        "original_doi": "10.1371/journal.pntd.0009591",
        "original_pmid": "34280196",
        "notice_doi": "10.1371/journal.pntd.0011024",
        "notice_pmid": "36584006",
        "notice_pmcid": "PMC9803134",
        "dependency": (
            "The original paper supports the dependency that population "
            "structure was resolved using the stated genetic evidence."
        ),
        "verdict": "USABLE",
        "effect": "NO_MATERIAL_EFFECT",
        "reason_code": "CORRECTION_UNRELATED_TO_DEPENDENCY",
        "summary": (
            "The correction is bound to the original publication and does not "
            "alter the frozen dependency statement."
        ),
    },
    {
        "fixture": "B",
        "original_doi": "10.1371/journal.pntd.0009266",
        "original_pmid": "33690646",
        "notice_doi": "10.1371/journal.pntd.0011026",
        "notice_pmid": "36584025",
        "notice_pmcid": "PMC9803166",
        "dependency": (
            "The original paper supports the dependency that the NIRUDAK "
            "model uses the stated value and categorization."
        ),
        "verdict": "INVALID_FOR_CLAIM",
        "effect": "MATERIALLY_UNDERMINES",
        "reason_code": "CORRECTION_CHANGES_DEPENDENCY",
        "summary": (
            "The bound correction changes information used by the frozen "
            "dependency statement, so the paper cannot support that claim."
        ),
    },
    {
        "fixture": "C",
        "original_doi": "10.1126/sciadv.ade8971",
        "original_pmid": "36542710",
        "notice_doi": "10.1126/sciadv.adv4615",
        "notice_pmid": "39742501",
        "notice_pmcid": "PMC11691688",
        "dependency": (
            "The original paper supports the dependency that Bpr4 "
            "up-regulation establishes the stated biological mechanism."
        ),
        "verdict": "INVALID_FOR_CLAIM",
        "effect": "MATERIALLY_UNDERMINES",
        "reason_code": "RETRACTION_REMOVES_SUPPORT",
        "summary": (
            "The retraction is bound to the original publication and removes "
            "its support for the frozen dependency statement."
        ),
    },
]


def _wait(client, tx_hash):
    receipt = client.wait_for_transaction_receipt(
        transaction_hash=tx_hash,
        status=TransactionStatus.FINALIZED,
        interval=250,
        retries=240,
    )
    assert tx_execution_succeeded(receipt), json.dumps(receipt, default=str, indent=2)
    return receipt


def _transact(client, owner, address, function_name, args, *, transaction_context=None):
    sim_config = SimConfig(**transaction_context) if transaction_context else None
    tx_hash = client.write_contract(
        address=address,
        function_name=function_name,
        account=owner,
        value=0,
        args=args,
        sim_config=sim_config,
    )
    return _wait(client, tx_hash)


def _transaction_context(fixture: dict) -> dict:
    decision = json.dumps(
        {
            "policy_version": 1,
            "original_doi": fixture["original_doi"],
            "original_pmid": fixture["original_pmid"],
            "notice_doi": fixture["notice_doi"],
            "notice_pmid": fixture["notice_pmid"],
            "notice_pmcid": fixture["notice_pmcid"],
            "update_kind": (
                "retraction" if fixture["reason_code"] == "RETRACTION_REMOVES_SUPPORT" else "correction"
            ),
            "binding_status": "BOUND",
            "material_effect": fixture["effect"],
            "verdict": fixture["verdict"],
            "reason_code": fixture["reason_code"],
            "reason_summary": fixture["summary"],
        }
    )
    llm_response = {
        "nondet_exec_prompt": {
            "evaluating research publication update notice evidence": decision,
            "Policy v1 reason-summary verifier": json.dumps({"faithful": True}),
        },
        "eq_principle_prompt_comparative": {},
        "eq_principle_prompt_non_comparative": {},
    }
    validators = get_validator_factory().batch_create_mock_validators(
        count=3,
        mock_llm_response=llm_response,
    )
    return {
        "validators": [validator.to_dict() for validator in validators],
        "genvm_datetime": "2026-07-30T00:00:00Z",
    }


def _resolve_with_bounded_source_recovery(client, owner, contract_address, dependency_id, fixture):
    """Retry only the contract's explicit safe source-failure outcomes."""
    receipt = None
    for attempt in range(3):
        receipt = _transact(
            client,
            owner,
            contract_address,
            "resolve_review",
            [dependency_id],
            transaction_context=_transaction_context(fixture),
        )
        history = client.read_contract(
            address=contract_address,
            function_name="get_dependency_history",
            account=owner,
            args=[dependency_id],
        )
        if history["accepted_evaluations"]:
            return receipt, history

        latest = history.get("latest_rejected_trigger") or {}
        if latest.get("rejection_code") not in RETRYABLE_SOURCE_FAILURES or attempt == 2:
            return receipt, history

        time.sleep(2**attempt)
        _transact(
            client,
            owner,
            contract_address,
            "request_review",
            [dependency_id, fixture["notice_doi"], fixture["notice_pmid"]],
        )

    raise AssertionError("bounded source recovery exhausted without a receipt")


@pytest.fixture(scope="module")
def deployed_contract():
    owner = get_default_account()
    client = get_gl_client()
    deploy_hash = client.deploy_contract(
        code=CONTRACT_PATH.read_text(encoding="utf-8"),
        account=owner,
        args=[owner.address],
    )
    return owner, client, extract_contract_address(_wait(client, deploy_hash))


@pytest.mark.parametrize("fixture", FIXTURES, ids=lambda item: f"fixture-{item['fixture']}")
def test_locked_fixture_live_web_consensus(fixture, deployed_contract):
    owner, client, contract_address = deployed_contract
    counts = client.read_contract(
        address=contract_address,
        function_name="get_counts",
        account=owner,
        args=[],
    )
    proposal_id = counts["proposals"] + 1
    dependency_id = counts["dependencies"] + 1

    _transact(
        client,
        owner,
        contract_address,
        "create_proposal",
        [
            f"Live glsim fixture {fixture['fixture']}",
            (
                "This bounded feasibility proposal verifies live public "
                "evidence fetching and validator refetch behavior."
            ),
        ],
    )
    _transact(
        client,
        owner,
        contract_address,
        "add_dependency",
        [
            proposal_id,
            fixture["original_doi"],
            fixture["original_pmid"],
            fixture["dependency"],
            fixture["notice_doi"],
            fixture["notice_pmid"],
        ],
    )
    _transact(client, owner, contract_address, "seal_proposal", [proposal_id])

    receipt, history = _resolve_with_bounded_source_recovery(
        client,
        owner,
        contract_address,
        dependency_id,
        fixture,
    )
    dependency = client.read_contract(
        address=contract_address,
        function_name="get_dependency",
        account=owner,
        args=[dependency_id],
    )
    accepted = history["accepted_evaluations"]
    assert len(accepted) == 1, {"dependency": dependency, "history": history}
    evaluation = accepted[0]

    assert dependency["verdict"] == fixture["verdict"]
    assert evaluation["binding_status"] == "BOUND"
    assert evaluation["notice_pmcid"] == fixture["notice_pmcid"]
    assert evaluation["reason_code"] == fixture["reason_code"]

    consensus = receipt.get("consensus_data") or {}
    votes = consensus.get("votes") or {}
    assert len(votes) == 3, consensus
    assert set(votes.values()) == {"agree"}, consensus


def test_glsim_upgrade_authorization_and_storage_persistence(deployed_contract):
    owner, client, contract_address = deployed_contract
    stranger = create_account()
    source = CONTRACT_PATH.read_bytes()
    counts = client.read_contract(
        address=contract_address,
        function_name="get_counts",
        account=owner,
        args=[],
    )
    proposal_id = counts["proposals"] + 1

    _transact(
        client,
        owner,
        contract_address,
        "create_proposal",
        [
            "Upgrade rehearsal",
            "This proposal verifies application storage survives an authorized code replacement.",
        ],
    )
    config = client.read_contract(
        address=contract_address,
        function_name="get_deployment_config",
        account=owner,
        args=[],
    )
    assert config["classification"] == "UPGRADABLE"
    assert config["configured_upgrader"].lower() == owner.address.lower()

    unauthorized_hash = client.write_contract(
        address=contract_address,
        function_name="upgrade",
        account=stranger,
        value=0,
        args=[source],
    )
    unauthorized_receipt = client.wait_for_transaction_receipt(
        transaction_hash=unauthorized_hash,
        status=TransactionStatus.FINALIZED,
        interval=250,
        retries=240,
    )
    assert tx_execution_failed(unauthorized_receipt), unauthorized_receipt

    _transact(client, owner, contract_address, "upgrade", [source])
    proposal = client.read_contract(
        address=contract_address,
        function_name="get_proposal",
        account=owner,
        args=[proposal_id],
    )
    assert proposal["title"] == "Upgrade rehearsal"
    assert proposal["revision"] == 1
