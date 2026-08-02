import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';
import { IS_CONTRACT_CONFIGURED, STUDIONET_CONFIG, requireContractAddress } from '../config';
import {
  Counts,
  CountsSchema,
  Dependency,
  DependencyHistory,
  DependencyHistorySchema,
  DependencySchema,
  Policy,
  PolicySchema,
  Proposal,
  ProposalSchema,
} from '../types/schema';
import {
  assertSuccessfulFinalizedReceipt,
  summarizeTransactionReceipt,
  TransactionReceiptSummary,
  TxRecord,
  txService,
} from './txService';
import {
  discoverWalletProviders,
  Eip1193Provider,
  ensureMetaMaskGenLayerSnap,
  ensureStudionet,
  normalizeWalletAddress,
  withStudionetWalletCompatibility,
  WalletOption,
} from './walletProviders';

type Address = `0x${string}`;
type GenLayerClient = ReturnType<typeof createClient>;

const SELECTED_WALLET_KEY = 'retraction:selected-wallet';
const FINALITY_POLL_INTERVAL_MS = 3_000;
const FINALITY_POLL_RETRIES = 120;

function camelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function normalizeContractValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    const numeric = Number(value);
    if (!Number.isSafeInteger(numeric)) throw new Error('Contract returned an integer outside the safe JavaScript range.');
    return numeric;
  }
  if (value instanceof Map) {
    return Object.fromEntries(
      [...value.entries()].map(([key, nested]) => [camelKey(String(key)), normalizeContractValue(nested)]),
    );
  }
  if (Array.isArray(value)) return value.map(normalizeContractValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        camelKey(key),
        normalizeContractValue(nested),
      ]),
    );
  }
  return value;
}

function normalizeDoi(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '').replace(/^doi:\s*/, '');
}

function normalizePmid(value: string): string {
  return value.trim().toLowerCase().replace(/^pmid:\s*/, '');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isTransientRpcReadError(error: unknown): boolean {
  const message = errorMessage(error).toLowerCase();
  return message.includes('failed to fetch')
    || message.includes('network error')
    || message.includes('network request')
    || message.includes('request timeout')
    || message.includes('timed out')
    || message.includes('http request failed')
    || message.includes('connection refused')
    || message.includes('connection reset');
}

/** Retry only transport-level read failures; contract errors remain immediate. */
export async function retryTransientRpcRead<T>(
  operation: () => Promise<T>,
  retryDelaysMs: readonly number[] = [400],
  attemptTimeoutMs = 10_000,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await new Promise<T>((resolve, reject) => {
        const timeoutId = window.setTimeout(
          () => reject(new Error(`Studionet RPC read timed out after ${attemptTimeoutMs} ms.`)),
          attemptTimeoutMs,
        );
        void operation().then(resolve, reject).finally(() => window.clearTimeout(timeoutId));
      });
    } catch (error) {
      if (!isTransientRpcReadError(error) || attempt >= retryDelaysMs.length) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, retryDelaysMs[attempt]));
    }
  }
}

function isMissingRecordError(error: unknown): boolean {
  const message = errorMessage(error).toLowerCase();
  return message.includes('does not exist') || message.includes('not found') || message.includes('nonexistent');
}

export class ContractAdapter {
  private readonly readClient: GenLayerClient;
  private writeClient: GenLayerClient | null = null;
  private account: Address | null = null;
  private walletOptions = new Map<string, WalletOption>();

  constructor() {
    this.readClient = createClient({ chain: studionet });
  }

  public getConnectedAccount(): Address | null {
    return this.account;
  }

  public async getAvailableWallets(): Promise<Array<Omit<WalletOption, 'provider'>>> {
    const wallets = await discoverWalletProviders();
    this.walletOptions = new Map(wallets.map((wallet) => [wallet.id, wallet]));
    return wallets.map(({ provider: _provider, ...wallet }) => wallet);
  }

