import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UnconfiguredBanner } from '../components/UnconfiguredBanner';
import { normalizeContractValue, retryTransientRpcRead } from '../services/contractAdapter';
import {
  CreateProposalFormSchema,
  DependencySchema,
  DependencyHistorySchema,
  PolicySchema,
  ProposalSchema,
  ProposalStatusResultSchema,
} from '../types/schema';

const owner = '0x1111111111111111111111111111111111111111';

describe('deployment address boundary', () => {
  it('renders the blocking unconfigured banner without a placeholder address', () => {
    render(<UnconfiguredBanner />);
    expect(screen.getByRole('alert')).toHaveTextContent(/deployment has not occurred/i);
    expect(screen.getByRole('alert')).not.toHaveTextContent(/0x[0-9a-f]{40}/i);
  });
});

describe('contract response normalization', () => {
  it('converts nested maps, snake_case keys, arrays and safe bigints', () => {
    const raw = new Map<string, unknown>([
      ['proposal_id', 3n],
      ['accepted_evaluations', [new Map([['reason_code', 'SOURCE_CONFLICT']])]],
    ]);
    expect(normalizeContractValue(raw)).toEqual({
      proposalId: 3,
      acceptedEvaluations: [{ reasonCode: 'SOURCE_CONFLICT' }],
    });
  });

  it('rejects unsafe bigint conversion', () => {
    expect(() => normalizeContractValue(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow(/safe JavaScript range/i);
  });

  it('parses the actual camelized proposal response shape', () => {
    const proposal = ProposalSchema.parse({
      id: 1,
      title: 'Valid proposal',
      claimText: 'A sufficiently long exact proposal claim for contract storage.',
      owner,
      sealed: true,
      activated: false,
      status: 'EVIDENCE_HOLD',
      totalDependencies: 1,
      invalidDependencies: 0,
      revision: 3,
    });
    expect(proposal.status).toBe('EVIDENCE_HOLD');
  });

  it('parses has_pending_review after camelization', () => {
    expect(
      ProposalStatusResultSchema.parse(
        normalizeContractValue({ status: 'INVALIDATED', has_pending_review: true }),
      ),
    ).toEqual({ status: 'INVALIDATED', hasPendingReview: true });
  });
});

describe('Studionet RPC read recovery', () => {
  it('retries a bounded transient fetch failure', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('An unknown RPC error occurred. Details: Failed to fetch'))
      .mockResolvedValue({ id: 3 });

    await expect(retryTransientRpcRead(operation, [0])).resolves.toEqual({ id: 3 });
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry deterministic contract errors', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Proposal does not exist'));

    await expect(retryTransientRpcRead(operation, [0, 0])).rejects.toThrow('Proposal does not exist');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('stops a hanging RPC read after the configured attempt timeout', async () => {
    const operation = vi.fn(() => new Promise<never>(() => undefined));

    await expect(retryTransientRpcRead(operation, [], 5)).rejects.toThrow(
      'Studionet RPC read timed out after 5 ms.',
    );
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

describe('Policy V1 form bounds', () => {
  const fixture = {
    title: 'SARS-CoV-2 P.1 genomic survey',
    claimText: 'Targeted surveillance reports circulation of the P.1 lineage in Northeast Brazil.',
    dependencies: [
      {
        originalDoi: '10.1371/journal.pntd.0009591',
        originalPmid: '34280196',
        dependencyStatement: 'The study reports genetic evidence that the P.1 variant circulated in Northeast Brazil.',
        noticeDoi: '10.1371/journal.pntd.0011024',
        noticePmid: '36584006',
      },
    ],
  };

  it('accepts an exact locked-fixture input shape', () => {
    expect(CreateProposalFormSchema.safeParse(fixture).success).toBe(true);
  });

  it('rejects malformed DOI and PMID identifiers', () => {
    const invalid = structuredClone(fixture);
    invalid.dependencies[0].originalDoi = 'https://untrusted.example/paper';
    invalid.dependencies[0].noticePmid = 'PMID: not-digits';
    expect(CreateProposalFormSchema.safeParse(invalid).success).toBe(false);
  });

  it('enforces one-to-five dependencies and exact text bounds', () => {
    expect(CreateProposalFormSchema.safeParse({ ...fixture, dependencies: [] }).success).toBe(false);
    expect(CreateProposalFormSchema.safeParse({ ...fixture, title: 'x'.repeat(121) }).success).toBe(false);
    expect(
      CreateProposalFormSchema.safeParse({
        ...fixture,
        dependencies: Array.from({ length: 6 }, () => fixture.dependencies[0]),
      }).success,
    ).toBe(false);
  });
});

describe('evaluation history schema', () => {
  it('rejects unbounded or incomplete accepted evidence records', () => {
    expect(
      DependencyHistorySchema.safeParse({
        dependencyId: 1,
        acceptedEvaluations: [{ verdict: 'USABLE' }],
        latestRejectedTrigger: null,
        conclusiveRejections: [],
      }).success,
    ).toBe(false);
  });

  it('parses conservative-history and anti-griefing readback fields', () => {
    expect(
      DependencySchema.parse({
        id: 1,
        proposalId: 1,
        originalDoi: '10.1371/journal.pntd.0009591',
        originalPmid: '34280196',
        dependencyStatement: 'The frozen dependency statement is sufficiently specific and bounded.',
        verdict: 'INVALID_FOR_CLAIM',
        reviewStatus: 'IDLE',
        pendingNoticeDoi: '',
        pendingNoticePmid: '',
        acceptedNoticeCount: 2,
        reviewRound: 2,
        revision: 5,
        pendingRequester: owner,
        lastPermissionlessReviewAt: 1_000_000,
        nextPermissionlessReviewAt: 1_086_400,
      }).nextPermissionlessReviewAt,
    ).toBe(1_086_400);

    expect(
      PolicySchema.shape.permissionlessReviewCooldownSeconds.parse(86_400),
    ).toBe(86_400);
  });
});
