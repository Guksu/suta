import { act, fireEvent, render, screen } from '@testing-library/react'
import { useSearchSuggest } from '@skills/search-suggest/assets/useSearchSuggest'

type Menu = { id: string; name: string }

const MENUS: Menu[] = [
  { id: 'myeolchi', name: '멸치국수' },
  { id: 'bibim', name: '비빔국수' },
  { id: 'kong', name: '콩국수' },
]

const Harness = ({
  onSelect = () => {},
  latencyMs = 0,
  loadingDelayMs,
}: {
  onSelect?: (menu: Menu) => void
  latencyMs?: number
  loadingDelayMs?: number
}) => {
  const search = useSearchSuggest<Menu>({
    debounceMs: 0,
    loadingDelayMs,
    toText: (menu) => menu.name,
    onSelect,
    fetchSuggestions: async ({ query }) => {
      if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs))
      return MENUS.filter((menu) => menu.name.includes(query))
    },
  })

  return (
    <div className="suggest-root">
      <input {...search.inputProps} aria-label="메뉴 검색" />
      {search.isOpen && (
        <ul {...search.listProps}>
          {search.showLoading && <li>찾는 중…</li>}
          {search.items.map((menu, index) => (
            <li key={menu.id} {...search.getOptionProps(index)}>
              {menu.name}
            </li>
          ))}
        </ul>
      )}
      {search.isEmpty && <p role="status">결과 없음</p>}
    </div>
  )
}