  public async restoreWallet(): Promise<Address | null> {
    const wallets = await discoverWalletProviders();
    this.walletOptions = new Map(wallets.map((wallet) => [wallet.id, wallet]));
    const selectedId = window.localStorage.getItem(SELECTED_WALLET_KEY);
    const wallet = (selectedId && this.walletOptions.get(selectedId)) || (wallets.length === 1 ? wallets[0] : null);
    if (!wallet) return null;
    const provider = wallet.provider;
    const accounts = (await provider.request({ method: 'eth_accounts' })) as string[];
    if (!Array.isArray(accounts) || !accounts[0]) return null;
    const chainId = String(await provider.request({ method: 'eth_chainId' })).toLowerCase();
    if (chainId !== STUDIONET_CONFIG.chainHex) return null;
    const address = await this.configureWalletClient(accounts[0], provider);
    return address;
  }

  public async connectWallet(walletId?: string): Promise<Address> {
    if (this.walletOptions.size === 0) await this.getAvailableWallets();
    const wallets = [...this.walletOptions.values()];
    if (wallets.length === 0) {
      throw new Error('No EIP-1193 browser wallet detected. Open this app in a browser with a compatible wallet extension.');
    }
    const wallet = walletId ? this.walletOptions.get(walletId) : wallets.length === 1 ? wallets[0] : null;
    if (!wallet) throw new Error('Choose a wallet to continue.');
    const provider = wallet.provider;

    const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
    if (!Array.isArray(accounts) || !accounts[0]) throw new Error('Wallet did not return an account.');

    await ensureStudionet(provider);
    if (wallet.isMetaMask) await ensureMetaMaskGenLayerSnap(provider);
    const address = await this.configureWalletClient(accounts[0], provider);
    window.localStorage.setItem(SELECTED_WALLET_KEY, wallet.id);
    window.dispatchEvent(new CustomEvent('retraction:wallet', { detail: address }));
    return address;
  }

  private async configureWalletClient(account: string, provider: Eip1193Provider): Promise<Address> {
    const address = normalizeWalletAddress(account);
    const client = createClient({
      chain: studionet,
      account: address,
      provider: withStudionetWalletCompatibility(provider) as never,
    });
    this.account = address;
    this.writeClient = client;
    return address;
  }

  private requireWriteClient(): GenLayerClient {
    if (!this.account || !this.writeClient) throw new Error('Wallet connection required before submitting transactions.');
    return this.writeClient;
  }

  private requireWriteAccount(): Address {
    this.requireWriteClient();
    return this.account as Address;
  }

  private async read(functionName: string, args: unknown[] = []): Promise<unknown> {
    const address = requireContractAddress();
    const raw = await retryTransientRpcRead(() => this.readClient.readContract({
        address,
        functionName,
        args: args as never[],
        jsonSafeReturn: true,
      }));
    return normalizeContractValue(raw);
  }

  private async submit(functionName: string, args: unknown[]): Promise<string> {
    const client = this.requireWriteClient();
    const hash = await client.writeContract({
      address: requireContractAddress(),
      functionName,
      args: args as never[],
      value: 0n,
    });
    if (typeof hash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      throw new Error('GenLayerJS did not return a valid transaction hash.');
    }
    return hash;
  }

  private async waitForFinalized(hash: string): Promise<TransactionReceiptSummary> {
    const receipt = await this.readClient.waitForTransactionReceipt({
      hash: hash as never,
      status: TransactionStatus.FINALIZED,
      interval: FINALITY_POLL_INTERVAL_MS,
      retries: FINALITY_POLL_RETRIES,
    });
    return summarizeTransactionReceipt(receipt);
  }

  public async getPolicy(): Promise<Policy> {
    return PolicySchema.parse(await this.read('get_policy'));
  }

  public async getCounts(): Promise<Counts> {
    return CountsSchema.parse(await this.read('get_counts'));
  }

  public async getProposal(proposalId: number): Promise<Proposal | null> {
    try {
      return ProposalSchema.parse(await this.read('get_proposal', [proposalId]));
    } catch (error) {
      if (isMissingRecordError(error)) return null;
      throw error;
    }
  }

  public async getProposalStatus(proposalId: number): Promise<{ status: string; hasPendingReview: boolean }> {
    const raw = await this.read('get_proposal_status', [proposalId]);
    const parsed = raw as { status?: unknown; hasPendingReview?: unknown };
    if (typeof parsed.status !== 'string' || typeof parsed.hasPendingReview !== 'boolean') {
      throw new Error('Contract returned an invalid proposal status.');
    }
    return { status: parsed.status, hasPendingReview: parsed.hasPendingReview };
  }

