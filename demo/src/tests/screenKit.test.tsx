import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { Field, FieldGroup, PageHead, PhotoFrame, ProductCell, SummaryPanel } from '@skills/screen-kit/assets/ScreenKit'

const assetsDir = resolve(process.cwd(), '../skills/suta/patterns/screen-kit/assets')

/** 가장 안쪽 규칙 블록(선택자 { 선언 })만 꺼낸다 — @media·@container 안의 규칙도 안쪽 블록이라 함께 나온다 */
const rulesOf = (css: string) =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selectors: selector.split(',').map((part) => part.trim()),
    properties: body
      .split(';')
      .map((decl) => decl.split(':')[0].trim())
      .filter(Boolean),
  }))

describe('사진 틀과 콘텐츠 그림(.art)을 같은 요소에 쓴다', () => {
  // .art(content-art.css)가 그리는 데 쓰는 속성 — 틀이 이 속성을 덮으면 접시·그림이 사라지거나 가운데에서 벗어난다
  const ART_OWNED = ['display', 'background', 'background-color', 'background-image', 'aspect-ratio', 'border-radius', 'overflow', 'position']

  it.each(['screen-kit.css', 'screen-kit-list.css', 'screen-kit-form.css'])('%s — .art에도 걸리는 틀 규칙은 .art가 그리는 속성을 건드리지 않는다', (file) => {
    const css = readFileSync(resolve(assetsDir, file), 'utf8')
    const offenders = rulesOf(css).flatMap(({ selectors, properties }) =>
      selectors
        // 선택자의 마지막 대상이 틀이고 .art를 빼지 않았으면 .art 요소에도 걸린다
        .filter((selector) => /\.kit-frame(?![\w-])[^\s>+~]*$/.test(selector) && !selector.includes(':not(.art)'))
        .flatMap((selector) => properties.filter((property) => ART_OWNED.includes(property)).map((property) => `${selector} → ${property}`)),
    )
    expect(offenders).toEqual([])
  })
})

