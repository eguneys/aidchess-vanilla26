import { cg_container, CGPiece, Color, FEN, fen2pieces, INITIAL_FEN, Pieces, PositionKey } from './board'
import { Dests, fen2dests, fen_play_uci } from './chess'
import { h, set_klass } from './dom'
import './index.scss'
import { createMap, createSignal, Signal } from './reactive'
import './showcase.scss'

export type CGWrap = {
  fen: Signal<FEN>,
  last_move: Signal<[PositionKey, PositionKey]>
  orientation: Signal<Color>
  drag: Signal<CGPiece>,
  on_drag_play_orig_key: Signal<[PositionKey, PositionKey]>
}
export function cg_wrap(cg_wrap: CGWrap)  {

  let el = h('div')
  set_klass(el, { 'cg-wrap': true, 'is2d': true })

  let pieces = createMap<Pieces, FEN>(cg_wrap.fen, fen2pieces)
  let orientation = cg_wrap.orientation
  let drag = createSignal<[CGPiece, CGPiece | undefined] | undefined>()
  let on_drag_play_orig_key = cg_wrap.on_drag_play_orig_key

  let dests = createMap<Dests, FEN>(cg_wrap.fen, fen2dests)

  let { on_mount, el: cg_container_el } = cg_container({
    dests,
    pieces,
    orientation,
    drag,
    last_move: cg_wrap.last_move,
    on_drag_play_orig_key
  })

  el.appendChild(cg_container_el)

  return {
    el,
    on_mount() {
      on_mount()
    }
  }
}


function app(el: HTMLElement) {

  let el_wrap = h('div')
  set_klass(el_wrap, { 'board-wrap': true })

  let orientation = createSignal<Color>('white')
  let fen = createSignal<FEN>()
  let last_move = createSignal<[PositionKey, PositionKey]>()
  let drag = createSignal<CGPiece>()
  let on_drag_play_orig_key = createSignal<[PositionKey, PositionKey]>()

  let { el: cg_wrap_el, on_mount } = cg_wrap({
    fen,
    orientation,
    last_move,
    drag,
    on_drag_play_orig_key
  })

  on_drag_play_orig_key.subscribe(([orig, dest]: [PositionKey, PositionKey]) => {
    let uci = `${orig}${dest}`
    fen.set(fen_play_uci(fen.get()!, uci))
  })

  el_wrap.appendChild(cg_wrap_el)
  el.appendChild(el_wrap)
  on_mount()

  //fen.set(INITIAL_FEN)
  fen.set('3k4/8/5n2/8/8/5B2/3K4/8 w - - 0 1')

  document.addEventListener('keypress', e => {
    if (e.key === 'f') {
      orientation.set_f(color => color === 'white' ? 'black' : 'white')
    }
  })
}

app(document.getElementById('app')!)

