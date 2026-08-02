import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config', () => ({
  CONTRACT_ADDRESS: '0x1111111111111111111111111111111111111111',
  STUDIONET_CONFIG: {
    chainId: 61999,
    chainHex: '0xf22f',
    explorerUrl: 'https://explorer-studio.genlayer.com',
  },
}));

import { ExecutionResult, TransactionStatus } from 'genlayer-js/types';
import {
  assertSuccessfulFinalizedReceipt,
  summarizeTransactionReceipt,
  TransactionReconciliationService,
} from '../services/txService';

const wallet = '0x2222222222222222222222222222222222222222';
const hash = `0x${'a'.repeat(64)}`;

beforeEach(() => {
  localStorage.clear();
});

describe('finality and execution-result guards', () => {
  it('accepts only FINALIZED plus FINISHED_WITH_RETURN', () => {
    expect(() =>
      assertSuccessfulFinalizedReceipt({
        statusName: TransactionStatus.FINALIZED,
        txExecutionResultName: ExecutionResult.FINISHED_WITH_RETURN,
      }),
    ).not.toThrow();
  });

  it('rejects consensus UNDETERMINED as a terminal failure', () => {
    expect(() =>
      assertSuccessfulFinalizedReceipt({
        statusName: TransactionStatus.UNDETERMINED,
        txExecutionResultName: ExecutionResult.NOT_VOTED,
      }),
    ).toThrow('CONSENSUS_UNDETERMINED');
  });

  it('rejects finalized execution errors', () => {
    expect(() =>
      assertSuccessfulFinalizedReceipt({
        statusName: TransactionStatus.FINALIZED,
        txExecutionResultName: ExecutionResult.FINISHED_WITH_ERROR,
        error: 'contract guard',
      }),
    ).toThrow(/execution failed/i);
  });

  it('normalizes numeric Studionet receipt enums before applying finality guards', () => {
    const summary = summarizeTransactionReceipt({
      status: 7,
      txExecutionResult: 1,
      data: { error: null },
    });

    expect(summary).toEqual({
      statusName: TransactionStatus.FINALIZED,
      txExecutionResultName: ExecutionResult.FINISHED_WITH_RETURN,
      error: null,
    });
    expect(() => assertSuccessfulFinalizedReceipt(summary)).not.toThrow();
  });

  it('derives successful execution from Studionet consensus receipts when the SDK enum is absent', () => {
    const summary = summarizeTransactionReceipt({
      statusName: TransactionStatus.FINALIZED,
      consensus_data: {
        leader_receipt: [{ execution_result: 'SUCCESS' }, { execution_result: 'SUCCESS' }],
        validators: [
          { execution_result: 'SUCCESS' },
          { execution_result: 'SUCCESS' },
        ],
      },
    });

    expect(summary.txExecutionResultName).toBe(ExecutionResult.FINISHED_WITH_RETURN);
    expect(() => assertSuccessfulFinalizedReceipt(summary)).not.toThrow();
  });

  it('ignores validators cancelled as idle after an agreeing quorum is reached', () => {
    const summary = summarizeTransactionReceipt({
      status: 7,
      status_name: TransactionStatus.FINALIZED,
      result_name: 'MAJORITY_AGREE',
      consensus_data: {
        leader_receipt: [
          { mode: 'leader', execution_result: 'SUCCESS' },
          { mode: 'validator', vote: 'agree', execution_result: 'SUCCESS' },
        ],
        validators: [
          { mode: 'validator', vote: 'agree', execution_result: 'SUCCESS' },
          {
            mode: 'validator',
            vote: 'idle',
            execution_result: 'ERROR',
            genvm_result: { error_code: 'CONSENSUS_VALIDATOR_QUORUM_REACHED' },
          },
        ],
      },
    });

    expect(summary).toEqual({
      statusName: TransactionStatus.FINALIZED,
      txExecutionResultName: ExecutionResult.FINISHED_WITH_RETURN,
      error: null,
    });
    expect(() => assertSuccessfulFinalizedReceipt(summary)).not.toThrow();
  });

  it('does not infer execution success from a non-agree consensus result', () => {
    const summary = summarizeTransactionReceipt({
      status: 7,
      result_name: 'MAJORITY_DISAGREE',
      consensus_data: {
        leader_receipt: [{ mode: 'leader', execution_result: 'SUCCESS' }],
      },
    });

    expect(summary.txExecutionResultName).toBeUndefined();
    expect(() => assertSuccessfulFinalizedReceipt(summary)).toThrow(/execution failed/i);
  });
});

