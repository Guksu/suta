import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { FileDropZone, type UploadFile } from '@skills/file-upload/assets/FileDropZone'
import { formatBytes, type FileRejection } from '@skills/file-upload/assets/validateFiles'
import { defineCopy, useDemoLang } from '../../demoLang'
import './file-upload-demo.css'

const MAX_SIZE = 3 * 1024 * 1024
const ACCEPT = 'image/*'

const COPY = defineCopy({
  ko: {
    reject: {
      type: (name: string) => `${name} — 이미지만 올릴 수 있어요`,
      size: ({ name, size }: { name: string; size: number }) => `${name} — ${formatBytes(MAX_SIZE)}를 넘습니다 (${formatBytes(size)})`,
      count: (name: string) => `${name} — 최대 장수를 넘었어요`,
      empty: (name: string) => `${name} — 내용이 없는 파일이에요`,
      duplicate: (name: string) => `${name} — 이미 올린 사진이에요`,
    },
    uploadFailed: '올리지 못했어요',
    controlsLabel: '업로드 옵션',
    maxFiles: '최대 장수',
    photos: (n: number) => `${n}장`,
    failing: '서버가 실패로 응답',
    note: (maxSize: string) => (
      <>
        이미지 파일을 영역 안으로 <b>끌어다 놓아</b> 보세요 — 파일이 올라오면 테두리가 살아납니다. 영역을 <b>눌러서</b>{' '}
        고를 수도 있고, Tab으로 이동해 Enter로도 열립니다. 이미지가 아닌 파일이나 {maxSize}를 넘는 파일을
        섞어 놓으면 <b>이유와 함께</b> 거절합니다. 영역 <b>바깥</b>에 놓아도 브라우저가 파일을 열지 않습니다.
      </>
    ),
    title: '리뷰 사진 첨부',
    // 패턴의 기본 안내와 같은 문구 — 영어판과 같은 구조로 그리려고 children으로 넘긴다
    dropTitle: '파일을 끌어다 놓거나 눌러서 고르세요',
    limits: ({ accept, maxSize, max }: { accept: string; maxSize: string; max: number }) => `${accept} · ${maxSize} 이하 · 최대 ${max}개`,
    labels: {
      uploading: (name: string) => `${name} 업로드`,
      remove: (name: string) => `${name} 지우기`,
      retry: (name: string) => `${name} 다시 시도`,
      retryText: '다시 시도',
    },
    count: ({ count, max }: { count: number; max: number }) => `${count} / ${max}장`,
    clearAll: '모두 지우기',
  },
  en: {
    reject: {
      type: (name: string) => `${name}: only images can be uploaded`,
      size: ({ name, size }: { name: string; size: number }) => `${name}: over ${formatBytes(MAX_SIZE)} (${formatBytes(size)})`,
      count: (name: string) => `${name}: over the photo limit`,
      empty: (name: string) => `${name}: the file is empty`,
      duplicate: (name: string) => `${name}: already added`,
    },
    uploadFailed: 'Upload failed',
    controlsLabel: 'Upload options',
    maxFiles: 'Max photos',
    photos: (n: number) => `${n}`,
    failing: 'Server responds with an error',
    note: (maxSize: string) => (
      <>
        Try <b>dragging</b> image files into the area. The border lights up when a file comes over it. You can also <b>click</b> the area
        to choose, or Tab to it and press Enter. Mix in a non-image or a file over {maxSize} and it is rejected <b>with a reason</b>. Drop a
        file <b>outside</b> the area and the browser still will not open it.
      </>
    ),
    title: 'Add review photos',
    dropTitle: 'Drop files here or click to choose',
    limits: ({ accept, maxSize, max }: { accept: string; maxSize: string; max: number }) =>
      `${accept} · ${maxSize} or less · up to ${max} ${max === 1 ? 'file' : 'files'}`,
    labels: {
      uploading: (name: string) => `Uploading ${name}`,
      remove: (name: string) => `Remove ${name}`,
      retry: (name: string) => `Retry ${name}`,
      retryText: 'Retry',
    },
    count: ({ count, max }: { count: number; max: number }) => `${count} / ${max} photos`,
    clearAll: 'Clear all',
  },
})

type Copy = (typeof COPY)['ko']

