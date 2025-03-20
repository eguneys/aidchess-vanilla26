import './index.scss'
import './board.scss'
import './assets/merida.css'
import './showcase.scss'

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
     el.insertBefore(el.children[1], el.children[_[0] + 1])
     el.insertBefore(el.children[0], el.children[_[1] + 1])
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

  if (deg === undefined) {
    el.style.removeProperty('--rotate-z')
  } else {
    el.style.setProperty('--rotate-z', `${deg}deg`)
  }
  if (scale === undefined) {
    el.style.removeProperty('--scale-z')
  } else {
    el.style.setProperty('--scale-z', `${scale}`)
  }
}

export function h(tag: HTMLTag) {
  let el = document.createElement(tag)



  return el
}

const FILES = 'abcdefgh'.split('')
const RANKS = '12345678'.split('')

type File = typeof FILES[number]
type Rank = typeof RANKS[number]

type PositionKey = `${File}${Rank}`

type Position = {
  file: File,
  rank: Rank
}

type Color = 'white' | 'black'
type Role = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king'

type RoleKey = 'p' | 'k' | 'n' | 'b' | 'r' | 'q'

const key2role: Record<RoleKey, Role> = { 'p': 'pawn', 'k': 'king', 'n': 'knight', 'r': 'rook', 'q': 'queen', 'b': 'bishop' }

type PieceKey = `${Color} ${Role}`

type Piece = {
  color: Color,
  role: Role
}

type Pieces = Record<PositionKey, PieceKey>

function key2pos(key: PositionKey): Position {
  let [file, rank] = key.split('')
  return { file, rank }
}

function key2piece(key: PieceKey): Piece {
  let [color, role] = key.split(' ') as [Color, Role]
  return { color, role }
}

function pos_distance(a: Position, b: Position) {
  let df = FILES.indexOf(a.file) - FILES.indexOf(b.file)
  let dr = RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank)
  return df * df + dr * dr
}

function normalized_to_square(x: number, y: number) {
  return `${FILES[Math.floor(x * 8)]}${RANKS[Math.floor(y * 8)]}`
}

function position_to_percent(pos: Position) {
  let { file, rank } = pos

  let x = FILES.indexOf(file)
  let y = RANKS.indexOf(rank)

  return [x * 100, y * 100]
}

type FEN = string

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function fen_to_pieces(fen: FEN): Pieces {
  let pieces: Pieces = {}

  let [s_board] = fen.split(' ')

  let file = 0
  let rank = 7
  for (let char of s_board.split('')) {
    if (char === '/') {
      rank = rank - 1
      file = 0
      continue
    }
    let sq: PositionKey = `${FILES[file]}${RANKS[rank]}`
    let role = key2role[char.toLowerCase() as RoleKey]
    if (role !== undefined) {
      let color: Color = char.toLowerCase() === char ? 'black' : 'white'
      pieces[sq] = `${color} ${role}`
      file += 1
    } else {
      let spaces = parseInt(char)
      if (typeof spaces === 'number') {
        file += spaces
      }
    }
  }

  return pieces
}


export type Listener<T> = (value: T) => void;

export type Signal<T> = { get: () => T | undefined, set: (_: T) => void, subscribe: (listener: Listener<T>) => void, unsubscribe: (listener: Listener<T>) => void }