  public async getDependency(dependencyId: number): Promise<Dependency | null> {
    try {
      return DependencySchema.parse(await this.read('get_dependency', [dependencyId]));
    } catch (error) {
      if (isMissingRecordError(error)) return null;
      throw error;
    }
  }

  public async getDependencyHistory(dependencyId: number): Promise<DependencyHistory> {
    return DependencyHistorySchema.parse(await this.read('get_dependency_history', [dependencyId]));
  }

  public async listProposals(
    cursor = 0,
    limit = 10,
  ): Promise<{ items: Proposal[]; total: number; nextCursor: number | null }> {
    const raw = (await this.read('list_proposals', [cursor, limit])) as {
      items?: unknown[];
      total?: unknown;
      nextCursor?: unknown;
    };
    return {
      items: (raw.items ?? []).map((item) => ProposalSchema.parse(item)),
      total: CountsSchema.shape.proposals.parse(raw.total),
      nextCursor: raw.nextCursor === null || raw.nextCursor === undefined ? null : Number(raw.nextCursor),
    };
  }

  public async listOwnerProposals(
    owner: string,
    cursor = 0,
    limit = 10,
  ): Promise<{ items: Proposal[]; total: number; nextCursor: number | null }> {
    const raw = (await this.read('list_owner_proposals', [normalizeWalletAddress(owner), cursor, limit])) as {
      items?: unknown[];
      total?: unknown;
      nextCursor?: unknown;
    };
    return {
      items: (raw.items ?? []).map((item) => ProposalSchema.parse(item)),
      total: Number(raw.total ?? 0),
      nextCursor: raw.nextCursor === null || raw.nextCursor === undefined ? null : Number(raw.nextCursor),
    };
  }

  public async getLatestOwnerProposal(owner: string): Promise<Proposal | null> {
    if (!owner) return null;
    const raw = await this.read('get_latest_owner_proposal', [normalizeWalletAddress(owner)]);
    if (!raw || Object.keys(raw as Record<string, unknown>).length === 0) return null;
    return ProposalSchema.parse(raw);
  }

  public async listProposalDependencies(proposalId: number): Promise<Dependency[]> {
    const raw = await this.read('list_proposal_dependencies', [proposalId]);
    if (!Array.isArray(raw)) throw new Error('Contract returned an invalid dependency list.');
    return raw.map((item) => DependencySchema.parse(item));
  }

  public async createProposal(title: string, claimText: string): Promise<{ hash: string; status: 'READBACK_CONFIRMED' }> {
    return txService.execute({
      action: 'create_proposal',
      args: [title, claimText],
      walletAddress: this.requireWriteAccount(),
      readBefore: () => this.getCounts(),
      submit: () => this.submit('create_proposal', [title, claimText]),
      waitForFinalized: (hash) => this.waitForFinalized(hash),
      verifyReadback: async (before) => {
        const after = await this.getCounts();
        const latest = await this.getLatestOwnerProposal(this.account ?? '');
        const matched =
          after.proposals === before.proposals + 1 &&
          latest?.title === title.trim() &&
          latest.claimText === claimText.trim();
        return { matched, summary: `proposal count ${before.proposals} → ${after.proposals}; latest #${latest?.id ?? 'missing'}` };
      },
    });
  }

  public async editProposal(
    proposalId: number,
    title: string,
    claimText: string,
  ): Promise<{ hash: string; status: 'READBACK_CONFIRMED' }> {
    return txService.execute({
      action: 'edit_proposal',
      args: [proposalId, title, claimText],
      walletAddress: this.requireWriteAccount(),
      readBefore: async () => {
        const proposal = await this.getProposal(proposalId);
        if (!proposal) throw new Error('Proposal does not exist.');
        return proposal;
      },
      submit: () => this.submit('edit_proposal', [proposalId, title, claimText]),
      waitForFinalized: (hash) => this.waitForFinalized(hash),
      verifyReadback: async (before) => {
        const after = await this.getProposal(proposalId);
        const matched =
          after?.revision === before.revision + 1 &&
          after.title === title.trim() &&
          after.claimText === claimText.trim();
        return { matched, summary: `proposal #${proposalId} revision ${before.revision} → ${after?.revision ?? 'missing'}` };
      },
    });
  }