// 거절 사유는 상태에 원본(파일·이유)만 두고 문구는 그릴 때 만든다 — 언어를 바꾸면 안내도 함께 바뀐다
const describe = ({ rejections, t }: { rejections: FileRejection[]; t: Copy }) =>
  rejections
    .map(({ file, reason }) =>
      reason === 'size' ? t.reject.size({ name: file.name, size: file.size }) : t.reject[reason](file.name),
    )
    .join('\n')

export const FileUploadDemo = () => {
  const t = COPY[useDemoLang()]
  const [files, setFiles] = useState<UploadFile[]>([])
  const [maxFiles, setMaxFiles] = useState(4)
  const [failing, setFailing] = useState(false)
  const [rejections, setRejections] = useState<FileRejection[]>([])
  const timers = useRef<number[]>([])

  useEffect(function clearTimersOnUnmount() {
    const running = timers.current
    return () => running.forEach((id) => window.clearInterval(id))
  }, [])

  /** 실제 서비스라면 XMLHttpRequest의 upload.progress를 잇는다 — 데모라 시간으로 흉내 낸다 */
  const fakeUpload = (id: string) => {
    let progress = 0
    const interval = window.setInterval(() => {
      progress += 8 + Math.random() * 14
      if (progress >= 100) {
        window.clearInterval(interval)
        setFiles((prev) =>
          prev.map((item) => (item.id === id ? { ...item, progress: 100, error: failing ? t.uploadFailed : undefined } : item)),
        )
        return
      }
      setFiles((prev) => prev.map((item) => (item.id === id ? { ...item, progress } : item)))
    }, 180)
    timers.current.push(interval)
  }

  const add = (accepted: File[]) => {
    setRejections([])
    const added = accepted.map((file) => ({ id: `${file.name}-${Date.now()}-${Math.random()}`, file, progress: 0 }))
    setFiles((prev) => [...prev, ...added])
    added.forEach((item) => fakeUpload(item.id))
  }

  /** 실패한 파일을 처음부터 다시 올린다 — 실패 표시를 걷고 진행 막대를 0에서 다시 시작한다 */
  const retry = (id: string) => {
    setFiles((prev) => prev.map((item) => (item.id === id ? { ...item, progress: 0, error: undefined } : item)))
    fakeUpload(id)
  }

  const vars = {
    '--upload-accent': 'var(--accent)',
    '--upload-border': 'var(--border)',
    '--upload-dim': 'var(--text-dim)',
    '--upload-track': 'var(--border)',
    '--upload-thumb-bg': 'var(--bg)',
    '--upload-error': '#f87171',
  } as CSSProperties

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.maxFiles} <code>maxFiles</code>
          </span>
          <input type="range" min={1} max={8} step={1} value={maxFiles} onChange={(e) => setMaxFiles(Number(e.target.value))} />
          <output>{t.photos(maxFiles)}</output>
        </label>
        <label className="controls-inline">
          <input type="checkbox" checked={failing} onChange={(e) => setFailing(e.target.checked)} />
          <span>{t.failing}</span>
        </label>
        <p className="controls-note">{t.note(formatBytes(MAX_SIZE))}</p>
      </section>

      <div className="fu-stage" style={vars}>
        <h2 className="fu-title">{t.title}</h2>

        <FileDropZone
          files={files}
          onAdd={add}
          onRemove={(id) => setFiles((prev) => prev.filter((item) => item.id !== id))}
          onRetry={retry}
          onReject={setRejections}
          accept={ACCEPT}
          maxSizeBytes={MAX_SIZE}
          maxFiles={maxFiles}
          labels={t.labels}
        >
          <strong>{t.dropTitle}</strong>
          <span className="upload-limits">{t.limits({ accept: ACCEPT, maxSize: formatBytes(MAX_SIZE), max: maxFiles })}</span>
        </FileDropZone>

        {rejections.length > 0 && (
          <p className="fu-message" role="alert">
            {describe({ rejections, t })}
          </p>
        )}

        <div className="fu-footer">
          <span>
            {t.count({ count: files.length, max: maxFiles })}
          </span>
          <button type="button" onClick={() => setFiles([])} disabled={files.length === 0}>
            {t.clearAll}
          </button>
        </div>
      </div>
    </div>
  )
}
