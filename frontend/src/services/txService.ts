import {
  ExecutionResult,
  executionResultNumberToName,
  TransactionStatus,
  transactionsStatusNumberToName,
} from 'genlayer-js/types';
import { CONTRACT_ADDRESS, STUDIONET_CONFIG } from '../config';

export type TxState =
  | 'AWAITING_SIGNATURE'
  | 'SUBMITTED'
  | 'FINALIZED'
  | 'EXECUTION_SUCCEEDED'
  | 'READBACK_CONFIRMED'
  | 'UNDETERMINED'
  | 'RECONCILIATION_REQUIRED'
  | 'FAILED';

export interface TransactionReceiptSummary {
  statusName?: string;
  txExecutionResultName?: string;
  error?: string | null;
}

interface RawTransactionReceipt {
  statusName?: unknown;
  status_name?: unknown;
  status?: unknown;
  txExecutionResultName?: unknown;
  txExecutionResult?: unknown;
  resultName?: unknown;
  result_name?: unknown;
  data?: unknown;
  consensus_data?: unknown;
  consensusData?: unknown;
}

export interface TxRecord {
  id: string;
  action: string;
  args: unknown[];
  hash?: string;
  state: TxState;
  timestamp: number;
  updatedAt: number;
  walletAddress?: string;
  explorerUrl?: string;
  error?: string;
  finalStatus?: string;
  executionResult?: string;
  readback?: string;
}

export interface ExecuteTransactionOptions<TBefore> {
  action: string;
  args: unknown[];
  walletAddress: string | null;
  readBefore: () => Promise<TBefore>;
  submit: () => Promise<string>;
  waitForFinalized: (hash: string) => Promise<TransactionReceiptSummary>;
  verifyReadback: (before: TBefore) => Promise<{ matched: boolean; summary: string }>;
}

const STORAGE_KEY = `retraction_dep_txs_${STUDIONET_CONFIG.chainId}_${CONTRACT_ADDRESS || 'unconfigured'}`;

function normalizeEnumValue(
  namedValue: unknown,
  numericValue: unknown,
  numberToName: Record<string, string>,
): string | undefined {
  if (typeof namedValue === 'string' && !/^\d+$/.test(namedValue)) return namedValue;
  const candidate = namedValue ?? numericValue;
  if (candidate === null || candidate === undefined || candidate === '') return undefined;
  return numberToName[String(candidate)] ?? String(candidate);
}

function executionFromConsensus(receipt: RawTransactionReceipt): string | undefined {
  const consensusResult = receipt.resultName ?? receipt.result_name;
  if (
    typeof consensusResult === 'string' &&
    consensusResult.toUpperCase() !== 'MAJORITY_AGREE'
  ) {
    return undefined;
  }

  const consensus = receipt.consensus_data ?? receipt.consensusData;
  if (!consensus || typeof consensus !== 'object') return undefined;
  const value = consensus as Record<string, unknown>;
  const candidates = [value.leader_receipt, value.leaderReceipt, value.validators];
  const results: string[] = [];

  const collect = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      candidate.forEach(collect);
      return;
    }
    if (!candidate || typeof candidate !== 'object') return;
    const record = candidate as Record<string, unknown>;
    const vote = typeof record.vote === 'string' ? record.vote.toLowerCase() : null;
    // Studionet cancels validators that are no longer needed after quorum.
    // Those receipts are marked IDLE/ERROR with
    // CONSENSUS_VALIDATOR_QUORUM_REACHED and are not execution failures.
    if (vote === 'idle' || vote === 'disagree') return;
    const execution = record.execution_result ?? record.executionResult;
    if (typeof execution === 'string') results.push(execution.toUpperCase());
  };
  candidates.forEach(collect);
  if (results.length === 0) return undefined;
  return results.every((result) => result === 'SUCCESS')
    ? ExecutionResult.FINISHED_WITH_RETURN
    : ExecutionResult.FINISHED_WITH_ERROR;
}

/** Normalize both current named receipts and Studionet receipts that expose numeric enum values. */
export function summarizeTransactionReceipt(receipt: RawTransactionReceipt): TransactionReceiptSummary {
  const data = receipt.data && typeof receipt.data === 'object'
    ? receipt.data as Record<string, unknown>
    : null;
  return {
    statusName: normalizeEnumValue(
      receipt.statusName ?? receipt.status_name,
      receipt.status,
      transactionsStatusNumberToName as Record<string, string>,
    ),
    txExecutionResultName: normalizeEnumValue(
      receipt.txExecutionResultName,
      receipt.txExecutionResult,
      executionResultNumberToName as Record<string, string>,
    ) ?? executionFromConsensus(receipt),
    error: data && typeof data.error === 'string' ? data.error : null,
  };
}

