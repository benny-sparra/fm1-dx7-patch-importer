import { type PatchLibrarySnapshot } from '@/lib/patch-library'
import {
  PatchLibraryStorageError,
  type PatchLibraryStorageErrorCode,
} from '@/lib/patch-library-storage'

type WorkspacePersistenceStatus =
  'loading' | 'ready' | 'saving' | 'load-error' | 'save-error' | 'session-only'

type WorkspacePersistenceError = {
  code: PatchLibraryStorageErrorCode
  detail: string
}

export type WorkspacePersistenceState = {
  error: WorkspacePersistenceError | null
  hasSaveFailure: boolean
  hasUnsavedChanges: boolean
  status: WorkspacePersistenceStatus
  workspace: PatchLibrarySnapshot | null
}

type WorkspacePersistenceDependencies = {
  createFactory: () => PatchLibrarySnapshot
  debounceMs?: number
  load: () => Promise<PatchLibrarySnapshot | null>
  onWorkspaceLoaded?: (workspace: PatchLibrarySnapshot) => void
  save: (workspace: PatchLibrarySnapshot) => Promise<unknown>
}

type BeforeUnloadState = Pick<WorkspacePersistenceState, 'hasSaveFailure' | 'hasUnsavedChanges'>

export function shouldWarnBeforeUnload(state: BeforeUnloadState) {
  return state.hasSaveFailure && state.hasUnsavedChanges
}

function persistenceError(
  error: unknown,
  fallbackCode: PatchLibraryStorageErrorCode,
): WorkspacePersistenceError {
  if (error instanceof PatchLibraryStorageError) {
    return { code: error.code, detail: error.technicalMessage }
  }
  return {
    code: fallbackCode,
    detail: error instanceof Error ? error.message : String(error),
  }
}

export class WorkspacePersistenceController {
  private readonly createFactory: () => PatchLibrarySnapshot
  private readonly debounceMs: number
  private readonly listeners = new Set<(state: WorkspacePersistenceState) => void>()
  private readonly load: () => Promise<PatchLibrarySnapshot | null>
  private readonly onWorkspaceLoaded?: (workspace: PatchLibrarySnapshot) => void
  private readonly save: (workspace: PatchLibrarySnapshot) => Promise<unknown>
  private currentRevision = 0
  private disposed = false
  private loadAttempt = 0
  private mode: 'loading' | 'persistent' | 'session-only' = 'loading'
  private saveInFlight = false
  private savedRevision = 0
  private started = false
  private timer: ReturnType<typeof globalThis.setTimeout> | null = null
  private state: WorkspacePersistenceState = {
    error: null,
    hasSaveFailure: false,
    hasUnsavedChanges: false,
    status: 'loading',
    workspace: null,
  }

  constructor({
    createFactory,
    debounceMs = 350,
    load,
    onWorkspaceLoaded,
    save,
  }: WorkspacePersistenceDependencies) {
    this.createFactory = createFactory
    this.debounceMs = debounceMs
    this.load = load
    this.onWorkspaceLoaded = onWorkspaceLoaded
    this.save = save
  }

  getState() {
    return this.state
  }

  subscribe(listener: (state: WorkspacePersistenceState) => void) {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  start() {
    if (this.started || this.disposed) return
    this.started = true
    this.attemptLoad()
  }

  retryLoading() {
    if (this.disposed || this.state.status !== 'load-error') return
    this.attemptLoad()
  }

  continueWithoutSaving() {
    if (this.disposed || this.state.status !== 'load-error') return
    const workspace = this.createFactory()
    this.mode = 'session-only'
    this.currentRevision = 1
    this.savedRevision = 0
    this.setState({
      error: null,
      hasSaveFailure: false,
      hasUnsavedChanges: true,
      status: 'session-only',
      workspace,
    })
    this.onWorkspaceLoaded?.(workspace)
  }

  updateWorkspace(workspace: PatchLibrarySnapshot) {
    if (this.disposed || !this.state.workspace || workspace === this.state.workspace) return
    this.currentRevision += 1
    const status =
      this.mode === 'persistent' && this.state.status !== 'save-error'
        ? 'saving'
        : this.state.status
    this.setState({
      ...this.state,
      hasUnsavedChanges: true,
      status,
      workspace,
    })

    if (this.mode === 'persistent' && this.state.status !== 'save-error') {
      this.scheduleSave()
    }
  }

  retrySaving() {
    if (this.disposed || this.state.status !== 'save-error' || this.mode !== 'persistent') return
    this.flushSave()
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.loadAttempt += 1
    if (this.timer !== null) globalThis.clearTimeout(this.timer)
    this.timer = null
    this.listeners.clear()
  }

  private attemptLoad() {
    const attempt = ++this.loadAttempt
    this.mode = 'loading'
    this.setState({
      error: null,
      hasSaveFailure: false,
      hasUnsavedChanges: false,
      status: 'loading',
      workspace: null,
    })

    void this.load()
      .then((stored) => {
        if (this.disposed || attempt !== this.loadAttempt) return
        const workspace = stored ?? this.createFactory()
        this.mode = 'persistent'
        this.currentRevision = stored ? 0 : 1
        this.savedRevision = 0
        this.setState({
          error: null,
          hasSaveFailure: false,
          hasUnsavedChanges: !stored,
          status: stored ? 'ready' : 'saving',
          workspace,
        })
        this.onWorkspaceLoaded?.(workspace)
        if (!stored) this.scheduleSave()
      })
      .catch((error: unknown) => {
        if (this.disposed || attempt !== this.loadAttempt) return
        this.setState({
          error: persistenceError(error, 'read-failed'),
          hasSaveFailure: false,
          hasUnsavedChanges: false,
          status: 'load-error',
          workspace: null,
        })
      })
  }

  private scheduleSave() {
    if (this.timer !== null) globalThis.clearTimeout(this.timer)
    this.timer = globalThis.setTimeout(() => {
      this.timer = null
      this.flushSave()
    }, this.debounceMs)
  }

  private flushSave() {
    if (
      this.disposed ||
      this.mode !== 'persistent' ||
      this.saveInFlight ||
      !this.state.workspace ||
      this.currentRevision <= this.savedRevision
    )
      return

    if (this.timer !== null) globalThis.clearTimeout(this.timer)
    this.timer = null
    const revision = this.currentRevision
    const workspace = this.state.workspace
    this.saveInFlight = true
    this.setState({ ...this.state, error: null, status: 'saving' })

    void this.save(workspace)
      .then(() => {
        if (this.disposed) return
        this.saveInFlight = false
        this.savedRevision = Math.max(this.savedRevision, revision)
        if (this.currentRevision > this.savedRevision) {
          this.flushSave()
          return
        }
        this.setState({
          ...this.state,
          error: null,
          hasSaveFailure: false,
          hasUnsavedChanges: false,
          status: 'ready',
        })
      })
      .catch((error: unknown) => {
        if (this.disposed) return
        this.saveInFlight = false
        if (this.timer !== null) globalThis.clearTimeout(this.timer)
        this.timer = null
        this.setState({
          ...this.state,
          error: persistenceError(error, 'write-failed'),
          hasSaveFailure: true,
          hasUnsavedChanges: true,
          status: 'save-error',
        })
      })
  }

  private setState(state: WorkspacePersistenceState) {
    if (this.disposed) return
    this.state = state
    this.listeners.forEach((listener) => listener(state))
  }
}