  public async addDependency(
    proposalId: number,
    originalDoi: string,
    originalPmid: string,
    dependencyStatement: string,
    noticeDoi: string,
    noticePmid: string,
  ): Promise<{ hash: string; status: 'READBACK_CONFIRMED' }> {
    const args = [proposalId, originalDoi, originalPmid, dependencyStatement, noticeDoi, noticePmid];
    return txService.execute({
      action: 'add_dependency',
      args,
      walletAddress: this.requireWriteAccount(),
      readBefore: async () => ({
        dependencies: await this.listProposalDependencies(proposalId),
        proposal: await this.getProposal(proposalId),
      }),
      submit: () => this.submit('add_dependency', args),
      waitForFinalized: (hash) => this.waitForFinalized(hash),
      verifyReadback: async (before) => {
        const after = await this.listProposalDependencies(proposalId);
        const proposal = await this.getProposal(proposalId);
        const created = after.find(
          (dependency) =>
            dependency.originalDoi === normalizeDoi(originalDoi) &&
            dependency.originalPmid === normalizePmid(originalPmid),
        );
        const matched =
          after.length === before.dependencies.length + 1 &&
          proposal?.revision === (before.proposal?.revision ?? 0) + 1 &&
          created?.dependencyStatement === dependencyStatement.trim();
        return { matched, summary: `dependency count ${before.dependencies.length} → ${after.length}; created #${created?.id ?? 'missing'}` };
      },
    });
  }

  public async editDependency(
    dependencyId: number,
    originalDoi: string,
    originalPmid: string,
    dependencyStatement: string,
    noticeDoi: string,
    noticePmid: string,
  ): Promise<{ hash: string; status: 'READBACK_CONFIRMED' }> {
    const args = [dependencyId, originalDoi, originalPmid, dependencyStatement, noticeDoi, noticePmid];
    return txService.execute({
      action: 'edit_dependency',
      args,
      walletAddress: this.requireWriteAccount(),
      readBefore: async () => {
        const dependency = await this.getDependency(dependencyId);
        if (!dependency) throw new Error('Dependency does not exist.');
        return dependency;
      },
      submit: () => this.submit('edit_dependency', args),
      waitForFinalized: (hash) => this.waitForFinalized(hash),
      verifyReadback: async (before) => {
        const after = await this.getDependency(dependencyId);
        const matched =
          after?.revision === before.revision + 1 &&
          after.originalDoi === normalizeDoi(originalDoi) &&
          after.originalPmid === normalizePmid(originalPmid) &&
          after.dependencyStatement === dependencyStatement.trim() &&
          after.pendingNoticeDoi === normalizeDoi(noticeDoi) &&
          after.pendingNoticePmid === normalizePmid(noticePmid);
        return { matched, summary: `dependency #${dependencyId} revision ${before.revision} → ${after?.revision ?? 'missing'}` };
      },
    });
  }

  public async removeDependency(
    dependencyId: number,
    proposalId: number,
  ): Promise<{ hash: string; status: 'READBACK_CONFIRMED' }> {
    return txService.execute({
      action: 'remove_dependency',
      args: [dependencyId, proposalId],
      walletAddress: this.requireWriteAccount(),
      readBefore: async () => ({
        dependencies: await this.listProposalDependencies(proposalId),
        proposal: await this.getProposal(proposalId),
      }),
      submit: () => this.submit('remove_dependency', [dependencyId]),
      waitForFinalized: (hash) => this.waitForFinalized(hash),
      verifyReadback: async (before) => {
        const removed = await this.getDependency(dependencyId);
        const dependencies = await this.listProposalDependencies(proposalId);
        const proposal = await this.getProposal(proposalId);
        const matched =
          removed === null &&
          dependencies.length === before.dependencies.length - 1 &&
          proposal?.revision === (before.proposal?.revision ?? 0) + 1;
        return { matched, summary: `dependency #${dependencyId} removed; count ${before.dependencies.length} → ${dependencies.length}` };
      },
    });
  }

