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
const RANKS_DESC = RANKS.slice(0).reverse()
const FILES_DESC = FILES.slice(0).reverse()

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

function normalized_to_square(x: number, y: number, orientation?: Color) {
  if (orientation === 'white') {
    y = 1 - y
  } else {
    x = 1 - x
  }
  return `${FILES[Math.floor(x * 8)]}${RANKS[Math.floor(y * 8)]}`
}

function position_to_percent(pos: Position, orientation?: Color) {
  let { file, rank } = pos

  let x = FILES.indexOf(file)
  let y = 7 - RANKS.indexOf(rank)

  if (orientation === 'black') {
    y = 7 - y
    x = 7 - x
  }

  return [x * 100, y * 100]
}

type FEN = string

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

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


type DragAction = { action: 'start' | 'move' | 'drop' | 'cancel', x: number, y: number }
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

type CGXYAction = LerpAction | AnimTranslateAction

type CGPiece = {
  piece: Piece,
  position: Position,
  xy: Signal<CGXYAction>
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
    cg_piece.xy.set({ action: 'anim_translate', x, y })
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

  cg_piece.xy.subscribe(action => {
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

type CGOrientation = {
  orientation: Signal<Color>
}

type CGBoard = CGOrientation & {
  pieces: Signal<Pieces>
}

function cg_board(cg_board: CGBoard) {

  let el = h('div')
  set_klass(el, { 'cg-board': true, 'is2d': true })

  let bounds: DOMRect
  const set_bounds = () => bounds = el.getBoundingClientRect()

  let drag = createSignal<DragAction>()

  const on_mouse_down = (e: MouseEvent) => {
    DragEngine.begin_drag(drag, e)
  }

  // TODO remove on unmount
  el.addEventListener('mousedown', on_mouse_down)

  drag.subscribe(set_drag)

  cg_board.pieces.subscribe(set_pieces)
  cg_board.orientation.subscribe(set_orientation)

  let cg_pieces: CGPiece[] = []

  function set_drag(action: DragAction) {
    switch (action.action) {
      case 'start': {
        let n = event_position_normalized(bounds, action.x, action.y)
        let sq = normalized_to_square(n[0], n[1], cg_board.orientation.get())

        console.log(sq)
      } break
    }
  }

  function set_orientation(orientation: Color) {
    cg_pieces.forEach(_ => {
      let [x, y] = position_to_percent(_.position, orientation)
      _.xy.set({ action: 'anim_translate', x, y })
    })
  }

  function set_pieces(pieces: Pieces) {
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
        old_one.xy.set({ action: 'anim_translate', x: lerp_x, y: lerp_y })
      } else {
        new_cg_pieces.push({
          position,
          piece,
          xy: createSignal<CGXYAction>()
        })
      }
    }
    reconcile(el, cg_pieces, new_cg_pieces, cg_piece)
    cg_pieces = new_cg_pieces
  }


  return  {
    on_mount: () => {
      set_bounds()
    },
    el
  }
}

type CGCoords = CGOrientation

function cg_coords(cg_coords: CGCoords) {

  let el_files = h('div')
  set_klass(el_files, { 'cg-files': true })

  FILES.forEach(file => {
    let el_file = h('div')
    set_klass(el_file, { 'cg-file': true })
    set_content(el_file, file)

    el_files.appendChild(el_file)
  })

  let el_ranks = h('div')
  set_klass(el_ranks, { 'cg-ranks': true })

  RANKS_DESC.forEach(rank => {
    let el_rank = h('div')
    set_klass(el_rank, { 'cg-rank': true })
    set_content(el_rank, rank)

    el_ranks.appendChild(el_rank)
  })

  cg_coords.orientation.subscribe(set_orientation)

  function set_orientation(orientation: Color) {

    let [old_ranks, new_ranks] = [RANKS, RANKS_DESC]

    if (orientation === 'black') {
      [old_ranks, new_ranks] = [new_ranks, old_ranks]
    }

    reconcile(el_ranks, old_ranks, new_ranks, (_: Rank) => h('div'))


    let [old_files, new_files] = [FILES, FILES_DESC]

    if (orientation === 'black') {
      [old_files, new_files] = [new_files, old_files]
    }

    reconcile(el_files, old_files, new_files, (_: Rank) => h('div'))


  }

  return {
    els: [el_files, el_ranks]
  }
}

type CGContainer = CGBoard & CGOrientation

function cg_container(cg_container: CGContainer) {

  let el = h('div')
  set_klass(el, { 'cg-container': true })

  let { els: [cg_files, cg_ranks] } = cg_coords(cg_container)

  let { on_mount, el: cg_board_el } = cg_board(cg_container)

  el.appendChild(cg_board_el)
  el.appendChild(cg_files)
  el.appendChild(cg_ranks)

  return {
    on_mount() {
      on_mount()
    },
    el
  }
}

function app(el: HTMLElement) {

  let el_wrap = h('div')
  set_klass(el_wrap, { 'board-wrap': true })

  let pieces = createSignal<Pieces>({})
  let orientation = createSignal<Color>('white')

  let { on_mount, el: cg_container_el } = cg_container({
    pieces,
    orientation
  })

  el_wrap.appendChild(cg_container_el)
  el.appendChild(el_wrap)

  on_mount()


  pieces.set(fen_to_pieces(INITIAL_FEN))


  document.addEventListener('keypress', e => {
    if (e.key === 'f') {
      orientation.set_f(color => color === 'white' ? 'black' : 'white')
    }
  })
}

app(document.getElementById('app')!)