describe('transaction lifecycle and reconciliation', () => {
  it('separates hash, finality, execution, and readback phases', async () => {
    const service = new TransactionReconciliationService();
    const result = await service.execute({
      action: 'edit_proposal',
      args: [1, 'new title'],
      walletAddress: wallet,
      readBefore: async () => 4,
      submit: async () => hash,
      waitForFinalized: async () => ({
        statusName: TransactionStatus.FINALIZED,
        txExecutionResultName: ExecutionResult.FINISHED_WITH_RETURN,
      }),
      verifyReadback: async (before) => ({ matched: before === 4, summary: 'revision 4 → 5' }),
    });

    expect(result).toEqual({ hash, status: 'READBACK_CONFIRMED' });
    expect(service.getRecords()[0]).toMatchObject({
      hash,
      state: 'READBACK_CONFIRMED',
      finalStatus: 'FINALIZED',
      executionResult: 'FINISHED_WITH_RETURN',
      readback: 'revision 4 → 5',
    });
  });

  it('does not synthesize success when readback mismatches', async () => {
    const service = new TransactionReconciliationService();
    await expect(
      service.execute({
        action: 'remove_dependency',
        args: [7],
        walletAddress: wallet,
        readBefore: async () => 2,
        submit: async () => hash,
        waitForFinalized: async () => ({
          statusName: TransactionStatus.FINALIZED,
          txExecutionResultName: ExecutionResult.FINISHED_WITH_RETURN,
        }),
        verifyReadback: async () => ({ matched: false, summary: 'dependency still exists' }),
      }),
    ).rejects.toThrow(/READBACK_MISMATCH/);
    expect(service.getRecords()[0].state).toBe('RECONCILIATION_REQUIRED');
  });

  it('preserves a submitted hash for recovery after refresh', () => {
    const first = new TransactionReconciliationService();
    const id = first.begin('resolve_review', [3], wallet);
    first.markSubmitted(id, hash);

    const restored = new TransactionReconciliationService();
    expect(restored.getRecoverableRecords()[0]).toMatchObject({
      action: 'resolve_review',
      hash,
      state: 'SUBMITTED',
      walletAddress: wallet,
    });
  });

  it('recovers a hash previously failed only by the numeric FINALIZED compatibility bug', () => {
    const first = new TransactionReconciliationService();
    const id = first.begin('create_proposal', ['title', 'claim'], wallet);
    first.markSubmitted(id, hash);
    first.markFailed(id, 'Transaction did not reach FINALIZED status (received 7).');

    const restored = new TransactionReconciliationService();
    expect(restored.getRecoverableRecords()).toHaveLength(1);
    expect(restored.getRecoverableRecords()[0]).toMatchObject({ hash, state: 'FAILED' });
  });

  it('recovers a finalized hash previously rejected only because execution was UNKNOWN', () => {
    const first = new TransactionReconciliationService();
    const id = first.begin('create_proposal', ['title', 'claim'], wallet);
    first.markSubmitted(id, hash);
    first.markFailed(id, 'Finalized transaction execution failed (UNKNOWN).');

    const restored = new TransactionReconciliationService();
    expect(restored.getRecoverableRecords()).toHaveLength(1);
    expect(restored.getRecoverableRecords()[0]).toMatchObject({ hash, state: 'FAILED' });
  });

  it('recovers a hash when Studionet finalizes after the frontend polling timeout', () => {
    const first = new TransactionReconciliationService();
    const id = first.begin('add_dependency', [3, '10.1371/example'], wallet);
    first.markSubmitted(id, hash);
    first.markFailed(
      id,
      `Timed out waiting for transaction ${hash} to reach status "FINALIZED" (current status: 5).`,
    );

    const restored = new TransactionReconciliationService();
    expect(restored.getRecoverableRecords()).toHaveLength(1);
    expect(restored.getRecoverableRecords()[0]).toMatchObject({
      action: 'add_dependency',
      hash,
      state: 'FAILED',
    });
  });

  it('rejects a missing wallet before creating a local transaction record', async () => {
    const service = new TransactionReconciliationService();
    await expect(
      service.execute({
        action: 'seal_proposal',
        args: [1],
        walletAddress: null,
        readBefore: async () => 1,
        submit: async () => hash,
        waitForFinalized: async () => ({
          statusName: TransactionStatus.FINALIZED,
          txExecutionResultName: ExecutionResult.FINISHED_WITH_RETURN,
        }),
        verifyReadback: async () => ({ matched: true, summary: 'sealed' }),
      }),
    ).rejects.toThrow(/wallet connection required/i);
    expect(service.getRecords()).toHaveLength(0);
  });
});