  public async sealProposal(proposalId: number): Promise<{ hash: string; status: 'READBACK_CONFIRMED' }> {
    return txService.execute({
      action: 'seal_proposal',
      args: [proposalId],
      walletAddress: this.requireWriteAccount(),
      readBefore: async () => {
        const proposal = await this.getProposal(proposalId);
        if (!proposal) throw new Error('Proposal does not exist.');
        return proposal;
      },
      submit: () => this.submit('seal_proposal', [proposalId]),
      waitForFinalized: (hash) => this.waitForFinalized(hash),
      verifyReadback: async (before) => {
        const after = await this.getProposal(proposalId);
        const dependencies = await this.listProposalDependencies(proposalId);
        const matched =
          after?.sealed === true &&
          after.revision === before.revision + 1 &&
          dependencies.length > 0 &&
          dependencies.every((dependency) => dependency.reviewStatus === 'PENDING' && dependency.reviewRound === 1);
        return { matched, summary: `proposal #${proposalId} sealed; ${dependencies.length} review(s) opened` };
      },
    });
  }

  public async activateProposal(proposalId: number): Promise<{ hash: string; status: 'READBACK_CONFIRMED' }> {
    return txService.execute({
      action: 'activate_proposal',
      args: [proposalId],
      walletAddress: this.requireWriteAccount(),
      readBefore: async () => {
        const proposal = await this.getProposal(proposalId);
        if (!proposal) throw new Error('Proposal does not exist.');
        return proposal;
      },
      submit: () => this.submit('activate_proposal', [proposalId]),
      waitForFinalized: (hash) => this.waitForFinalized(hash),
      verifyReadback: async (before) => {
        const after = await this.getProposal(proposalId);
        const matched = after?.activated === true && after.status === 'ACTIVE' && after.revision === before.revision + 1;
        return { matched, summary: `proposal #${proposalId} status ${before.status} → ${after?.status ?? 'missing'}` };
      },
    });
  }

  public async requestReview(
    dependencyId: number,
    noticeDoi: string,
    noticePmid: string,
  ): Promise<{ hash: string; status: 'READBACK_CONFIRMED' }> {
    const args = [dependencyId, noticeDoi, noticePmid];
    return txService.execute({
      action: 'request_review',
      args,
      walletAddress: this.requireWriteAccount(),
      readBefore: async () => {
        const dependency = await this.getDependency(dependencyId);
        if (!dependency) throw new Error('Dependency does not exist.');
        return dependency;
      },
      submit: () => this.submit('request_review', args),
      waitForFinalized: (hash) => this.waitForFinalized(hash),
      verifyReadback: async (before) => {
        const after = await this.getDependency(dependencyId);
        const matched =
          after?.reviewStatus === 'PENDING' &&
          after.reviewRound === before.reviewRound + 1 &&
          after.revision === before.revision + 1 &&
          after.pendingNoticeDoi === normalizeDoi(noticeDoi) &&
          after.pendingNoticePmid === normalizePmid(noticePmid);
        return { matched, summary: `dependency #${dependencyId} review round ${before.reviewRound} → ${after?.reviewRound ?? 'missing'}` };
      },
    });
  }

  public async resolveReview(dependencyId: number): Promise<{ hash: string; status: 'READBACK_CONFIRMED' }> {
    return txService.execute({
      action: 'resolve_review',
      args: [dependencyId],
      walletAddress: this.requireWriteAccount(),
      readBefore: async () => {
        const dependency = await this.getDependency(dependencyId);
        if (!dependency) throw new Error('Dependency does not exist.');
        return dependency;
      },
      submit: () => this.submit('resolve_review', [dependencyId]),
      waitForFinalized: (hash) => this.waitForFinalized(hash),
      verifyReadback: async (before) => {
        const after = await this.getDependency(dependencyId);
        const matched =
          after?.reviewStatus === 'IDLE' &&
          after.reviewRound === before.reviewRound &&
          after.revision === before.revision + 1 &&
          !after.pendingNoticeDoi &&
          !after.pendingNoticePmid;
        return { matched, summary: `dependency #${dependencyId} resolved to ${after?.verdict ?? 'missing'}` };
      },
    });
  }

