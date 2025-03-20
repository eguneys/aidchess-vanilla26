export type Listener<T> = (value: T, prev?: T | undefined) => void;

export type Signal<T> = { get: () => T | undefined, set_f: (_: (prev: T | undefined) => T) => void, set: (_: T) => void, subscribe: (listener: Listener<T>) => void, unsubscribe: (listener: Listener<T>) => void }

export function createSignal<T>(initialValue?: T): Signal<T> {
  let value = initialValue;
  const listeners = new Set<Listener<T>>();

  const get = (): T | undefined => value;

  const set_f = (f: (prev: T | undefined) => T) => {
    set(f(value))
  }

  const set = (newValue: T): void => {
    if (value !== newValue) {
      let prev = value;
      value = newValue;
      listeners.forEach((listener) => listener(value!, prev));
    }
  };

  const subscribe = (listener: Listener<T>): void => {
    listeners.add(listener);
  };

  const unsubscribe = (listener: Listener<T>): void => {
    listeners.delete(listener);
  };

  return { get, set, set_f, subscribe, unsubscribe };
}

export type EaseFunc = (t: number) => number

export const linear = (t: number) => t
export const ease_out_quad = (t: number) => t * (2 - t)

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}


export function anim_value(value: AnimValue, easing: EaseFunc = ease_out_quad) {
  let { t, start_value, end_value } = value

  let x = lerp(start_value[0], end_value[0], easing(t))
  let y = lerp(start_value[1], end_value[1], easing(t))
  return [x, y]
}

export function make_anim_value(start_value: [number, number], end_value: [number, number], duration: number, on_end?: () => void): AnimValue {
  let start_time = Date.now()
  let end_time = start_time + duration

  let t = 0

  return {
    start_value,
    end_value,
    start_time,
    end_time,
    t,
    on_end
  }
}


export type DragAction = { action: 'start' | 'move' | 'drop' | 'cancel', x: number, y: number }
export const DragEngine = MakeDragEngineSingleton()

function MakeDragEngineSingleton() {

  let ongoing_drag: Signal<DragAction> | undefined

  function on_move(e: MouseEvent) {
    ongoing_drag?.set({ action: 'move', x: e.clientX, y: e.clientY })
  }

  function on_drop(e: MouseEvent) {
    ongoing_drag?.set({ action: 'drop', x: e.clientX, y: e.clientY })
    remove_drag_listeners()
  }

  function on_keydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      ongoing_drag?.set({ action: 'cancel', x: 0, y: 0 })
      remove_drag_listeners()
    }
  }

  function begin_drag(drag: Signal<DragAction>, e: MouseEvent) {
    remove_drag_listeners()

    ongoing_drag = drag

    ongoing_drag.set({ action: 'start', x: e.clientX, y: e.clientY })

    document.addEventListener('mousemove', on_move, { passive: true })
    document.addEventListener('mouseup', on_drop)
    document.addEventListener('keydown', on_keydown)
  }

  function remove_drag_listeners() {
    document.removeEventListener('mousemove', on_move)
    document.removeEventListener('mouseup', on_drop)
    document.removeEventListener('keydown', on_keydown)
    ongoing_drag = undefined
  }

  return {
    begin_drag,
  }
}

export type AnimValue = {
  start_value: [number, number]
  end_value: [number, number]
  start_time: number
  end_time: number
  t: number,
  on_end?: () => void
}

export const AnimEngine = MakeAnimEngineSingleton()

function MakeAnimEngineSingleton() {

  let anim_xys: Set<Signal<AnimValue>> = new Set()

  function step() {

    let now = Date.now()

    for (const anim of anim_xys) {
      let value = anim.get()!

      let { start_time, end_time } = value

      let t = Math.min(1, (now - start_time) / (end_time - start_time))

      anim.set({...value, t})

      if (t === 1) {
        anim.get()!.on_end?.()
        remove_animation(anim)
      }
    }

    if (anim_xys.size > 0) {
      ongoing_id = requestAnimationFrame(step)
    } else {
      ongoing_id = undefined
    }
  }

  let ongoing_id: number | undefined = undefined

  function add_animation(anim: Signal<AnimValue>) {
    anim_xys.add(anim)
    if (ongoing_id === undefined) {
      ongoing_id = requestAnimationFrame(step)
    }
  }

  function remove_animation(anim: Signal<AnimValue>) {
    anim_xys.delete(anim)
    if (anim_xys.size === 0 && ongoing_id) {
      cancelAnimationFrame(ongoing_id)
      ongoing_id = undefined
    }
  }

  return {
    add_animation,
    remove_animation
  }
}