import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { FileDropZone, type UploadFile } from '@skills/file-upload/assets/FileDropZone'

const makeFile = (name: string, type = 'image/png') => new File(['x'], name, { type })

const Harness = ({ initial, onRetry }: { initial: UploadFile[]; onRetry?: (id: string) => void }) => {
  const [files, setFiles] = useState(initial)
  return (
    <>
      <FileDropZone
        files={files}
        onAdd={() => {}}
        onRemove={(id) => setFiles((prev) => prev.filter((item) => item.id !== id))}
        onRetry={onRetry}
      />
      <button type="button" onClick={() => setFiles((prev) => prev.map((item) => ({ ...item, progress: (item.progress ?? 0) + 10 })))}>
        진행
      </button>
    </>
  )
}

describe('FileDropZone — 미리보기·진행·실패·지운 뒤 포커스', () => {
  let created: string[]
  let revoked: string[]

  beforeEach(() => {
    created = []
    revoked = []
    // jsdom에는 objectURL이 없다
    URL.createObjectURL = vi.fn(() => {
      const url = `blob:preview-${created.length + 1}`
      created.push(url)
      return url
    })
    URL.revokeObjectURL = vi.fn((url: string) => {
      revoked.push(url)
    })
  })

  const two = (): UploadFile[] => [
    { id: 'a', file: makeFile('잔치국수.png'), progress: 10 },
    { id: 'b', file: makeFile('비빔국수.png'), progress: 10 },
  ]

  it('진행률이 바뀌어도 미리보기 주소를 다시 만들지 않는다 — 다시 만들면 진행 이벤트마다 사진이 깜빡인다', () => {
    const { container } = render(<Harness initial={two()} />)
    const srcBefore = Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'))
    expect(created).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: '진행' }))
    fireEvent.click(screen.getByRole('button', { name: '진행' }))

    expect(created).toHaveLength(2)
    expect(revoked).toEqual([])
    expect(Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'))).toEqual(srcBefore)
  })

  it('목록에서 빠진 파일의 주소만 되돌려 주고, 언마운트하면 남은 것을 모두 되돌려 준다', () => {
    const { unmount } = render(<Harness initial={two()} />)

    fireEvent.click(screen.getByRole('button', { name: '잔치국수.png 지우기' }))
    expect(revoked).toEqual(['blob:preview-1'])

    unmount()
    expect(revoked).toEqual(['blob:preview-1', 'blob:preview-2'])
  })

  it('이미지가 아닌 파일은 미리보기 주소를 만들지 않는다', () => {
    render(<Harness initial={[{ id: 'p', file: makeFile('영수증.pdf', 'application/pdf') }]} />)
    expect(created).toEqual([])
  })

  it('지우면 포커스가 다음 파일의 지우기 버튼으로, 마지막이었으면 앞 파일로, 다 지웠으면 파일 고르기로 간다', () => {
    const { container } = render(<Harness initial={two()} />)

    const first = screen.getByRole('button', { name: '잔치국수.png 지우기' })
    first.focus()
    fireEvent.click(first)
    const remaining = screen.getByRole('button', { name: '비빔국수.png 지우기' })
    expect(document.activeElement).toBe(remaining)

    fireEvent.click(remaining)
    expect(document.activeElement).toBe(container.querySelector('.upload-input'))
  })

  it('실패한 파일에는 onRetry를 주었을 때만 다시 시도 버튼이 생기고, 진행 막대는 그리지 않는다', () => {
    const failed: UploadFile[] = [{ id: 'a', file: makeFile('잔치국수.png'), progress: 40, error: '연결이 끊겼어요' }]
    const onRetry = vi.fn()
    const { rerender } = render(<FileDropZone files={failed} onAdd={() => {}} onRemove={() => {}} />)
    expect(screen.queryByRole('button', { name: '잔치국수.png 다시 시도' })).toBeNull()

    rerender(<FileDropZone files={failed} onAdd={() => {}} onRemove={() => {}} onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: '잔치국수.png 다시 시도' }))
    expect(onRetry).toHaveBeenCalledWith('a')
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.getByText('연결이 끊겼어요')).toBeInTheDocument()
  })

  it('labels는 일부만 넘겨도 나머지가 기본 문구로 남는다', () => {
    const failed: UploadFile[] = [{ id: 'a', file: makeFile('a.png'), error: 'failed' }]
    render(
      <FileDropZone files={failed} onAdd={() => {}} onRemove={() => {}} onRetry={() => {}} labels={{ uploading: (n) => `Uploading ${n}`, remove: (n) => `Remove ${n}` }} />,
    )
    expect(screen.getByRole('button', { name: 'Remove a.png' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'a.png 다시 시도' })).toBeInTheDocument()
  })

  it('진행률이 0~100을 벗어나도 막대와 낭독 값은 그 안에 머문다', () => {
    const { container } = render(
      <FileDropZone files={[{ id: 'a', file: makeFile('a.png'), progress: -20 }]} onAdd={() => {}} onRemove={() => {}} />,
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    expect((container.querySelector('.upload-progress-bar') as HTMLElement).style.transform).toBe('scaleX(0)')
  })

  it('같은 파일을 다시 고르면 duplicate로 거절한다', () => {
    const file = makeFile('잔치국수.png')
    const onAdd = vi.fn()
    const onReject = vi.fn()
    const { container } = render(
      <FileDropZone files={[{ id: 'a', file }]} onAdd={onAdd} onRemove={() => {}} onReject={onReject} />,
    )
    const input = container.querySelector('.upload-input') as HTMLInputElement
    act(() => {
      fireEvent.change(input, { target: { files: [file] } })
    })
    expect(onAdd).not.toHaveBeenCalled()
    expect(onReject).toHaveBeenCalledWith([{ file, reason: 'duplicate' }])
  })
})
