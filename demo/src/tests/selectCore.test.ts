import { findTypeahead, initialHighlight, moveHighlight } from '@skills/select/assets/selectCore'

describe('moveHighlight — 리스트박스 키보드 내비게이션 판정 (순수 함수)', () => {
  it('ArrowDown은 다음 항목으로, 마지막에서는 멈춘다', () => {
    expect(moveHighlight({ index: 0, count: 3, key: 'ArrowDown' })).toBe(1)
    expect(moveHighlight({ index: 2, count: 3, key: 'ArrowDown' })).toBe(2)
  })

  it('ArrowUp은 이전 항목으로, 첫 항목에서는 멈춘다', () => {
    expect(moveHighlight({ index: 2, count: 3, key: 'ArrowUp' })).toBe(1)
    expect(moveHighlight({ index: 0, count: 3, key: 'ArrowUp' })).toBe(0)
  })

  it('하이라이트가 없을 때(-1) ArrowDown은 첫 항목, ArrowUp은 마지막 항목', () => {
    expect(moveHighlight({ index: -1, count: 3, key: 'ArrowDown' })).toBe(0)
    expect(moveHighlight({ index: -1, count: 3, key: 'ArrowUp' })).toBe(2)
  })

  it('Home·End는 양 끝으로 점프한다', () => {
    expect(moveHighlight({ index: 1, count: 5, key: 'Home' })).toBe(0)
    expect(moveHighlight({ index: 1, count: 5, key: 'End' })).toBe(4)
  })

  it('관련 없는 키는 하이라이트를 바꾸지 않는다', () => {
    expect(moveHighlight({ index: 1, count: 3, key: 'a' })).toBe(1)
    expect(moveHighlight({ index: 1, count: 3, key: 'Tab' })).toBe(1)
  })

  it('옵션이 없으면 항상 -1', () => {
    expect(moveHighlight({ index: 0, count: 0, key: 'ArrowDown' })).toBe(-1)
  })

  it('고를 수 없는(disabled) 옵션은 건너뛴다', () => {
    const isDisabled = (index: number) => index === 1 || index === 2
    expect(moveHighlight({ index: 0, count: 5, key: 'ArrowDown', isDisabled })).toBe(3)
    expect(moveHighlight({ index: 3, count: 5, key: 'ArrowUp', isDisabled })).toBe(0)
  })

  it('끝까지 고를 수 있는 옵션이 없으면 제자리에 머문다', () => {
    const isDisabled = (index: number) => index >= 2
    expect(moveHighlight({ index: 1, count: 4, key: 'ArrowDown', isDisabled })).toBe(1)
    expect(moveHighlight({ index: 1, count: 4, key: 'End', isDisabled })).toBe(1)
  })

  it('Home·End는 고를 수 있는 첫·마지막 옵션으로 간다', () => {
    const isDisabled = (index: number) => index === 0 || index === 4
    expect(moveHighlight({ index: 2, count: 5, key: 'Home', isDisabled })).toBe(1)
    expect(moveHighlight({ index: 2, count: 5, key: 'End', isDisabled })).toBe(3)
  })

  it('PageDown·PageUp은 10칸씩 건너뛰고 양 끝에서 멈춘다 (옵션이 수백 개일 때)', () => {
    expect(moveHighlight({ index: 3, count: 300, key: 'PageDown' })).toBe(13)
    expect(moveHighlight({ index: 295, count: 300, key: 'PageDown' })).toBe(299)
    expect(moveHighlight({ index: 13, count: 300, key: 'PageUp' })).toBe(3)
    expect(moveHighlight({ index: 4, count: 300, key: 'PageUp' })).toBe(0)
  })
})

describe('initialHighlight — 패널을 열 때 처음 가리킬 옵션', () => {
  it('선택된 옵션이 있으면 그것, 없으면 고를 수 있는 첫 옵션', () => {
    expect(initialHighlight({ selectedIndex: 2, count: 4 })).toBe(2)
    expect(initialHighlight({ selectedIndex: -1, count: 4 })).toBe(0)
    expect(initialHighlight({ selectedIndex: -1, count: 4, isDisabled: (index) => index === 0 })).toBe(1)
  })

  it('옵션이 없거나 전부 고를 수 없으면 -1 — 없는 옵션을 가리키지 않는다', () => {
    expect(initialHighlight({ selectedIndex: -1, count: 0 })).toBe(-1)
    expect(initialHighlight({ selectedIndex: -1, count: 2, isDisabled: () => true })).toBe(-1)
  })
})

describe('findTypeahead — 타이핑으로 옵션 찾기', () => {
  const labels = ['Buckwheat noodles', 'Knife-cut noodles', 'Medium wheat noodles', 'Rice noodles', 'Ramyeon']

  it('친 글자로 시작하는 옵션을 찾는다 — 대소문자를 가리지 않는다', () => {
    expect(findTypeahead({ labels, query: 'k', from: -1 })).toBe(1)
    expect(findTypeahead({ labels, query: 'ME', from: -1 })).toBe(2)
  })

  it('같은 글자를 거듭 치면 그 글자로 시작하는 옵션을 차례로 돌고, 끝에서 처음으로 돌아온다', () => {
    expect(findTypeahead({ labels, query: 'r', from: -1 })).toBe(3)
    expect(findTypeahead({ labels, query: 'rr', from: 3 })).toBe(4)
    expect(findTypeahead({ labels, query: 'rrr', from: 4 })).toBe(3)
  })

  it('여러 글자를 이어 치면 지금 가리키는 옵션부터 다시 맞춘다', () => {
    expect(findTypeahead({ labels, query: 'ra', from: 3 })).toBe(4)
    expect(findTypeahead({ labels, query: 'ri', from: 3 })).toBe(3)
  })

  it('한글 옵션도 완성된 글자로 찾는다', () => {
    expect(findTypeahead({ labels: ['소면', '중면', '칼국수면'], query: '칼', from: 0 })).toBe(2)
  })

  it('맞는 옵션이 없거나 고를 수 없는 옵션뿐이면 -1', () => {
    expect(findTypeahead({ labels, query: 'z', from: 0 })).toBe(-1)
    expect(findTypeahead({ labels, query: 'k', from: -1, isDisabled: (index) => index === 1 })).toBe(-1)
    expect(findTypeahead({ labels, query: '', from: 0 })).toBe(-1)
  })
})
