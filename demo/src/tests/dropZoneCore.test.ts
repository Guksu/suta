import { createDropZone } from '@skills/file-upload/assets/createDropZone'

/** jsdom에는 DataTransfer가 없다 — 필요한 부분만 흉내 낸다 */
const dragEvent = ({ type, files = [], hasFiles = true }: { type: string; files?: File[]; hasFiles?: boolean }) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', {
    value: { types: hasFiles ? ['Files'] : ['text/plain'], files, dropEffect: 'none' },
  })
  return event
}

const makeFile = (name: string) => new File(['x'], name, { type: 'image/png' })

describe('createDropZone — 끌어다 놓기 판정', () => {
  let zone: HTMLElement
  let child: HTMLElement
  let dropped: File[][]
  let dragStates: boolean[]
  const cleanups: Array<() => void> = []

  beforeEach(() => {
    zone = document.createElement('div')
    child = document.createElement('span')
    zone.appendChild(child)
    document.body.appendChild(zone)
    dropped = []
    dragStates = []
  })
  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
    zone.remove()
  })

  const register = (options: { blockWindowDrop?: boolean; isDisabled?: () => boolean } = {}) => {
    const controller = createDropZone({
      zone,
      ...options,
      onDrop: (files) => dropped.push(files),
      onDragStateChange: (dragging) => dragStates.push(dragging),
    })
    cleanups.push(controller.destroy)
    return controller
  }

  it('파일이 영역에 들어오면 끌기 상태가 된다', () => {
    register()
    zone.dispatchEvent(dragEvent({ type: 'dragenter' }))

    expect(zone.dataset.dragging).toBe('true')
    expect(dragStates).toEqual([false, true]) // 등록 시 false, 진입 시 true
  })

  it('자식 위를 지나도 깜빡이지 않는다 — 들어온 횟수를 센다', () => {
    register()
    zone.dispatchEvent(dragEvent({ type: 'dragenter' }))
    child.dispatchEvent(dragEvent({ type: 'dragenter' })) // 자식으로 들어감
    zone.dispatchEvent(dragEvent({ type: 'dragleave' })) // 부모에서 나감(자식으로 들어갔으므로)

    expect(zone.dataset.dragging).toBe('true')
  })

  it('영역을 완전히 벗어나야 끌기 상태가 풀린다', () => {
    register()
    zone.dispatchEvent(dragEvent({ type: 'dragenter' }))
    child.dispatchEvent(dragEvent({ type: 'dragenter' }))
    zone.dispatchEvent(dragEvent({ type: 'dragleave' }))
    zone.dispatchEvent(dragEvent({ type: 'dragleave' }))

    expect(zone.dataset.dragging).toBe('false')
  })

  it('dragover의 기본 동작을 막는다 — 막지 않으면 drop이 오지 않는다', () => {
    register()
    const event = dragEvent({ type: 'dragover' })
    zone.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('놓으면 파일을 넘기고 끌기 상태를 푼다', () => {
    register()
    const files = [makeFile('국수.png')]
    zone.dispatchEvent(dragEvent({ type: 'dragenter' }))
    zone.dispatchEvent(dragEvent({ type: 'drop', files }))

    expect(dropped).toEqual([files])
    expect(zone.dataset.dragging).toBe('false')
  })

  it('파일이 아닌 것(글자 끌기)에는 반응하지 않는다', () => {
    register()
    zone.dispatchEvent(dragEvent({ type: 'dragenter', hasFiles: false }))

    expect(zone.dataset.dragging).toBe('false')
    expect(dragStates).toEqual([false])
  })

  it('영역 밖에 놓은 파일은 브라우저가 열지 못하게 막는다', () => {
    register()
    const outside = document.createElement('div')
    document.body.appendChild(outside)

    const event = dragEvent({ type: 'drop' })
    outside.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(dropped).toEqual([]) // 우리 영역이 아니므로 받지도 않는다
    outside.remove()
  })

  it('destroy 뒤에는 반응하지 않는다', () => {
    const controller = register()
    controller.destroy()
    zone.dispatchEvent(dragEvent({ type: 'drop', files: [makeFile('a.png')] }))

    expect(dropped).toEqual([])
  })

  it('잠긴 영역은 파일이 올라와도 살아나지 않고, 놓아도 받지 않는다 — 브라우저가 파일을 열지도 않는다', () => {
    let locked = true
    register({ isDisabled: () => locked })

    zone.dispatchEvent(dragEvent({ type: 'dragenter' }))
    expect(zone.dataset.dragging).toBe('false')

    const over = dragEvent({ type: 'dragover' })
    zone.dispatchEvent(over)
    expect(over.defaultPrevented).toBe(true)
    expect((over as unknown as { dataTransfer: { dropEffect: string } }).dataTransfer.dropEffect).toBe('none')

    const drop = dragEvent({ type: 'drop', files: [makeFile('국수.png')] })
    zone.dispatchEvent(drop)
    expect(drop.defaultPrevented).toBe(true)
    expect(dropped).toEqual([])

    // 잠금이 풀리면 다시 받는다
    locked = false
    zone.dispatchEvent(dragEvent({ type: 'dragenter' }))
    expect(zone.dataset.dragging).toBe('true')
  })
})
