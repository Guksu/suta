import { placeMenu } from '@skills/dropdown-menu/assets/placeMenu'

/** 1000×800 화면 한가운데의 32px 버튼, 메뉴는 200×160 */
const base = {
  anchor: { top: 300, left: 400, width: 32, height: 32 },
  menu: { width: 200, height: 160 },
  viewport: { width: 1000, height: 800 },
}

describe('placeMenu — 화면 안에 들어오도록 뒤집고 밀어 넣기', () => {
  it('아래에 자리가 있으면 트리거 아래에 붙는다', () => {
    const place = placeMenu({ ...base })

    expect(place.side).toBe('bottom')
    expect(place.top).toBe(338) // 300 + 32 + 6(gap)
    expect(place.left).toBe(400) // start 정렬
  })

  it('아래가 좁으면 위로 뒤집는다', () => {
    const place = placeMenu({ ...base, anchor: { ...base.anchor, top: 700 } })

    expect(place.side).toBe('top')
    expect(place.top).toBe(534) // 700 - 6 - 160
  })

  it('위아래 모두 좁으면 아래로 둔다 — 어느 쪽이든 트리거를 덮으니 읽는 방향을 따른다', () => {
    const place = placeMenu({ ...base, menu: { width: 200, height: 700 }, anchor: { ...base.anchor, top: 100 } })

    expect(place.side).toBe('bottom')
  })

  it('end 정렬은 트리거의 오른쪽 끝에 맞춘다', () => {
    const place = placeMenu({ ...base, align: 'end' })

    expect(place.left).toBe(232) // 400 + 32 - 200
  })

  it('오른쪽으로 넘치면 화면 안으로 밀어 넣는다', () => {
    const place = placeMenu({ ...base, anchor: { ...base.anchor, left: 950 } })

    expect(place.left).toBe(792) // 1000 - 8(padding) - 200
  })

  it('왼쪽으로 넘쳐도 화면 안으로 밀어 넣는다', () => {
    const place = placeMenu({ ...base, anchor: { ...base.anchor, left: 4 }, align: 'end' })

    expect(place.left).toBe(8) // padding
  })

  it('메뉴가 화면보다 크면 가장자리 여백에 붙인다 (음수 좌표를 만들지 않는다)', () => {
    const place = placeMenu({ ...base, menu: { width: 1200, height: 900 } })

    expect(place.left).toBe(8)
    expect(place.top).toBe(8)
  })

  it('간격과 여백을 조절할 수 있다', () => {
    const place = placeMenu({ ...base, gap: 20, padding: 40 })

    expect(place.top).toBe(352) // 300 + 32 + 20
  })
})
