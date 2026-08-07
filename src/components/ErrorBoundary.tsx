import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { failed: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unexpected tool crash', error, info.componentStack)
  }

  render() {
    if (this.state.failed) {
      return <main className="legal-page page-shell"><div className="status-panel"><h1>도구를 불러오지 못했습니다</h1><p>선택한 원본 파일은 변경되거나 업로드되지 않았습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.</p><button className="button primary" type="button" onClick={() => window.location.reload()}>새로고침</button></div></main>
    }
    return this.props.children
  }
}
