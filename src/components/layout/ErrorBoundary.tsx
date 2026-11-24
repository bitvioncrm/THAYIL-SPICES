import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas p-6 text-center">
          <h1 className="font-display text-2xl text-forest">Something went wrong</h1>
          <p className="max-w-md text-sm text-soft">{this.state.error.message}</p>
          <Button onClick={() => window.location.reload()}>Reload application</Button>
        </div>
      )
    }
    return this.props.children
  }
}
