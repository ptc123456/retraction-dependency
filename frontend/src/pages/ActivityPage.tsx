import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { contractAdapter } from '../services/contractAdapter';
import { TxRecord, txService } from '../services/txService';

function statusClass(record: TxRecord): string {
  if (record.state === 'READBACK_CONFIRMED') return 'chip-usable';
  if (record.state === 'FAILED' || record.state === 'UNDETERMINED') return 'chip-invalid';
  return 'chip-unresolved';
}

export const ActivityPage: React.FC = () => {
  const [records, setRecords] = useState<TxRecord[]>(txService.getRecords());
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconciliationStatus, setReconciliationStatus] = useState<string | null>(null);

  const recoverableCount = records.filter(
    (record) => Boolean(record.hash) && record.state !== 'READBACK_CONFIRMED',
  ).length;
  const failedWithoutHashCount = records.filter(
    (record) => !record.hash && (record.state === 'FAILED' || record.state === 'UNDETERMINED'),
  ).length;

  const refresh = () => setRecords(txService.getRecords());

  const reconcile = async () => {
    const latestRecords = txService.getRecords();
    const recoverableBefore = txService.getRecoverableRecords();
    const failedWithoutHashBefore = latestRecords.filter(
      (record) => !record.hash && (record.state === 'FAILED' || record.state === 'UNDETERMINED'),
    ).length;

    setRecords(latestRecords);
    setError(null);
    setReconciliationStatus(null);

    if (recoverableBefore.length === 0) {
      setReconciliationStatus(
        failedWithoutHashBefore > 0
          ? `All submitted transaction hashes are already readback-confirmed. ${failedWithoutHashBefore} failed pre-submission attempt${failedWithoutHashBefore === 1 ? ' has' : 's have'} no transaction hash, so there is no on-chain transaction to resume.`
          : 'All submitted transaction hashes are already readback-confirmed. No reconciliation action was needed.',
      );
      return;
    }

    setReconciling(true);
    try {
      await contractAdapter.resumePendingTransactions();
      const remaining = txService.getRecoverableRecords().length;
      const confirmed = recoverableBefore.length - remaining;
      setReconciliationStatus(
        remaining === 0
          ? `Reconciliation completed: ${confirmed} transaction hash${confirmed === 1 ? '' : 'es'} readback-confirmed.`
          : `Reconciliation checked ${recoverableBefore.length} transaction hash${recoverableBefore.length === 1 ? '' : 'es'}: ${confirmed} confirmed and ${remaining} still require attention.`,
      );
    } catch (reconcileError) {
      setError(reconcileError instanceof Error ? reconcileError.message : 'Transaction reconciliation failed.');
    } finally {
      setReconciling(false);
      refresh();
    }
  };

  useEffect(() => {
    void reconcile();
    // Reconciliation intentionally runs once when the route is opened or refreshed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page-container">
      <div className="section-heading">
        <div>
          <h1 className="page-title">Activity ledger & transaction reconciliation</h1>
          <p className="page-subtitle">
            Hashes are stored locally under Studionet chain ID 61999 and the configured contract address. A hash or finality alone is never displayed as success.
          </p>
        </div>
        <div className="action-row">
          <button className="btn btn-secondary" onClick={() => void reconcile()} disabled={reconciling}>
            <RefreshCw size={16} />
            {reconciling
              ? `Reconciling ${recoverableCount}…`
              : recoverableCount > 0
                ? `Resume reconciliation (${recoverableCount})`
                : 'Reconciliation current'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const confirmedCount = records.filter((record) => record.state === 'READBACK_CONFIRMED').length;
              txService.clearCompleted();
              refresh();
              setError(null);
              setReconciliationStatus(
                confirmedCount > 0
                  ? `Cleared ${confirmedCount} readback-confirmed record${confirmedCount === 1 ? '' : 's'} from this browser. Failed attempts and unresolved hashes were preserved.`
                  : 'There were no readback-confirmed records to clear.',
              );
            }}
          >
            <Trash2 size={15} /> Clear confirmed
          </button>
        </div>
      </div>

      {error && <div className="form-error notice-panel" role="alert">{error}</div>}
      {reconciliationStatus && (
        <div className="success-panel" role="status" aria-live="polite">
          {reconciliationStatus}
        </div>
      )}

      {failedWithoutHashCount > 0 && (
        <p className="permission-note">
          {failedWithoutHashCount} failed attempt{failedWithoutHashCount === 1 ? '' : 's'} stopped before a transaction hash was returned. These local records cannot be reconciled against Studionet and are intentionally not reported as submitted transactions.
        </p>
      )}

      <div className="data-table-container">
        {records.length === 0 ? (
          <div className="empty-state">No locally known transaction hashes for this Studionet contract.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Action / hash</th>
                <th>Lifecycle state</th>
                <th>Finality</th>
                <th>Execution</th>
                <th>Readback</th>
                <th>Explorer</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <strong className="mono">{record.action}</strong>
                    <div className="mono breakable">{record.hash ?? 'Awaiting wallet signature'}</div>
                    <small>{new Date(record.timestamp).toLocaleString()}</small>
                  </td>
                  <td>
                    <span className={`chip ${statusClass(record)}`}>
                      {record.state === 'READBACK_CONFIRMED' ? <CheckCircle2 size={12} /> : record.state === 'FAILED' || record.state === 'UNDETERMINED' ? <AlertTriangle size={12} /> : <Clock size={12} />}
                      {record.state}
                    </span>
                    {record.error && <div className="form-error">{record.error}</div>}
                  </td>
                  <td>{record.finalStatus ?? 'Not finalized'}</td>
                  <td>{record.executionResult ?? 'Not inspected'}</td>
                  <td>{record.readback ?? 'Not confirmed'}</td>
                  <td>
                    {record.explorerUrl ? (
                      <a href={record.explorerUrl} target="_blank" rel="noreferrer" className="btn btn-secondary compact">
                        Explorer <ExternalLink size={12} />
                      </a>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="permission-note">
        `UNDETERMINED`, wallet rejection, guard failure, and readback mismatch are not success. Return to the relevant proposal to explicitly retry the write after checking the chain state.
      </p>
    </div>
  );
};
