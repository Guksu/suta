import { useId, useState, type ReactNode } from 'react'
import { toggleOpen } from './accordionCore'
import './accordion.css'

export type AccordionItemData = {
  /** 항목 식별자 — defaultOpenIds·openIds에서 이 값을 쓴다 */
  id: string
  title: ReactNode
  content: ReactNode
}

type AccordionProps = {
  items: AccordionItemData[]
  /** 'single'(기본): 한 번에 하나만 열림, 'multiple': 여러 개 */
  type?: 'single' | 'multiple'
  /** 처음부터 열려 있을 항목 id 목록 — single이면 첫 항목만 쓴다 */
  defaultOpenIds?: string[]
  /** 열림 상태를 밖에서 쥘 때(주소의 해시로 특정 항목 열기, 전부 펼치기) — 주면 이 값이 정본이고 onOpenChange에서 갱신한다 */
  openIds?: string[]
  /** 항목을 눌러 열림 목록이 바뀔 때 — 바뀐 목록을 받는다 */
  onOpenChange?: (openIds: string[]) => void
  /** 제목(트리거를 감싸는 헤딩)의 단계 — 문서 구조에 맞춘다. 기본 3(h3) */
  headingLevel?: 2 | 3 | 4 | 5 | 6
  className?: string
}

// 함께 열릴 수 있는 패널이 이보다 많으면 region 역할을 달지 않는다 — 랜드마크가 넘치면 화면 낭독기의 길 찾기가 오히려 어려워진다(WAI-ARIA 아코디언 패턴)
const MAX_REGIONS = 6

/**
 * toggleOpen 코어의 React 래퍼 — WAI-ARIA 아코디언 패턴.
 * 트리거는 헤딩 안의 버튼(aria-expanded/aria-controls), 패널은 role=region.
 * 패널은 언마운트하지 않고 data-open으로 여닫아 닫힘 애니메이션을 CSS에 맡긴다.
 */
export const Accordion = ({
  items,
  type = 'single',
  defaultOpenIds = [],
  openIds: controlledOpenIds,
  onOpenChange,
  headingLevel = 3,
  className,
}: AccordionProps) => {
  const [innerOpenIds, setInnerOpenIds] = useState(defaultOpenIds)
  const baseId = useId()
  const single = type === 'single'
  const current = controlledOpenIds ?? innerOpenIds
  // single은 하나만 열린다 — 목록에 여러 개가 들어와도 첫 항목만 연다
  const openIds = single ? current.slice(0, 1) : current
  const Heading = `h${headingLevel}` as 'h3'
  const asRegion = single || items.length <= MAX_REGIONS

  const toggle = (id: string) => {
    const next = toggleOpen({ openIds, id, single })
    if (controlledOpenIds === undefined) setInnerOpenIds(next)
    onOpenChange?.(next)
  }

  return (
    <div className={className ? `accordion ${className}` : 'accordion'}>
      {items.map((item, index) => {
        const open = openIds.includes(item.id)
        // 요소 id에는 항목 id가 아니라 순서를 쓴다 — aria-controls·aria-labelledby는 공백으로 나뉘는 목록이라 항목 id에 공백이 있으면 끊긴다
        const triggerId = `${baseId}-${index}-trigger`
        const panelId = `${baseId}-${index}-panel`
        return (
          <div className="accordion-item" key={item.id}>
            <Heading className="accordion-header">
              <button
                type="button"
                id={triggerId}
                className="accordion-trigger"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
              >
                {item.title}
                <svg className="accordion-chevron" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </Heading>
            <div
              id={panelId}
              className="accordion-panel"
              role={asRegion ? 'region' : undefined}
              // 역할이 없는 div에는 이름을 붙일 수 없다 — region일 때만 트리거와 잇는다
              aria-labelledby={asRegion ? triggerId : undefined}
              data-open={open ? 'true' : 'false'}
              aria-hidden={!open}
            >
              <div className="accordion-panel-inner">
                <div className="accordion-panel-content">{item.content}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
