import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Algo salió mal
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center max-w-md">
            {this.state.error?.message || 'Ocurrió un error inesperado. Intenta de nuevo.'}
          </p>
          <Button variant="secondary" onClick={this.handleRetry} icon={<RefreshCw className="h-4 w-4" />}>
            Reintentar
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
