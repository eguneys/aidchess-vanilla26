export function debounce(callback: () => void, delay: number) {
  let timeout: number;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(callback, delay);
  };
}


export function addElementResizeListener(element: HTMLElement, callback: (entry: ResizeObserverEntry) => void) {
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      callback(entry);
    }
  });
  observer.observe(element);
  return observer; // Return the observer for cleanup
}

export function removeElementResizeListener(observer: ResizeObserver) {
  observer.disconnect();
}


type DiffOrders = [number, number][]
type DiffInserts<T> = [number, T][]
type DiffRemoves = number[]
type Diff<T> = [DiffRemoves, DiffInserts<T>, DiffOrders, T[], T[]]

function diff_arrays<T>(old_array: T[], new_array: T[]): Diff<T> {

  old_array = old_array.slice(0)

  const find_index = (array: T[], item: T) => array.findIndex(_ => _ === item)

  let removes: DiffRemoves = []

  for (let i = old_array.length - 1; i >= 0; i--) {
    let new_i = find_index(new_array, old_array[i])
    if (new_i === -1) {
      removes.push(i)
      old_array.splice(i, 1)
    }
  }

  let inserts: DiffInserts<T> = []
  for (let i = 0; i < new_array.length; i++) {
    let res: [number, T] = [i, new_array[i]]
    let old_i = find_index(old_array, new_array[i])
    if (old_i === -1) {
      inserts.push(res)
      old_array[i] = new_array[i]
    }
  }

  let orders: DiffOrders = []

  for (let i = 0; i < old_array.length; i++) {
    let new_i = find_index(new_array, old_array[i])

    if (new_i !== i && new_i !== -1) {
      orders.push([i, new_i])
      ;[old_array[i], old_array[new_i]] = [old_array[new_i], old_array[i]]
    }
  }

  return [removes, inserts, orders, old_array, new_array]
}


function diff_to_dom<T>(el: HTMLElement, diff: Diff<T>, make_t: (_: T) => HTMLElement) {
  let [removes, inserts, orders] = diff

  removes.map(_ => [_, el.removeChild(el.children[_])] as [number, HTMLElement])

  inserts.map(_ => [make_t(_[1]), el.children[_[0] + 1] ?? null])
    .forEach(a => el.insertBefore(a[0], a[1]))

  orders.map(_ => {
     el.insertBefore(el.children[_[0]], el.children[_[1] + 1])
     el.insertBefore(el.children[_[1] - 1], el.children[_[0]])
  })

}

export function reconcile<T>(el: HTMLElement, old_array: T[], new_array: T[], make_t: (_: T) => HTMLElement) {
  diff_to_dom(el, diff_arrays(old_array, new_array), make_t)
}


export const event_position_normalized = (bounds: DOMRect, x: number, y: number) =>
  [(x - bounds.left) / bounds.width, (y - bounds.top) / bounds.height]


export type HTMLTag = 'h2' | 'h3' | 'h4' | 'div'
export type KlassList = Record<string, boolean>

export const set_klass = (el: HTMLElement, klassList: KlassList) => {
  for (let klass of Object.keys(klassList)) {
    if (klassList[klass]) {
      el.classList.add(klass);
    } else {
      el.classList.remove(klass);
    }
  }
}

export const set_attribute = (el: HTMLElement, name: string, value?: string) => {
  if (value === undefined) {
    el.removeAttribute(name)
  } else {
    el.setAttribute(name, value)
  }
}

export const set_content = (el: HTMLElement, content: string) => {
  el.textContent = content
}

export const set_translate_percent = (el: HTMLElement, x?: number, y?: number, deg?: number, scale?: number) => {
  if (x !== undefined) {
    el.style.setProperty('--translate-x', `${x}%`)
  }
  if (y !== undefined) {
    el.style.setProperty('--translate-y', `${y}%`)
  }

  if (deg !== undefined) {
    el.style.setProperty('--rotate-z', `${deg}deg`)
  }
  if (scale !== undefined) {
    el.style.setProperty('--scale-z', `${scale}`)
  }
}

export function h(tag: HTMLTag) {
  let el = document.createElement(tag)



  return el
}

