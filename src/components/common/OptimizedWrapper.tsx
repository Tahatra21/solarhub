"use client";

import React, { Suspense, Component } from 'react';
import { PerformanceMonitor } from '@/lib/performance';

interface OptimizedWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  enablePerformanceMonitoring?: boolean;
  componentName?: string;
}

// Fix: Use Component instead of ErrorBoundary from React
class ErrorBoundaryComponent extends Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('OptimizedWrapper caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center text-red-500">
          <p>Something went wrong. Please try refreshing the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

const DefaultFallback: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

const OptimizedWrapper: React.FC<OptimizedWrapperProps> = ({
  children,
  fallback = <DefaultFallback />,
  errorFallback,
  enablePerformanceMonitoring = false,
  componentName = 'UnknownComponent'
}) => {
  React.useEffect(() => {
    if (enablePerformanceMonitoring) {
      // Fix: Use static methods from PerformanceMonitor
      const measureId = PerformanceMonitor.start(componentName);
      return () => {
        PerformanceMonitor.end(measureId);
      };
    }
  }, [enablePerformanceMonitoring, componentName]);

  return (
    <ErrorBoundaryComponent fallback={errorFallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundaryComponent>
  );
};

export default OptimizedWrapper;