export function createSignal<T>(initialValue?: T): Signal<T> {
  let value = initialValue;
  const listeners = new Set<Listener<T>>();

  const get = (): T | undefined => value;

  const set = (newValue: T): void => {
    if (value !== newValue) {
      value = newValue;
      listeners.forEach((listener) => listener(value!));
    }
  };

  const subscribe = (listener: Listener<T>): void => {
    listeners.add(listener);
  };

  const unsubscribe = (listener: Listener<T>): void => {
    listeners.delete(listener);
  };

  return { get, set, subscribe, unsubscribe };
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

export function make_anim_value(start_value: [number, number], end_value: [number, number], duration: number) {
  let start_time = Date.now()
  let end_time = start_time + duration

  let t = 0

  return {
    start_value,
    end_value,
    start_time,
    end_time,
    t
  }
}

type AnimValue = {
  start_value: [number, number]
  end_value: [number, number]
  start_time: number
  end_time: number
  t: number
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

type LerpAction = { action: 'lerp', x: number, y: number }
type AnimTranslateAction = { action: 'anim_translate', x: number, y: number }

type CGPieceAction = LerpAction | AnimTranslateAction

type CGPiece = {
  piece: Piece,
  position: Position,
  action: Signal<CGPieceAction>
}

// state 
// Pieces

function cg_piece(cg_piece: CGPiece): HTMLElement {
  let el = h('div')

  let {color, role} = cg_piece.piece

  set_klass(el, { 'cg-piece': true, [color]: true, [role]: true })

  let [x, y] = position_to_percent(key2pos('d4'))

  translate(x + 50, y + 50)
  function translate(new_x: number, new_y: number) {
    x = new_x
    y = new_y
    set_translate_percent(el, x, y)
  }

  function anim_translate_to_position(position: Position) {
    let [x, y] = position_to_percent(position)
    cg_piece.action.set({ action: 'anim_translate', x, y })
  }



  let anim_value_signal: Signal<AnimValue> | undefined

  function unsub_from_anim_engine() {
    if (anim_value_signal !== undefined) {
      AnimEngine.remove_animation(anim_value_signal)
    }
  }
  function sub_to_anim_engine(new_x: number, new_y: number) {
    unsub_from_anim_engine()
    let duration = 266
    let start_value: [number, number] = [x, y]
    let end_value: [number, number] = [new_x, new_y]
    anim_value_signal = createSignal(make_anim_value(start_value, end_value, duration))

    anim_value_signal.subscribe(value => {
      let res = anim_value(value)
      translate(res[0], res[1])
    })
    AnimEngine.add_animation(anim_value_signal)
  }

  cg_piece.action.subscribe(action => {
    switch (action.action) {
      case 'lerp': {
        unsub_from_anim_engine()
        translate(lerp(x, action.x, 0.5), lerp(y, action.y, 0.5))
      } break
      case 'anim_translate': {
        sub_to_anim_engine(action.x, action.y)
      } break
    }
  }) 


  anim_translate_to_position(cg_piece.position)

  return el
}

function cg_board() {

  let el = h('div')
  set_klass(el, { 'cg-board': true, 'is2d': true })

  let bounds: DOMRect
  const set_bounds = () => bounds = el.getBoundingClientRect()

  const on_mouse_down = (ev: MouseEvent) => {
    let [x, y] = event_position_normalized(bounds, ev.clientX, ev.clientY)

    let square = normalized_to_square(x, y)
    console.log(square)
  }

  el.addEventListener('mousedown', on_mouse_down)


  let cg_pieces: CGPiece[] = []

  return  {
    on_mount: () => {
      set_bounds()
    },
    set_parent: (parent: HTMLElement) => parent.appendChild(el),
    set_pieces(pieces: Pieces) {
      let old_cg_pieces = cg_pieces.slice(0)
      let new_cg_pieces: CGPiece[] = []

      for (let sq of Object.keys(pieces)) {
        let position = key2pos(sq)
        let piece = key2piece(pieces[sq])

        let old_one = old_cg_pieces
        .filter(_ => _.piece.color === piece.color && _.piece.role === piece.role)
        .sort((a, b) => pos_distance(b.position, position) - pos_distance(a.position, position))[0]

        if (old_one) {
          new_cg_pieces.push(old_one)
          old_cg_pieces.splice(old_cg_pieces.indexOf(old_one), 1)
          let [lerp_x, lerp_y] = position_to_percent(position)
          old_one.action.set({ action: 'anim_translate', x: lerp_x, y: lerp_y })
        } else {
          new_cg_pieces.push({
            position,
            piece,
            action: createSignal<CGPieceAction>(undefined)
          })
        }
      }
      reconcile(el, cg_pieces, new_cg_pieces, cg_piece)
      cg_pieces = new_cg_pieces
    }
  }
}

function app(parent: HTMLElement) {

  let el = h('div')
  set_klass(el, { 'board-wrap': true })

  let pieces: Pieces = fen_to_pieces(INITIAL_FEN)
  let { on_mount, set_pieces, set_parent } = cg_board()
  let pieces2: Pieces = { 'a8': 'white bishop', 'h8': 'black king'}
  //let pieces2: Pieces = {}

  set_pieces(pieces)
  set_parent(el)

  setTimeout(() => {
    //set_pieces(pieces2)
  }, 1000)

  parent.appendChild(el)

  on_mount()
}

app(document.getElementById('app')!)