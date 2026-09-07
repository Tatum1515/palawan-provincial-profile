import { Component } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

export default class RouteErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("PPDO route render error:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        const message = this.state.error?.message || "Unexpected interface error.";

        return (
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <div className="w-full max-w-2xl rounded-2xl border border-rose-200 bg-white p-8 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="rounded-xl bg-rose-50 p-3 text-rose-600">
                            <TriangleAlert size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-600">PPDO Monitor</p>
                            <h1 className="mt-1 text-xl font-bold text-slate-900">This page could not be displayed</h1>
                            <p className="mt-2 text-sm leading-6 text-slate-600">The application encountered a rendering error. Your saved data was not automatically deleted.</p>
                            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Error details</p>
                                <p className="mt-1 break-words text-sm text-slate-700">{message}</p>
                            </div>
                            <div className="mt-5 flex flex-wrap gap-2">
                                <button type="button" onClick={this.handleRetry} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                                    <RefreshCw size={17} /> Retry
                                </button>
                                <button type="button" onClick={() => window.location.reload()} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                    Reload page
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
