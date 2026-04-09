import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Une erreur inattendue s'est produite.";
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            errorMessage = parsed.error;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-dmn-bg flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-gray-100 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertTriangle size={48} />
            </div>
            <h2 className="text-2xl font-heading font-black text-gray-900 mb-3">Oups ! Une erreur est survenue.</h2>
            <p className="text-gray-500 mb-6 text-sm font-medium leading-relaxed">
              {errorMessage}
            </p>
            <div className="bg-gray-50 p-4 rounded-2xl mb-8">
              <p className="text-xs text-gray-400 italic">"Nul n'est à l'abri d'une erreur, mais la persévérance mène à la perfection."</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-dmn-green-600 hover:bg-dmn-green-700 text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-dmn-green-100 active:scale-95"
            >
              Rafraîchir la page
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