  public async resumePendingTransactions(): Promise<void> {
    for (const record of txService.getRecoverableRecords()) {
      if (!record.hash) continue;
      try {
        const receipt = await this.waitForFinalized(record.hash);
        txService.markFinalized(record.id, receipt);
        assertSuccessfulFinalizedReceipt(receipt);
        txService.markExecutionSucceeded(record.id);
        const result = await this.verifyRecoveredRecord(record);
        if (result.matched) txService.markReadbackConfirmed(record.id, result.summary);
        else txService.markReconciliationRequired(record.id, result.summary);
      } catch (error) {
        txService.markFailed(record.id, errorMessage(error));
      }
    }
  }

  private async verifyRecoveredRecord(record: TxRecord): Promise<{ matched: boolean; summary: string }> {
    const [first, second, third] = record.args;
    switch (record.action) {
      case 'create_proposal': {
        const latest = await this.getLatestOwnerProposal(record.walletAddress ?? '');
        const matched = latest?.title === String(first).trim() && latest.claimText === String(second).trim();
        return { matched, summary: `latest owner proposal ${matched ? `matches #${latest?.id}` : 'does not match'}` };
      }
      case 'edit_proposal': {
        const proposal = await this.getProposal(Number(first));
        const matched = proposal?.title === String(second).trim() && proposal.claimText === String(third).trim();
        return { matched, summary: `proposal #${first} ${matched ? 'matches requested edit' : 'does not match requested edit'}` };
      }
      case 'add_dependency':
      case 'edit_dependency': {
        const proposalId = record.action === 'add_dependency' ? Number(first) : null;
        const dependency =
          record.action === 'edit_dependency'
            ? await this.getDependency(Number(first))
            : (await this.listProposalDependencies(proposalId ?? 0)).find(
                (item) => item.originalDoi === normalizeDoi(String(second)),
              ) ?? null;
        const fieldStart = 1;
        const matched =
          dependency?.originalDoi === normalizeDoi(String(record.args[fieldStart])) &&
          dependency.originalPmid === normalizePmid(String(record.args[fieldStart + 1])) &&
          dependency.dependencyStatement === String(record.args[fieldStart + 2]).trim() &&
          dependency.pendingNoticeDoi === normalizeDoi(String(record.args[fieldStart + 3] ?? '')) &&
          dependency.pendingNoticePmid === normalizePmid(String(record.args[fieldStart + 4] ?? ''));
        return { matched, summary: `${record.action} ${matched ? 'matches chain readback' : 'does not match chain readback'}` };
      }
      case 'remove_dependency': {
        const dependency = await this.getDependency(Number(first));
        return { matched: dependency === null, summary: `dependency #${first} ${dependency ? 'still exists' : 'is absent'}` };
      }
      case 'seal_proposal': {
        const proposal = await this.getProposal(Number(first));
        return { matched: proposal?.sealed === true, summary: `proposal #${first} sealed=${proposal?.sealed ?? false}` };
      }
      case 'activate_proposal': {
        const proposal = await this.getProposal(Number(first));
        return { matched: proposal?.status === 'ACTIVE', summary: `proposal #${first} status=${proposal?.status ?? 'missing'}` };
      }
      case 'request_review': {
        const dependency = await this.getDependency(Number(first));
        const matched =
          dependency?.reviewStatus === 'PENDING' &&
          dependency.pendingNoticeDoi === normalizeDoi(String(second)) &&
          dependency.pendingNoticePmid === normalizePmid(String(third));
        return { matched, summary: `dependency #${first} review=${dependency?.reviewStatus ?? 'missing'}` };
      }
      case 'resolve_review': {
        const dependency = await this.getDependency(Number(first));
        return { matched: dependency?.reviewStatus === 'IDLE', summary: `dependency #${first} review=${dependency?.reviewStatus ?? 'missing'}` };
      }
      default:
        return { matched: false, summary: `Unknown action ${record.action}` };
    }
  }
}

export const contractAdapter = new ContractAdapter();
export { IS_CONTRACT_CONFIGURED };