export function assertSuccessfulFinalizedReceipt(receipt: TransactionReceiptSummary): void {
  const status = receipt.statusName;
  if (status === TransactionStatus.UNDETERMINED) {
    throw new Error('CONSENSUS_UNDETERMINED');
  }
  if (status !== TransactionStatus.FINALIZED) {
    throw new Error(`Transaction did not reach FINALIZED status (received ${status || 'UNKNOWN'}).`);
  }
  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
    throw new Error(
      `Finalized transaction execution failed (${receipt.txExecutionResultName || 'UNKNOWN'}${receipt.error ? `: ${receipt.error}` : ''}).`,
    );
  }
}

export class TransactionReconciliationService {
  private records: TxRecord[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      this.records = Array.isArray(parsed) ? (parsed as TxRecord[]) : [];
    } catch {
      this.records = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records.slice(-50)));
    } catch {
      // The UI remains usable when storage is unavailable; the transaction hash
      // is still returned to the caller and shown in the current session.
    }
  }

  private update(id: string, patch: Partial<TxRecord>): void {
    const record = this.records.find((item) => item.id === id);
    if (!record) return;
    Object.assign(record, patch, { updatedAt: Date.now() });
    this.saveToStorage();
  }

  public getRecords(): TxRecord[] {
    return [...this.records].sort((a, b) => b.timestamp - a.timestamp);
  }

  public getRecoverableRecords(): TxRecord[] {
    // A locally failed record can still have a valid on-chain hash. Rechecking
    // that hash is read-only and is required when Studionet finalizes after the
    // SDK polling window expires. Only an already readback-confirmed record is
    // terminal for reconciliation purposes.
    return this.getRecords().filter(
      (record) => Boolean(record.hash) && record.state !== 'READBACK_CONFIRMED',
    );
  }

  public clearCompleted(): void {
    this.records = this.records.filter((record) => record.state !== 'READBACK_CONFIRMED');
    this.saveToStorage();
  }

  public begin(action: string, args: unknown[], walletAddress?: string): string {
    const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = Date.now();
    this.records.push({
      id,
      action,
      args,
      state: 'AWAITING_SIGNATURE',
      timestamp: now,
      updatedAt: now,
      walletAddress,
    });
    this.saveToStorage();
    return id;
  }

  public markSubmitted(id: string, hash: string): void {
    this.update(id, {
      hash,
      state: 'SUBMITTED',
      explorerUrl: `${STUDIONET_CONFIG.explorerUrl}/tx/${hash}`,
      error: undefined,
    });
  }

  public markFinalized(id: string, receipt: TransactionReceiptSummary): void {
    this.update(id, {
      state: 'FINALIZED',
      finalStatus: receipt.statusName,
      executionResult: receipt.txExecutionResultName,
      error: receipt.error || undefined,
    });
  }

  public markExecutionSucceeded(id: string): void {
    this.update(id, { state: 'EXECUTION_SUCCEEDED' });
  }

  public markReadbackConfirmed(id: string, summary: string): void {
    this.update(id, {
      state: 'READBACK_CONFIRMED',
      readback: summary,
      error: undefined,
    });
  }

  public markReconciliationRequired(id: string, summary: string): void {
    this.update(id, {
      state: 'RECONCILIATION_REQUIRED',
      readback: summary,
      error: 'Finalized execution did not match the expected contract readback.',
    });
  }

  public markFailed(id: string, message: string): void {
    const state: TxState = message === 'CONSENSUS_UNDETERMINED' ? 'UNDETERMINED' : 'FAILED';
    this.update(id, { state, error: message });
  }

  public async execute<TBefore>(options: ExecuteTransactionOptions<TBefore>): Promise<{ hash: string; status: 'READBACK_CONFIRMED' }> {
    if (!options.walletAddress) {
      throw new Error('Wallet connection required before submitting transactions.');
    }
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract not configured — deployment has not occurred.');
    }

    const before = await options.readBefore();
    const id = this.begin(options.action, options.args, options.walletAddress);

    try {
      const hash = await options.submit();
      this.markSubmitted(id, hash);

      const receipt = await options.waitForFinalized(hash);
      this.markFinalized(id, receipt);
      assertSuccessfulFinalizedReceipt(receipt);
      this.markExecutionSucceeded(id);

      const readback = await options.verifyReadback(before);
      if (!readback.matched) {
        this.markReconciliationRequired(id, readback.summary);
        throw new Error(`READBACK_MISMATCH: ${readback.summary}`);
      }

      this.markReadbackConfirmed(id, readback.summary);
      return { hash, status: 'READBACK_CONFIRMED' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown transaction failure';
      const current = this.records.find((record) => record.id === id);
      if (current?.state !== 'RECONCILIATION_REQUIRED') {
        this.markFailed(id, message);
      }
      throw error;
    }
  }
}

export const txService = new TransactionReconciliationService();