describe('PhotoFrame — 사진이 있으면 사진, 없으면 콘텐츠 그림', () => {
  it('src가 있으면 비율 틀의 img다', () => {
    render(<PhotoFrame src="/janchi.webp" alt="잔치국수" ratio="4 / 3" />)
    const img = screen.getByRole('img', { name: '잔치국수' })
    expect(img.tagName).toBe('IMG')
    expect(img).toHaveClass('kit-frame')
    expect(img.style.getPropertyValue('--kit-frame-ratio')).toBe('4 / 3')
  })

  it('src가 없으면 .art 장면 + 색 한 벌이고, 뜻이 있으면 role="img" + 이름으로 읽힌다', () => {
    render(
      <PhotoFrame art={{ scene: 'dish', tone: 'sand' }} alt="소금빵">
        <svg data-testid="bread" />
      </PhotoFrame>,
    )
    const art = screen.getByRole('img', { name: '소금빵' })
    expect(art).toHaveClass('kit-frame', 'art', 'art--dish', 'art--sand')
    expect(screen.getByTestId('bread')).toBeInTheDocument()
  })

  it('alt가 빈 글자면 장식이라 낭독기에서 숨긴다(옆에 이름 글자가 있을 때)', () => {
    const { container } = render(<PhotoFrame art={{ scene: 'bowl', tone: 'clay' }} alt="" />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.querySelector('.art')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('ProductCell — 상자 없는 상품 칸', () => {
  const media = <PhotoFrame src="/bibim.webp" alt="" />

  it('이름·가격을 보이고 담기 버튼의 이름은 상품 이름을 담는다', () => {
    const onAdd = vi.fn()
    render(<ProductCell name="비빔국수" price="8,000원" media={media} onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: '비빔국수 담기' }))
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(screen.getByText('8,000원')).toBeInTheDocument()
  })

  it('할인율은 "할인", 취소선 정가는 "정가"를 붙여 읽힌다', () => {
    const { container } = render(<ProductCell name="잔치국수" price="6,300원" discount="10%" originalPrice="7,000원" media={media} />)
    expect(container.querySelector('.kit-cell-discount')).toHaveTextContent('10% 할인')
    expect(container.querySelector('del.kit-cell-original')).toHaveTextContent('정가 7,000원')
  })

  it('품절이면 담기 버튼이 없고 사진 위에 품절 표시가 있다', () => {
    const { container } = render(<ProductCell name="메밀국수" price="9,000원" media={media} onAdd={() => {}} soldOut />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(container.querySelector('.kit-cell')).toHaveClass('kit-cell-soldout')
    expect(container.querySelector('.kit-cell-flag')).toHaveTextContent('품절')
  })

  it('href가 있으면 이름이 칸 전체를 덮는 링크다', () => {
    render(<ProductCell name="손만두" price="7,500원" media={media} href="#/menu/mandu" />)
    expect(screen.getByRole('link', { name: '손만두' })).toHaveClass('kit-cell-link')
  })

  it('낭독 문구는 바꿀 수 있다(다른 언어)', () => {
    const { container } = render(
      <ProductCell
        name="Dumplings"
        price="₩7,500"
        discount="10%"
        originalPrice="₩8,300"
        media={media}
        soldOut
        labels={{ add: (name) => `Add ${name}`, soldOut: 'Sold out', discount: 'off', original: 'Was' }}
      />,
    )
    expect(container).not.toHaveTextContent(/[가-힣]/)
  })
})

describe('Field·FieldGroup — 한 면에 쌓은 입력칸', () => {
  it('보이는 라벨이 입력칸의 이름이다', () => {
    render(
      <FieldGroup label="예약자">
        <Field label="이름" placeholder="홍길동" />
      </FieldGroup>,
    )
    expect(screen.getByRole('group', { name: '예약자' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '이름' })).toHaveAttribute('placeholder', '홍길동')
  })

  it('오류면 칸에 data-invalid, 입력칸에 aria-invalid, 오류 문장이 설명으로 이어진다', () => {
    const { container } = render(<Field label="연락처" error="연락처를 010으로 시작하게 적어 주세요" inputMode="tel" />)
    const input = screen.getByRole('textbox', { name: '연락처' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('연락처를 010으로 시작하게 적어 주세요')
    expect(container.querySelector('.kit-field')).toHaveAttribute('data-invalid')
  })

  it('안내 한 줄도 설명으로 이어지고, 오류가 생기면 오류 문장이 그 자리를 대신한다', () => {
    const { rerender } = render(<Field label="요청 사항" hint="선택 — 빔 프로젝터처럼 필요한 것" />)
    expect(screen.getByRole('textbox', { name: '요청 사항' })).toHaveAccessibleDescription('선택 — 빔 프로젝터처럼 필요한 것')
    rerender(<Field label="요청 사항" hint="선택 — 빔 프로젝터처럼 필요한 것" error="100자 안으로 적어 주세요" />)
    expect(screen.getByRole('textbox', { name: '요청 사항' })).toHaveAccessibleDescription('100자 안으로 적어 주세요')
  })

  it('multiline이면 여러 줄 입력칸이다', () => {
    render(<Field label="요청 사항" multiline rows={3} />)
    expect(screen.getByRole('textbox', { name: '요청 사항' }).tagName).toBe('TEXTAREA')
  })
})

describe('PageHead·SummaryPanel', () => {
  it('쪽 머리는 제목 하나(기본 h1)와 보조 한 줄이다', () => {
    render(<PageHead title="오늘의 국수" sub="성수점 · 주문하면 15분 뒤 픽업" />)
    expect(screen.getByRole('heading', { level: 1, name: '오늘의 국수' })).toHaveClass('kit-head-title')
    expect(screen.getByText('성수점 · 주문하면 15분 뒤 픽업')).toHaveClass('kit-head-sub')
  })

  it('요약 패널은 이름 있는 구역이고, 답이 없으면 할 일을 같은 자리에 적는다', () => {
    render(<SummaryPanel title="예약 요약" answer={null} placeholder="시간을 골라 주세요" total="0원" totalLabel="합계" action={<button type="button">예약하기</button>} />)
    const panel = screen.getByRole('complementary', { name: '예약 요약' })
    expect(panel).toHaveClass('kit-summary')
    expect(panel.querySelector('.kit-summary-answer')).toHaveAttribute('data-empty')
    expect(panel).toHaveTextContent('시간을 골라 주세요')
  })
})
