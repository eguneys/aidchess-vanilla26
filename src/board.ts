import './board.scss'
import './assets/merida.css'
import { addElementResizeListener, debounce, event_position_normalized, h, reconcile, set_content, set_klass, set_translate_percent } from './dom'
import { anim_value, AnimEngine, AnimValue, createSignal, DragAction, DragEngine, lerp, make_anim_value, Signal } from './reactive'
import { Dests } from './chess'


const FILES = ['a','b','c','d','e','f','g','h'] as const
const RANKS = ['1','2','3','4','5','6','7','8'] as const
const FILES_DESC = ['h','g','f','e','d','c','b','a'] as const
const RANKS_DESC = ['8','7','6','5','4','3','2','1'] as const

export type File = typeof FILES[number]
export type Rank = typeof RANKS[number]

export type PositionKey = `${File}${Rank}`

export type Position = {
  file: File,
  rank: Rank
}

export type Color = 'white' | 'black'
export type Role = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king'

export type RoleKey = 'p' | 'k' | 'n' | 'b' | 'r' | 'q'

const key2role: Record<RoleKey, Role> = { 'p': 'pawn', 'k': 'king', 'n': 'knight', 'r': 'rook', 'q': 'queen', 'b': 'bishop' }

export type PieceKey = `${Color} ${Role}`

export type Piece = {
  color: Color,
  role: Role
}

export type Pieces = Record<PositionKey, PieceKey>

function pos_equal(a: Position, b: Position) {
  return a.file === b.file && a.rank === b.rank
}

function key2pos(key: PositionKey): Position {
  let [file, rank] = key.split('') as [File, Rank]
  return { file, rank }
}
function pos2key(pos: Position): PositionKey {
  return `${pos.file}${pos.rank}`
}

function key2piece(key: PieceKey): Piece {
  let [color, role] = key.split(' ') as [Color, Role]
  return { color, role }
}
function piece2key(piece: Piece): PieceKey {
  return `${piece.color} ${piece.role}`
}

function pos_distance(a: Position, b: Position) {
  let df = FILES.indexOf(a.file) - FILES.indexOf(b.file)
  let dr = RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank)
  return df * df + dr * dr
}

function normalized_to_position(x: number, y: number, orientation: Color) {
  if (orientation === 'white') {
    y = 1 - y
  } else {
    x = 1 - x
  }
  return {
    file: FILES[Math.floor(x * 8)],
    rank: RANKS[Math.floor(y * 8)]
  }
}

function position_to_percent(pos: Position, orientation: Color) {
  let { file, rank } = pos

  let x = FILES.indexOf(file)
  let y = 7 - RANKS.indexOf(rank)

  if (orientation === 'black') {
    y = 7 - y
    x = 7 - x
  }

  return [x * 100, y * 100]
}

