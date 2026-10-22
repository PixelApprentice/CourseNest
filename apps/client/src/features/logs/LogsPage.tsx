import { useState } from 'react';
import { 
  useSystemLogs, 
  clearLogs, 
  addLog, 
  exportLogsAsText, 
  exportLogsAsJson, 
  type LogEntry, 
  type LogLevel, 
  type LogCategory 
} from '../../lib/logger';
import { 
  IconTerminal, 
  IconSearch, 
  IconCopy, 
  IconDownload, 
  IconTrash, 
  IconAlertTriangle, 
  IconAlertCircle, 
  IconInfoCircle, 
  IconCircleCheck, 
  IconBug, 
  IconChevronDown, 
  IconChevronRight 
} from '@tabler/icons-react';

export function LogsPage() {
  const { logs } = useSystemLogs();
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});

  // Filter logs
  const filteredLogs = logs.filter((log: LogEntry) => {
    if (selectedLevel !== 'ALL' && log.level !== selectedLevel) return false;
    if (selectedCategory !== 'ALL' && log.category !== selectedCategory) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inMsg = log.message.toLowerCase().includes(q);
      const inDet = log.details?.toLowerCase().includes(q) ?? false;
      const inCat = log.category.toLowerCase().includes(q);
      if (!inMsg && !inDet && !inCat) return false;
    }

    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyLogs = () => {
    const text = exportLogsAsText();
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  const handleDownloadText = () => {
    const text = exportLogsAsText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coursenest_system_logs_${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const json = exportLogsAsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coursenest_diagnostic_report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSimulateTestError = () => {
    addLog(
      'ERROR',
      'IMPORTER',
      'Archive verification simulated warning: CRC32 checksum mismatch in block chunk 4',
      'Source: /media/external/CS301_part2.zip • Handled by atomic recovery manager',
    );
  };

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'ERROR':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--cn-danger-tint)] text-[var(--cn-danger)] border border-[var(--cn-danger)]/40">
            <IconAlertCircle size={11} />
            ERROR
          </span>
        );
      case 'WARN':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--cn-warning-tint)] text-[var(--cn-warning)] border border-[var(--cn-warning)]/40">
            <IconAlertTriangle size={11} />
            WARN
          </span>
        );
      case 'INFO':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--cn-info-tint)] text-[var(--cn-info)] border border-[var(--cn-info)]/40">
            <IconInfoCircle size={11} />
            INFO
          </span>
        );
      case 'DEBUG':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--cn-surface-subtle)] text-[var(--cn-text-muted)] border border-[var(--cn-border)]">
            DEBUG
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--cn-primary)] font-semibold mb-1">
            <IconTerminal size={14} />
            <span>SYSTEM LOGS & TELEMETRY</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-[var(--cn-text-primary)]">
            System Diagnostics & Error Logs
          </h2>
          <p className="text-xs text-[var(--cn-text-secondary)] mt-1">
            Audit extraction events, external drive connections, path checks, and runtime health records.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-subtle)] transition-colors"
          >
            <IconCopy size={13} />
            <span>{copiedSuccess ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownloadText}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-subtle)] transition-colors"
          >
            <IconDownload size={13} />
            <span>Export .log</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors shadow-xs"
          >
            <IconDownload size={13} />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleSimulateTestError}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-mono font-medium text-[var(--cn-text-muted)] hover:text-[var(--cn-accent)] hover:border-[var(--cn-accent)]/40 transition-colors"
            title="Inject a test diagnostic entry"
          >
            <IconBug size={13} />
            <span>Simulate Error</span>
          </button>

          <button
            onClick={clearLogs}
            className="p-1.5 rounded-lg text-[var(--cn-text-muted)] hover:text-[var(--cn-danger)] hover:bg-[var(--cn-danger-tint)] transition-colors"
            title="Clear Log History"
          >
            <IconTrash size={15} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cn-text-muted)]" />
          <input
            type="text"
            placeholder="Search error messages, file paths, or exceptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-mono text-[var(--cn-text-primary)] placeholder-[var(--cn-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
          />
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="flex items-center bg-[var(--cn-bg)] p-1 rounded-lg border border-[var(--cn-border)] text-xs font-mono">
            {(['ALL', 'ERROR', 'WARN', 'INFO'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  selectedLevel === lvl
                    ? 'bg-[var(--cn-surface)] text-[var(--cn-primary)] shadow-xs'
                    : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as LogCategory | 'ALL')}
            className="px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs font-mono text-[var(--cn-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
          >
            <option value="ALL">All Subsystems</option>
            <option value="STORAGE">Storage & Vault</option>
            <option value="IMPORTER">Archive Importer</option>
            <option value="SECURITY">Security Sandbox</option>
            <option value="PLAYER">Video & PDF Player</option>
            <option value="SYSTEM">Runtime Core</option>
          </select>
        </div>
      </div>

      {/* Logs Table / Stream */}
      <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] overflow-hidden">
        <div className="h-10 px-5 bg-[var(--cn-bg)] border-b border-[var(--cn-border)] flex items-center justify-between text-[11px] font-mono text-[var(--cn-text-muted)]">
          <div className="flex items-center gap-6">
            <span className="w-20">TIME</span>
            <span className="w-16">LEVEL</span>
            <span className="w-20">SYSTEM</span>
            <span>MESSAGE</span>
          </div>
          <span>Showing {filteredLogs.length} of {logs.length}</span>
        </div>

        <div className="divide-y divide-[var(--cn-border)] max-h-[500px] overflow-y-auto font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-[var(--cn-text-muted)] space-y-1">
              <IconCircleCheck size={28} className="text-[var(--cn-success)] mx-auto opacity-70" />
              <p className="font-semibold text-xs pt-1">No diagnostic events found matching current criteria</p>
              <p className="text-[11px]">System runtime operations are healthy and nominal.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogIds[log.id];
              const dateStr = new Date(log.timestamp).toLocaleTimeString();

              return (
                <div key={log.id} className="hover:bg-[var(--cn-surface-subtle)]/50 transition-colors">
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="p-3.5 px-5 flex items-start justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-6 min-w-0">
                      <span className="w-20 text-[11px] text-[var(--cn-text-muted)] shrink-0">{dateStr}</span>
                      <span className="w-16 shrink-0">{getLevelBadge(log.level)}</span>
                      <span className="w-20 text-[10px] font-bold text-[var(--cn-text-secondary)] uppercase shrink-0">
                        {log.category}
                      </span>
                      <span className="font-semibold text-[var(--cn-text-primary)] truncate">{log.message}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {log.details && (
                        <span className="p-1 text-[var(--cn-text-muted)]">
                          {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                        </span>
                      )}
                    </div>
                  </div>

                  {isExpanded && log.details && (
                    <div className="px-5 pb-4 pt-1 bg-[var(--cn-bg)] border-t border-[var(--cn-border)]/50 text-[11px] space-y-2">
                      <div className="p-2.5 rounded bg-[var(--cn-surface)] border border-[var(--cn-border)] text-[var(--cn-text-secondary)]">
                        {log.details}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
