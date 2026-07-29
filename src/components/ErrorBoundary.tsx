import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Something went wrong." };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="font-mono text-6xl text-seal-deep mb-4">×</div>
            <h1 className="font-mono text-xl text-ink mb-3">Something broke.</h1>
            <p className="text-sm text-ink/70 mb-6">
              {this.state.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mono-tag text-xs uppercase tracking-wider px-5 py-2.5 border border-ink rounded-sm hover:bg-ink hover:text-seal transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
