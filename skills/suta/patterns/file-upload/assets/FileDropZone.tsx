import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createDropZone } from './createDropZone'
import { formatBytes, validateFiles, type FileRejection } from './validateFiles'
import './file-upload.css'

export type UploadFile = {
  id: string
  file: File
  /** 0~100. 없으면 진행 막대를 그리지 않는다 */
  progress?: number
  /** 업로드 실패 사유 */
  error?: string
}

type FileDropZoneProps = {
  files: UploadFile[]
  /** 검증을 통과한 파일들 — 여기서 업로드를 시작한다 */
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  /** 실패한 파일(error가 있는 항목)을 다시 올린다 — 주면 그 행에 "다시 시도" 버튼이 생긴다 */
  onRetry?: (id: string) => void
  /** 거절된 파일들 — 이유와 함께 온다 */
  onReject?: (rejections: FileRejection[]) => void
  /** input의 accept와 같은 형식 */
  accept?: string
  maxSizeBytes?: number
  maxFiles?: number
  /** 영역 안에 그릴 안내 문구 — 기본 안내(한국어)를 바꿀 때도 여기에 넘긴다 */
  children?: ReactNode
  disabled?: boolean
  /** 화면 낭독 문구 — 진행 막대·지우기·다시 시도 버튼의 이름. 일부만 넘기면 나머지는 기본(한국어) */
  labels?: Partial<UploadLabels>
}

type UploadLabels = {
  uploading: (name: string) => string
  remove: (name: string) => string
  /** 다시 시도 버튼의 낭독 이름 */
  retry: (name: string) => string
  /** 다시 시도 버튼에 보이는 글자 */
  retryText: string
}

const DEFAULT_LABELS: UploadLabels = {
  uploading: (name) => `${name} 업로드`,
  remove: (name) => `${name} 지우기`,
  retry: (name) => `${name} 다시 시도`,
  retryText: '다시 시도',
}

const clampPercent = (progress: number) => Math.min(Math.max(Number.isFinite(progress) ? progress : 0, 0), 100)

const isImage = (file: File) => file.type.startsWith('image/')

/**
 * 파일 끌어다 놓기 영역 — 제스처는 createDropZone이, 검증은 validateFiles가 담당한다.
 *
 * **끌어다 놓기만으로는 부족하다.** 키보드만 쓰는 사람에게 드래그는 존재하지 않는 기능이라
 * 영역 전체가 파일 선택 버튼을 겸한다(라벨로 감싼 숨은 input). 그래서 Tab → Enter로도 열린다.
 *
 * 미리보기는 objectURL로 만든다 — 다 쓰면 반드시 되돌려 줘야 메모리에 남지 않는다.
 */
