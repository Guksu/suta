import { badgeLabel, formatBadge, isCurrentTab, isEditable, shouldShowBottomNav, watchKeyboard } from '@skills/bottom-nav/assets/bottomNavCore'

describe('bottomNavCore — 현재 탭', () => {
  it('홈(/)은 정확히 같을 때만, 나머지는 하위 경로까지 현재 탭이다', () => {
    expect(isCurrentTab({ href: '/', path: '/' })).toBe(true)
    expect(isCurrentTab({ href: '/', path: '/category' })).toBe(false)
    expect(isCurrentTab({ href: '/category', path: '/category/noodles' })).toBe(true)
    expect(isCurrentTab({ href: '/category', path: '/categoryx' })).toBe(false)
    expect(isCurrentTab({ href: '/my', path: '/my/?tab=orders#top' })).toBe(true)
  })

  it('해시 라우터의 주소(#/category)도 #을 떼고 같은 규칙으로 본다 (떼지 않으면 모든 탭이 홈으로 읽힌다)', () => {
    expect(isCurrentTab({ href: '#/category', path: '#/category/noodles' })).toBe(true)
    expect(isCurrentTab({ href: '#/category', path: '#/' })).toBe(false)
    expect(isCurrentTab({ href: '#/', path: '#/category' })).toBe(false)
    expect(isCurrentTab({ href: '#/', path: '#/' })).toBe(true)
    expect(shouldShowBottomNav({ path: '#/my', tabs: ['#/', '#/my'] })).toBe(true)
    expect(shouldShowBottomNav({ path: '#/my/settings', tabs: ['#/', '#/my'] })).toBe(false)
  })
})

describe('bottomNavCore — 탭 바를 보일 화면', () => {
  const tabs = ['/', '/category', '/wish', '/my']

  it('탭의 첫 화면에서만 보이고, 상세·장바구니·주문 같은 하위 화면에서는 숨는다', () => {
    expect(shouldShowBottomNav({ path: '/', tabs })).toBe(true)
    expect(shouldShowBottomNav({ path: '/my/', tabs })).toBe(true)
    expect(shouldShowBottomNav({ path: '/products/janchi', tabs })).toBe(false)
    expect(shouldShowBottomNav({ path: '/cart', tabs })).toBe(false)
    expect(shouldShowBottomNav({ path: '/my/settings', tabs })).toBe(false)
  })

  it('alsoOn에 적은 경로 아래(카테고리의 상품 목록 등)에서는 계속 보인다', () => {
    expect(shouldShowBottomNav({ path: '/category/noodles', tabs, alsoOn: ['/category'] })).toBe(true)
    expect(shouldShowBottomNav({ path: '/category/noodles/janchi', tabs, alsoOn: ['/category'] })).toBe(true)
  })
})

describe('bottomNavCore — 배지', () => {
  it('0·음수·없음은 그리지 않고, 99를 넘으면 99+, 점은 빈 글자', () => {
    expect(formatBadge(undefined)).toBeNull()
    expect(formatBadge(0)).toBeNull()
    expect(formatBadge(-2)).toBeNull()
    expect(formatBadge(7)).toBe('7')
    expect(formatBadge(120)).toBe('99+')
    expect(formatBadge('dot')).toBe('')
  })

  it('숫자가 아닌 값(NaN·Infinity)은 그리지 않고, 소수는 내림한다 (서버 값이 비었을 때 "NaN" 배지가 뜨지 않게)', () => {
    expect(formatBadge(Number.NaN)).toBeNull()
    expect(formatBadge(Number('abc'))).toBeNull()
    expect(formatBadge(2.7)).toBe('2')
    expect(formatBadge(0.4)).toBeNull()
    expect(formatBadge(Number.POSITIVE_INFINITY)).toBe('99+')
    expect(badgeLabel({ badge: Number.NaN })).toBeNull()
    expect(badgeLabel({ badge: 2.7 })).toBe('새 항목 2개')
  })

  it('화면 낭독기용 문구는 개수와 새 소식을 말로 알린다', () => {
    expect(badgeLabel({ badge: 3 })).toBe('새 항목 3개')
    expect(badgeLabel({ badge: 150 })).toBe('새 항목 99개 이상')
    expect(badgeLabel({ badge: 'dot' })).toBe('새 소식 있음')
    expect(badgeLabel({ badge: 0 })).toBeNull()
  })
})

describe('bottomNavCore — 키보드가 올라온 동안', () => {
  it('글자 입력칸만 편집 요소로 본다(체크·라디오·버튼은 아니다)', () => {
    const make = (html: string) => {
      const box = document.createElement('div')
      box.innerHTML = html
      return box.firstElementChild
    }
    expect(isEditable(make('<input type="search" />'))).toBe(true)
    expect(isEditable(make('<input />'))).toBe(true)
    expect(isEditable(make('<textarea></textarea>'))).toBe(true)
    expect(isEditable(make('<div contenteditable="true"></div>'))).toBe(true)
    expect(isEditable(make('<input type="checkbox" />'))).toBe(false)
    expect(isEditable(make('<button>담기</button>'))).toBe(false)
    expect(isEditable(null)).toBe(false)
  })

  it('읽기 전용·비활성 입력칸과 inputmode="none"은 키보드를 올리지 않는다 (날짜를 고르는 읽기 전용 칸에서 탭 바가 숨지 않게)', () => {
    const make = (html: string) => {
      const box = document.createElement('div')
      box.innerHTML = html
      return box.firstElementChild
    }
    expect(isEditable(make('<input readonly value="11월 10일" />'))).toBe(false)
    expect(isEditable(make('<textarea readonly></textarea>'))).toBe(false)
    expect(isEditable(make('<input disabled />'))).toBe(false)
    expect(isEditable(make('<input inputmode="none" />'))).toBe(false)
    expect(isEditable(make('<input inputmode="numeric" />'))).toBe(true)
  })

  it('이미 입력칸에 초점이 있는 채로 감시를 시작하면 바로 true를 알린다 (autofocus 검색칸)', () => {
    document.body.innerHTML = '<input id="q" type="search" />'
    ;(document.getElementById('q') as HTMLInputElement).focus()
    const changes: boolean[] = []
    const stop = watchKeyboard({ onChange: (open) => changes.push(open) })
    expect(changes).toEqual([true])
    stop()
  })

  it('초점이 입력칸이 아닌 곳에 있으면 시작할 때 아무것도 알리지 않는다', () => {
    document.body.innerHTML = '<button id="b">검색</button>'
    ;(document.getElementById('b') as HTMLButtonElement).focus()
    const changes: boolean[] = []
    const stop = watchKeyboard({ onChange: (open) => changes.push(open) })
    expect(changes).toEqual([])
    stop()
  })

  it('입력칸에 초점이 들어오면 true, 빠지면 false를 알리고 정리 함수로 멈춘다', () => {
    document.body.innerHTML = '<input id="q" type="search" /><button id="b">검색</button>'
    const changes: boolean[] = []
    const stop = watchKeyboard({ onChange: (open) => changes.push(open) })
    const input = document.getElementById('q') as HTMLInputElement
    const button = document.getElementById('b') as HTMLButtonElement
    input.focus()
    button.focus()
    expect(changes).toEqual([true, false])
    stop()
    input.focus()
    expect(changes).toEqual([true, false])
  })
})