describe('useSearchSuggest — 콤보박스 조작과 ARIA', () => {
  const input = () => screen.getByRole('combobox', { name: '메뉴 검색' })

  /** 실제 시간을 흘린다. act 안에서 쌓인 갱신은 act가 끝날 때 그려지므로, 타이머가 이어지는 구간은 나눠서 부른다 */
  const wait = async (ms: number) => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, ms))
    })
  }

  /** 글자를 치고 디바운스 타이머와 응답이 모두 흘러가게 둔다 */
  const type = async (value: string) => {
    fireEvent.change(input(), { target: { value } })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
  }

  it('입력하면 제안 목록이 열리고 콤보박스로 연결된다', async () => {
    render(<Harness />)
    await type('국수')

    const list = screen.getByRole('listbox')
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    expect(input()).toHaveAttribute('aria-controls', list.id)
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('방향키로 고르면 포커스는 입력창에 남고 활성 항목만 가리킨다', async () => {
    render(<Harness />)
    await type('국수')

    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    expect(input()).toHaveAttribute('aria-activedescendant', options[0].id)
    expect(document.activeElement).not.toBe(options[0])
  })

  it('목록 끝에서 다시 내리면 처음으로 감긴다', async () => {
    render(<Harness />)
    await type('국수')

    fireEvent.keyDown(input(), { key: 'ArrowUp' }) // 위로 먼저 = 마지막 항목
    expect(screen.getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('Enter로 고르면 입력창이 그 값으로 채워지고 목록이 닫힌다', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    await type('국수')

    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    fireEvent.keyDown(input(), { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledWith(MENUS[0])
    expect(input()).toHaveValue('멸치국수')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('고르지 않은 채 Enter를 누르면 아무 일도 하지 않는다 (폼 제출은 그대로)', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    await type('국수')

    const event = fireEvent.keyDown(input(), { key: 'Enter' })
    expect(onSelect).not.toHaveBeenCalled()
    expect(event).toBe(true) // preventDefault가 걸리지 않았다
  })

  it('Escape로 목록을 닫는다 — 입력한 글자는 남는다', async () => {
    render(<Harness />)
    await type('국수')

    fireEvent.keyDown(input(), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input()).toHaveValue('국수')
  })

  it('항목을 누르면 선택된다 — click이 아니라 mousedown에서 (blur가 먼저 와도 놓치지 않게)', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    await type('국수')

    fireEvent.mouseDown(screen.getAllByRole('option')[1])
    expect(onSelect).toHaveBeenCalledWith(MENUS[1])
  })

  it('입력을 지우면 목록이 닫힌다', async () => {
    render(<Harness />)
    await type('국수')
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await type('')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('한글 조합 중의 방향키·Enter는 무시한다 — 조합이 끝나며 같은 키가 한 번 더 온다', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    await type('국수')

    fireEvent.keyDown(input(), { key: 'ArrowDown', isComposing: true })
    expect(input()).not.toHaveAttribute('aria-activedescendant')

    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    fireEvent.keyDown(input(), { key: 'Enter', isComposing: true })
    expect(onSelect).not.toHaveBeenCalled()
    // 사파리는 isComposing 없이 keyCode 229로 알린다
    fireEvent.keyDown(input(), { key: 'Enter', keyCode: 229 })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('열린 목록에서 Escape는 기본 동작을 막는다 — 바깥 모달·시트까지 함께 닫히지 않게. 닫힌 뒤의 Escape는 그대로 둔다', async () => {
    render(<Harness />)
    await type('국수')

    expect(fireEvent.keyDown(input(), { key: 'Escape' })).toBe(false) // preventDefault가 걸렸다
    expect(fireEvent.keyDown(input(), { key: 'Escape' })).toBe(true)
  })

  it('목록의 빈 곳·스크롤바를 눌러도 입력창이 포커스를 잃지 않는다 (mousedown 기본 동작을 막는다)', async () => {
    render(<Harness />)
    await type('국수')

    expect(fireEvent.mouseDown(screen.getByRole('listbox'))).toBe(false)
  })

  it('방향키로 옮긴 활성 항목은 보이는 곳으로 스크롤되고, 마우스로 가리킨 항목은 스크롤하지 않는다', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    try {
      render(<Harness />)
      await type('국수')

      fireEvent.mouseEnter(screen.getAllByRole('option')[1])
      expect(scrollIntoView).not.toHaveBeenCalled()

      fireEvent.keyDown(input(), { key: 'ArrowDown' })
      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrollIntoView.mock.contexts[0]).toBe(screen.getAllByRole('option')[2])
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
    } finally {
      // @ts-expect-error jsdom에는 원래 없다 — 다른 테스트에 남기지 않는다
      delete Element.prototype.scrollIntoView
    }
  })

  it('응답이 loadingDelayMs 안에 오면 "찾는 중"을 띄우지 않는다 — 패널이 깜빡이지 않는다', async () => {
    render(<Harness latencyMs={10} loadingDelayMs={80} />)
    fireEvent.change(input(), { target: { value: '국수' } })
    await wait(5)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.queryByText('찾는 중…')).not.toBeInTheDocument()

    await wait(40)
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('응답이 loadingDelayMs보다 늦으면 "찾는 중"을 띄우고 목록에 aria-busy를 건다', async () => {
    render(<Harness latencyMs={150} loadingDelayMs={30} />)
    fireEvent.change(input(), { target: { value: '국수' } })
    await wait(5) // 요청이 나간다
    expect(screen.queryByText('찾는 중…')).not.toBeInTheDocument()
    await wait(60) // 지연을 넘긴다
    expect(screen.getByText('찾는 중…')).toBeInTheDocument()
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-busy', 'true')

    await wait(150)
    expect(screen.queryByText('찾는 중…')).not.toBeInTheDocument()
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-busy', 'false')
  })

  it('목록이 있는 채로 다음 응답을 기다릴 때는 "찾는 중"을 끼워 넣지 않는다 — 줄이 밀리지 않는다', async () => {
    render(<Harness latencyMs={100} loadingDelayMs={10} />)
    fireEvent.change(input(), { target: { value: '국수' } })
    await wait(150)
    expect(screen.getAllByRole('option')).toHaveLength(3)

    fireEvent.change(input(), { target: { value: '비빔' } })
    await wait(5) // 요청이 나간다
    await wait(40) // 지연을 넘긴다 — 그래도 앞선 목록이 남아 있으므로 문구는 없다
    expect(screen.queryByText('찾는 중…')).not.toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-busy', 'true')
  })

  it('결과가 0개면 목록은 닫고 isEmpty로 알린다 — 닫으면(Escape) 함께 사라진다', async () => {
    render(<Harness />)
    await type('짜장')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('status')).toHaveTextContent('결과 없음')

    fireEvent.keyDown(input(), { key: 'Escape' })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