export const FileDropZone = ({
  files,
  onAdd,
  onRemove,
  onRetry,
  onReject,
  accept,
  maxSizeBytes,
  maxFiles,
  children,
  disabled = false,
  labels,
}: FileDropZoneProps) => {
  const text = { ...DEFAULT_LABELS, ...labels }
  const rootRef = useRef<HTMLDivElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const full = maxFiles !== undefined && files.length >= maxFiles

  const handlersRef = useRef({ onAdd, onReject, accept, maxSizeBytes, maxFiles, files, disabled, full })
  handlersRef.current = { onAdd, onReject, accept, maxSizeBytes, maxFiles, files, disabled, full }

  useEffect(function bindDropZone() {
    const zone = zoneRef.current
    if (!zone) return
    const controller = createDropZone({
      zone,
      onDragStateChange: setDragging,
      // 잠겼거나 다 찼으면 테두리가 살아나지 않고 커서가 "금지"가 된다
      isDisabled: () => handlersRef.current.disabled || handlersRef.current.full,
      onDrop: (dropped) => {
        const current = handlersRef.current
        const { accepted, rejected } = validateFiles({
          files: dropped,
          accept: current.accept,
          maxSizeBytes: current.maxSizeBytes,
          maxFiles: current.maxFiles,
          currentCount: current.files.length,
          existing: current.files.map((item) => item.file),
        })
        if (accepted.length > 0) current.onAdd(accepted)
        if (rejected.length > 0) current.onReject?.(rejected)
      },
    })
    return controller.destroy
  }, [])

  // 미리보기 주소는 File마다 하나씩 만들어 두고, 목록에서 빠질 때만 되돌려 준다(안 그러면 메모리에 남는다).
  // 목록 배열이 바뀔 때마다 새로 만들면 안 된다 — 진행률이 오를 때마다 배열이 새로 생겨 사진이 초당 수십 번 다시 그려진다
  const urlsRef = useRef(new Map<File, string>())
  const [previews, setPreviews] = useState<ReadonlyMap<File, string>>(urlsRef.current)

  useEffect(
    function syncPreviews() {
      const urls = urlsRef.current
      const live = new Set(files.map((item) => item.file))
      let changed = false
      for (const [file, url] of urls) {
        if (live.has(file)) continue
        URL.revokeObjectURL(url)
        urls.delete(file)
        changed = true
      }
      for (const file of live) {
        if (!isImage(file) || urls.has(file)) continue
        urls.set(file, URL.createObjectURL(file))
        changed = true
      }
      if (changed) setPreviews(new Map(urls))
    },
    [files],
  )

  useEffect(function revokePreviewsOnUnmount() {
    const urls = urlsRef.current
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  // 지운 행의 버튼은 사라진다 — 포커스가 문서 맨 위로 떨어지지 않게 이웃 행(없으면 파일 고르기)으로 옮긴다
  const removedIndexRef = useRef<number | null>(null)
  const countRef = useRef(files.length)
  useEffect(
    function moveFocusAfterRemove() {
      const index = removedIndexRef.current
      const shrank = files.length < countRef.current
      countRef.current = files.length
      removedIndexRef.current = null
      // 지우기를 눌렀지만 부모가 지우지 않았거나(확인창) 그사이 파일이 늘었으면 포커스를 건드리지 않는다
      if (index === null || !shrank) return
      const buttons = rootRef.current?.querySelectorAll<HTMLElement>('.upload-remove') ?? []
      const target = buttons[Math.min(index, buttons.length - 1)] ?? inputRef.current
      target?.focus()
    },
    [files.length],
  )

  return (
    <div ref={rootRef} className="upload-root">
      <div
        ref={zoneRef}
        className="upload-zone"
        data-dragging={dragging ? 'true' : 'false'}
        data-disabled={disabled || full ? 'true' : undefined}
      >
        {/* 라벨이 영역 전체를 덮어 클릭·키보드 모두 파일 선택으로 이어진다 */}
        <label className="upload-label">
          <input
            ref={inputRef}
            className="upload-input"
            type="file"
            multiple={maxFiles !== 1}
            accept={accept}
            disabled={disabled || full}
            onChange={(event) => {
              const picked = Array.from(event.target.files ?? [])
              const { accepted, rejected } = validateFiles({
                files: picked,
                accept,
                maxSizeBytes,
                maxFiles,
                currentCount: files.length,
                existing: files.map((item) => item.file),
              })
              if (accepted.length > 0) onAdd(accepted)
              if (rejected.length > 0) onReject?.(rejected)
              // 같은 파일을 다시 고를 수 있게 비운다 — 안 그러면 두 번째 선택에서 change가 오지 않는다
              event.target.value = ''
            }}
          />
          <span className="upload-guide">
            {children ?? (
              <>
                <strong>파일을 끌어다 놓거나 눌러서 고르세요</strong>
                <span className="upload-limits">
                  {accept ? `${accept} · ` : ''}
                  {maxSizeBytes ? `${formatBytes(maxSizeBytes)} 이하 · ` : ''}
                  {maxFiles ? `최대 ${maxFiles}개` : ''}
                </span>
              </>
            )}
          </span>
        </label>
      </div>

      {files.length > 0 && (
        <ul className="upload-list">
          {files.map((item, index) => (
            <li key={item.id} className="upload-item" data-error={item.error ? 'true' : undefined}>
              {previews.has(item.file) ? (
                <img className="upload-thumb" src={previews.get(item.file)} alt="" />
              ) : (
                <span className="upload-thumb upload-thumb-icon" aria-hidden="true">
                  {/* 미리보기가 없는 파일 — 이모지는 기기마다 모양이 달라 선 아이콘을 쓴다 */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                    <path d="M14 3v5h5" />
                  </svg>
                </span>
              )}

              <span className="upload-meta">
                <span className="upload-name">{item.file.name}</span>
                <span className="upload-size">{item.error ?? formatBytes(item.file.size)}</span>
                {item.progress !== undefined && item.progress < 100 && !item.error && (
                  <span
                    className="upload-progress"
                    role="progressbar"
                    aria-label={text.uploading(item.file.name)}
                    aria-valuenow={Math.round(clampPercent(item.progress))}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span className="upload-progress-bar" style={{ transform: `scaleX(${clampPercent(item.progress) / 100})` }} />
                  </span>
                )}
              </span>

              {item.error && onRetry && (
                <button type="button" className="upload-retry" aria-label={text.retry(item.file.name)} onClick={() => onRetry(item.id)}>
                  {text.retryText}
                </button>
              )}

              <button
                type="button"
                className="upload-remove"
                aria-label={text.remove(item.file.name)}
                onClick={() => {
                  removedIndexRef.current = index
                  onRemove(item.id)
                }}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
