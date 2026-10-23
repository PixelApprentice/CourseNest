import { Component, type ReactNode, type ErrorInfo } from 'react';
import { IconAlertTriangle, IconRefresh, IconBooks, IconChevronDown } from '@tabler/icons-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('CourseNest ErrorBoundary captured an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] w-full p-6 sm:p-10 flex items-center justify-center">
          <div className="max-w-xl w-full bg-[var(--cn-surface)] border border-[var(--cn-border)] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in fade-in duration-200">
            {/* Header Icon */}
            <div className="w-14 h-14 rounded-2xl bg-[var(--cn-warning-tint)] text-[var(--cn-warning)] border border-[var(--cn-warning)]/30 mx-auto flex items-center justify-center shadow-inner">
              <IconAlertTriangle size={28} />
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[var(--cn-text-primary)]">
                {this.props.fallbackTitle || 'Something interrupted this view'}
              </h3>
              <p className="text-xs text-[var(--cn-text-muted)] font-mono leading-relaxed max-w-md mx-auto">
                CourseNest caught a display issue and protected your offline learning data from corruption. No notes or progress were lost.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--cn-primary)] text-[var(--cn-primary-text)] text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-[background-color,transform] duration-150 ease-out shadow-sm active:scale-95"
              >
                <IconRefresh size={15} />
                <span>Try Again</span>
              </button>

              <a
                href="#/library"
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)] text-[var(--cn-text-secondary)] text-xs font-mono font-medium hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)] transition-[background-color,color,border-color,transform] duration-150 ease-out active:scale-95"
              >
                <IconBooks size={15} />
                <span>Go to Library</span>
              </a>
            </div>

            {/* Technical Diagnostics (Collapsible) */}
            <div className="pt-4 border-t border-[var(--cn-border)] text-left">
              <button
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="flex items-center justify-between w-full text-[11px] font-mono text-[var(--cn-text-muted)] hover:text-[var(--cn-text-secondary)] py-1"
              >
                <span>Diagnostics & Trace</span>
                <IconChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${this.state.showDetails ? 'rotate-180' : ''}`}
                />
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-3 rounded-xl bg-[var(--cn-bg)] border border-[var(--cn-border)] text-[10px] font-mono text-[var(--cn-text-muted)] max-h-48 overflow-y-auto space-y-1 select-text">
                  <p className="text-[var(--cn-warning)] font-semibold">{this.state.error?.toString()}</p>
                  <pre className="whitespace-pre-wrap leading-tight opacity-75">
                    {this.state.errorInfo?.componentStack || this.state.error?.stack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