export type FEN = string

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export function fen2pieces(fen: FEN): Pieces {
  let pieces: Pieces = {} as Pieces

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



const is_cg_piece = (_: CGPiece | CGSquare): _ is CGPiece => {
  return (_ as CGPiece).piece !== undefined
}

function cg_piece_or_square(cg_: CGPiece | CGSquare, cg_orientation: CGOrientation) {
  if (is_cg_piece(cg_)) {
    return cg_piece(cg_, cg_orientation)
  } else {
    return cg_square(cg_, cg_orientation)
  }
}

type CancelAction = { action: 'cancel' }
type LerpAction = { action: 'lerp', x: number, y: number }
type AnimTranslateAction = { action: 'anim_translate', x: number, y: number, on_end?: () => void }

type CGXYAction = LerpAction | AnimTranslateAction | CancelAction

function new_cg_piece(piece: Piece, position: Position, put_immediate = false): CGPiece {
  return {
    piece,
    position,
    xy: createSignal(),
    deg: createSignal(),
    scale: createSignal(),
    ghost: createSignal(),
    dragging: createSignal(),
    put_immediate
  }
}

export type CGPiece = {
  piece: Piece,
  position: Position,
  xy: Signal<CGXYAction>
  deg: Signal<number>
  scale: Signal<number>
  ghost: Signal<boolean>
  dragging: Signal<boolean>
  put_immediate?: boolean
}
// state 
// Pieces

function cg_piece(cg_piece: CGPiece, cg_orientation: CGOrientation): HTMLElement {
  let el = h('div')

  let {color, role} = cg_piece.piece

  set_klass(el, { 'cg-piece': true, [color]: true, [role]: true })


  let { orientation } = cg_orientation

  let [x, y] = position_to_percent(cg_piece.position, orientation.get()!)

  let deg = 0
  let scale = 1

  if (cg_piece.put_immediate) {

  } else {
    scale_x(1 + 0.4 - Math.random() * 0.2)
  }
  function scale_x(new_scale: number) {
    scale = new_scale
    set_translate_percent(el, undefined, undefined, undefined, scale)
  }

  if (cg_piece.put_immediate) {

  } else {
    rotate_deg(Math.random() * 16)
  }
  function rotate_deg(new_deg: number) {
    deg = new_deg
    set_translate_percent(el, undefined, undefined, deg)
  }

  translate_percent(x, y)
  function translate_percent(new_x: number, new_y: number) {
    x = new_x
    y = new_y
    set_translate_percent(el, x, y)
  }

  function anim_translate_to_position(position: Position) {
    let [x, y] = position_to_percent(position, orientation.get()!)
    cg_piece.xy.set({ action: 'anim_translate', x, y })
  }

  function anim_rotate_to_deg(deg: number) {
    cg_piece.deg.set(deg)
  }

  function anim_scale_to_x(x: number) {
    cg_piece.scale.set(x)
  }



  let anim_value_signal: Signal<AnimValue> | undefined

  function unsub_from_anim_engine() {
    if (anim_value_signal !== undefined) {
      AnimEngine.remove_animation(anim_value_signal)
    }
  }
  function sub_to_anim_engine(new_x: number, new_y: number, on_end?: () => void) {
    unsub_from_anim_engine()
    let duration = 266
    let start_value: [number, number] = [x, y]
    let end_value: [number, number] = [new_x, new_y]
    anim_value_signal = createSignal(make_anim_value(start_value, end_value, duration, on_end))

    anim_value_signal.subscribe(value => {
      let res = anim_value(value)
      translate_percent(res[0], res[1])
    })
    AnimEngine.add_animation(anim_value_signal)
  }


  let anim_deg_signal: Signal<AnimValue> | undefined

  function unsub_deg_from_anim_engine() {
    if (anim_deg_signal !== undefined) {
      AnimEngine.remove_animation(anim_deg_signal)
    }
  }
  function sub_to_anim_engine_deg(new_deg: number) {
    unsub_deg_from_anim_engine()
    let duration = 333
    let start_value: [number, number] = [deg, 0]
    let end_value: [number, number] = [new_deg, 0]
    anim_deg_signal = createSignal(make_anim_value(start_value, end_value, duration))
    anim_deg_signal.subscribe(value => {
      let res = anim_value(value)
      rotate_deg(res[0])
    })
    AnimEngine.add_animation(anim_deg_signal)
  }


  let anim_scale_signal: Signal<AnimValue> | undefined

  function unsub_scale_from_anim_engine() {
    if (anim_scale_signal !== undefined) {
      AnimEngine.remove_animation(anim_scale_signal)
    }
  }
  function sub_to_anim_engine_scale(new_scale: number) {
    unsub_scale_from_anim_engine()
    let duration = 333
    let start_value: [number, number] = [scale, 0]
    let end_value: [number, number] = [new_scale, 0]
    anim_scale_signal = createSignal(make_anim_value(start_value, end_value, duration))
    anim_scale_signal.subscribe(value => {
      let res = anim_value(value)
      scale_x(res[0])
    })
    AnimEngine.add_animation(anim_scale_signal)
  }

  cg_piece.xy.subscribe(action => {
    switch (action.action) {
      case 'lerp': {
        unsub_from_anim_engine()
        translate_percent(lerp(x, action.x, 0.7), lerp(y, action.y, 0.55))
      } break
      case 'anim_translate': {
        sub_to_anim_engine(action.x, action.y, action.on_end)
      } break
      case 'cancel': {
        unsub_from_anim_engine()
      }
    }
  }) 

  cg_piece.deg.subscribe(deg => {
    sub_to_anim_engine_deg(deg)
  })

  cg_piece.scale.subscribe(scale => {
    sub_to_anim_engine_scale(scale)
  })

  anim_translate_to_position(cg_piece.position)
  anim_rotate_to_deg(0)
  anim_scale_to_x(1)

  cg_piece.ghost.subscribe(ghost => {
    set_klass(el, { 'ghost': ghost })
  })

  cg_piece.dragging.subscribe(dragging => {
    set_klass(el, { 'dragging': dragging })
  })



  return el
}

function new_cg_square(a_klass: string, position: Position) {
  return {
    a_klass,
    position
  }
}

type CGSquare = {
  a_klass: string
  position: Position
}

function cg_square(cg_square: CGSquare, cg_orientation: CGOrientation) {

  let el = h('div')

  set_klass(el, { 'cg-square': true, [cg_square.a_klass]: true })

  let { orientation } = cg_orientation
  let [x, y] = position_to_percent(cg_square.position, orientation.get()!)

  translate_percent(x, y)
  function translate_percent(new_x: number, new_y: number) {
    x = new_x
    y = new_y
    set_translate_percent(el, x, y)
  }

  return el
}

export type CGDrag = [CGPiece, CGPiece | undefined] | undefined | [CGPiece, 'busy']

type CGOrientation = {
  orientation: Signal<Color>
}

type CGBoard = CGOrientation & {
  check: Signal<boolean>
  turn: Signal<Color>
  pieces: Signal<Pieces>
  dests: Signal<Dests>
  drag: Signal<CGDrag>
  last_move: Signal<[PositionKey, PositionKey]>
  on_drag_play_orig_key: Signal<[PositionKey, PositionKey]>
}

function cg_board(cg_board: CGBoard) {

  let el = h('div')
  set_klass(el, { 'cg-board': true })

  let bounds: DOMRect
  const set_bounds = () => bounds = el.getBoundingClientRect()

  // TODO remove on unmount
  addElementResizeListener(el, debounce(set_bounds, 100))
  // TODO remove on unmount
  el.addEventListener('mousedown', on_mouse_down)

  let drag = createSignal<DragAction>()

  function on_mouse_down(e: MouseEvent) {
    DragEngine.begin_drag(drag, e)
  }

  function drag_play_orig_dest(orig: Position, dest: Position) {
    let dests = orig ? cg_board.dests.get()?.get(pos2key(orig)) : undefined

    if (dests?.includes(pos2key(dest)) === true) {
      let new_in_pieces =  {...in_pieces }

      delete new_in_pieces[pos2key(orig)]
      delete new_in_pieces[pos2key(dest)]

      set_pieces(new_in_pieces)
      set_last_move([pos2key(orig), pos2key(dest)])

      return dest
    }

    return orig
  }

  function drag_play_orig_dest_place(orig: CGPiece, dest: Position) {
    let new_in_pieces = { ...in_pieces }
    new_in_pieces[pos2key(dest)] = piece2key(orig.piece)
    cg_pieces.push(new_cg_piece(orig.piece, dest, true))
    set_pieces(new_in_pieces)

    cg_board.on_drag_play_orig_key.set([pos2key(orig.position), pos2key(dest)])
  }


  drag.subscribe(set_drag)

  cg_board.pieces.subscribe(set_pieces)
  cg_board.orientation.subscribe(set_orientation)
  cg_board.last_move.subscribe(set_last_move)

  function set_last_move([l1, l2]: [PositionKey, PositionKey]) {
    cg_last_moves = [l1, l2].map(_ => new_cg_square('last-move', key2pos(_)))
    reconcile_local()
  }

  function set_dests_for_key(key?: PositionKey) {
    let dests = key ? cg_board.dests.get()?.get(key) : undefined

    if (dests) {
      cg_dests = dests.map(dest => new_cg_square('dest', key2pos(dest)))
      reconcile_local()
    } else {
      cg_dests = []
      reconcile_local()
    }
  }

  function can_start_drag(color: Color) {
    return cg_board.turn.get() === color
  }

  let on_piece: CGPiece | undefined

  function set_drag(action: DragAction) {
    switch (action.action) {
      case 'start': {
        let cg_drag = cg_board.drag.get()

        if (cg_drag) {
          //cg_drag[0].xy.set({ action: 'cancel' })
          //cg_board.drag.set(undefined)
          return
        }
        
        let n = event_position_normalized(bounds, action.x, action.y)
        let position = normalized_to_position(n[0], n[1], cg_board.orientation.get()!)

        let [x, y] = [n[0] * 800 - 50, n[1] * 800 - 50]
        
        let cg_piece = cg_pieces.find(_ => pos_equal(_.position, position))
        if (cg_piece) {

          if (!can_start_drag(cg_piece.piece.color)) {
            return
          }

          let cg_piece_clone: CGPiece = new_cg_piece(cg_piece.piece, cg_piece.position)

          cg_board.drag.set([cg_piece_clone, cg_piece])
          cg_piece_clone.xy.set({ action: 'anim_translate', x, y })
          cg_piece_clone.dragging.set(true)

          cg_piece.ghost.set(true)
          cg_piece.scale.set(0.8)


          cg_orig = [new_cg_square('orig', cg_piece.position)]
          set_dests_for_key(pos2key(position))
        }


      } break
      case 'move': {
        let cg_drag = cg_board.drag.get()
        if (!cg_drag || cg_drag[1] === 'busy') {
          return
        }
        let n = event_position_normalized(bounds, action.x, action.y)
        let position = normalized_to_position(n[0], n[1], cg_board.orientation.get()!)

        let [x, y] = [n[0] * 800 - 50, n[1] * 800 - 50]
        let [cg_piece, cg_piece_orig] = cg_drag
        cg_piece.xy.set({ action: 'lerp', x, y })

        let new_on_piece = cg_pieces.find(_ => _ !== cg_piece_orig && pos_equal(_.position, position))
        if (on_piece) {
          if (new_on_piece !== on_piece) {
            on_piece.scale.set(1)
            on_piece.deg.set(0)
            new_on_piece?.deg.set(20)
          }
        } else {
          if (new_on_piece) {
            new_on_piece.deg.set(20)
          }
        }
        if (new_on_piece && new_on_piece !== on_piece) {
          if (new_on_piece.piece.color !== cg_piece.piece.color) {
            new_on_piece.scale.set(0.8)
          }
        }
        on_piece = new_on_piece

      } break
      case 'drop': {
        let cg_drag = cg_board.drag.get()
        if (!cg_drag || cg_drag[1] === 'busy') {
          return
        }

        let n = event_position_normalized(bounds, action.x, action.y)
        let dest = normalized_to_position(n[0], n[1], cg_board.orientation.get()!)

        let [cg_piece, cg_piece_orig] = cg_drag

        let orig = cg_piece.position

        let ret_position = drag_play_orig_dest(orig, dest)

        let [x, y] = position_to_percent(ret_position, cg_board.orientation.get()!)

        cg_board.drag.set([cg_piece, 'busy'])
        const on_end = () => {
          cg_board.drag.set(undefined)
          if (ret_position === dest) {

            drag_play_orig_dest_place(cg_piece, dest)
          }
        }
        cg_piece.xy.set({ action: 'anim_translate', x, y, on_end })

        if (on_piece) {
          on_piece.scale.set(1)
          on_piece.deg.set(0)
          on_piece = undefined
        }

        if (cg_piece_orig) {
          cg_piece_orig.ghost.set(false)
          cg_piece_orig.scale.set(1)

        }

        cg_orig = []
        set_dests_for_key(undefined)
      } break
    }
  }

  function set_orientation(orientation: Color) {
    cg_pieces.forEach(_ => {
      let [x, y] = position_to_percent(_.position, orientation)
      _.xy.set({ action: 'anim_translate', x, y })
    })
  }

  let in_pieces: Pieces = {} as Pieces
  function set_pieces(pieces: Pieces) {
    in_pieces = pieces
    let old_cg_pieces = cg_pieces.slice(0)
    let new_cg_pieces: CGPiece[] = []

    for (let sq in pieces) {
      let position = key2pos(sq as PositionKey)
      let piece = key2piece(pieces[sq as PositionKey])

      let old_one = old_cg_pieces
        .filter(_ => _.piece.color === piece.color && _.piece.role === piece.role)
        .sort((a, b) => pos_distance(a.position, position) - pos_distance(b.position, position))[0]

      if (old_one) {
        new_cg_pieces.push(old_one)
        old_cg_pieces.splice(old_cg_pieces.indexOf(old_one), 1)
        let [lerp_x, lerp_y] = position_to_percent(position, cg_board.orientation.get()!)
        old_one.xy.set({ action: 'anim_translate', x: lerp_x, y: lerp_y })
        old_one.position = position
      } else {
        new_cg_pieces.push(new_cg_piece(piece, position))
      }
    }

    cg_pieces = new_cg_pieces
    reconcile_local()
  }

  cg_board.drag.subscribe((dghost, prevdghost) => {
    if (Array.isArray(dghost)) {

      cg_ghost = [dghost[0]]
      reconcile_local()
    } else {
      if (prevdghost) {
        cg_ghost = []
        reconcile_local()
      }
    }

  })

  let cg_pieces: CGPiece[] = []
  let cg_ghost: CGPiece[] = []

  let cg_dests: CGSquare[] = []
  let cg_orig: CGSquare[] = []
  let cg_last_moves: CGSquare[] = []

  let prev_cg_all: (CGSquare | CGPiece)[] = []

  let next_all: (CGSquare | CGPiece)[]
  let has_reconcile = false
  function reconcile_local() {
    next_all = [...cg_last_moves, ...cg_pieces, ...cg_orig, ...cg_dests, ...cg_ghost]
    if (has_reconcile) {
      return
    }

    has_reconcile = true
    queueMicrotask(reconcile_now)
    function reconcile_now() {
      has_reconcile = false
      reconcile(el, prev_cg_all, next_all, _ => cg_piece_or_square(_, cg_board))
      prev_cg_all = next_all
    }
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

  let el_ranks = h('div')
  set_klass(el_ranks, { 'cg-ranks': true })

  cg_coords.orientation.subscribe(set_orientation)

  let ranks: Rank[] = []
  let files: File[] = []

  function set_orientation(orientation: Color) {

    let new_ranks = orientation === 'black' ? RANKS.slice(0) : RANKS_DESC.slice(0)
    reconcile(el_ranks, ranks, new_ranks, (rank: Rank) => {
      let el_rank = h('div')
      set_klass(el_rank, { 'cg-rank': true })
      set_content(el_rank, rank)

      return el_rank
    })
    ranks = new_ranks


    let new_files = orientation === 'black' ? FILES_DESC.slice(0) : FILES.slice(0)
    reconcile(el_files, files, new_files, (file: File) => {
      let el_file = h('div')
      set_klass(el_file, { 'cg-file': true })
      set_content(el_file, file)

      return el_file
    })
    files = new_files
  }

  return {
    els: [el_files, el_ranks]
  }
}

export type CGContainer = CGBoard

export function cg_container(cg_container: CGContainer) {

  let el = h('div')
  set_klass(el, { 'cg-container': true })

  cg_container.turn.subscribe(color => {
    set_klass(el, { 'turn-white': color === 'white', 'turn-black': color === 'black' })
  })

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

