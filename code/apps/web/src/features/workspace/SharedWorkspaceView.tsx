import { useSharedWorkspace } from './useSharedWorkspace'
import type { EquationEntry } from '@quickplot/types'

const TYPE_LABELS: Record<EquationEntry['type'], string> = {
  cartesian: 'y =',
  polar: 'r =',
  parametric: '(x(t), y(t))',
  implicit: 'f(x,y) = 0',
  points: 'points',
}

/**
 * Read-only view of a publicly-shared workspace, reached via /shared/:shareId.
 *
 * Renders the workspace metadata and equations. Once the canvas renderer
 * (packages/renderer) is merged, this is where <Canvas2D> would be embedded
 * to draw the actual curves.
 */
export function SharedWorkspaceView({ shareId }: { shareId: string }) {
  const { workspace, status, error } = useSharedWorkspace(shareId)

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f17', color: '#e0e0e0', padding: '40px 20px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <a
          href="/"
          style={{ color: '#4a9ee0', fontSize: '14px', textDecoration: 'none' }}
        >
          &larr; QuickPlot
        </a>

        {status === 'loading' && (
          <p style={{ marginTop: '40px', color: '#888' }}>Loading shared workspace…</p>
        )}

        {status === 'not-found' && (
          <div style={{ marginTop: '40px' }}>
            <h1 style={{ fontSize: '20px' }}>Workspace not found</h1>
            <p style={{ color: '#888', marginTop: '8px' }}>
              This share link is invalid, or the workspace is no longer shared.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ marginTop: '40px' }}>
            <h1 style={{ fontSize: '20px', color: '#e05252' }}>Couldn&apos;t load workspace</h1>
            <p style={{ color: '#888', marginTop: '8px', wordBreak: 'break-word' }}>{error}</p>
          </div>
        )}

        {status === 'found' && workspace && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '24px', margin: 0 }}>{workspace.title}</h1>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'rgba(80,200,120,0.15)',
                  color: '#50c878',
                  border: '1px solid rgba(80,200,120,0.35)',
                }}
              >
                Shared &middot; read-only
              </span>
            </div>

            <p style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>
              Last updated {new Date(workspace.updatedAt).toLocaleString()}
            </p>

            {/* Equations */}
            <h2 style={{ fontSize: '13px', letterSpacing: '0.1em', color: '#888', marginTop: '28px' }}>
              EQUATIONS
            </h2>
            {workspace.equations.length === 0 ? (
              <p style={{ color: '#666', fontSize: '14px' }}>This workspace has no equations yet.</p>
            ) : (
              <div style={{ marginTop: '8px' }}>
                {workspace.equations.map(eq => (
                  <div
                    key={eq.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      background: '#1a1a2e',
                      borderRadius: '6px',
                      marginBottom: '6px',
                      opacity: eq.visible ? 1 : 0.5,
                    }}
                  >
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '3px',
                        background: eq.color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: '#888', fontSize: '12px', minWidth: '80px' }}>
                      {TYPE_LABELS[eq.type]}
                    </span>
                    <code style={{ fontSize: '14px', color: '#e0e0e0' }}>
                      {eq.expression}
                      {eq.type === 'parametric' && eq.expressionY ? `, ${eq.expressionY}` : ''}
                    </code>
                  </div>
                ))}
              </div>
            )}

            {/* Viewport */}
            <h2 style={{ fontSize: '13px', letterSpacing: '0.1em', color: '#888', marginTop: '28px' }}>
              VIEWPORT
            </h2>
            <p style={{ color: '#aaa', fontSize: '13px', fontFamily: 'monospace' }}>
              x: [{workspace.viewport.xMin}, {workspace.viewport.xMax}] &nbsp;
              y: [{workspace.viewport.yMin}, {workspace.viewport.yMax}]
            </p>

            <p style={{ marginTop: '40px', color: '#666', fontSize: '13px' }}>
              Want to build your own?{' '}
              <a href="/" style={{ color: '#4a9ee0' }}>
                Open QuickPlot
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
