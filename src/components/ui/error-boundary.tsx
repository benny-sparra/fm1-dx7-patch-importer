import { Component, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: unknown) => void
}

/** Shows `fallback` in place of a subtree that failed, such as a lazily loaded chunk that did not arrive. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  override componentDidCatch(error: unknown) {
    this.props.onError?.(error)
  }

  override render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children
  }
}
