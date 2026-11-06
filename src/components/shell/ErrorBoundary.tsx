import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/** Keeps a render failure from wiping persisting state: the shell explains
 *  what happened and never loses the stored data. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("PULSE render error", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-ground px-6 text-center">
          <div className="text-[22px] font-semibold tracking-[-0.01em]">Something went off-beat</div>
          <p className="max-w-[440px] text-[14px] text-muted">
            The screen hit an error and stopped drawing. Your tasks and progress are safe —
            they live in this browser, not in the crashed frame.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="rounded-full bg-primary px-4 py-2 text-[14px] font-medium text-primary-ink hover:opacity-90"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
