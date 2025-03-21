import { cg_container, CGPiece, Color, FEN, fen2pieces, INITIAL_FEN, Pieces, PositionKey } from './board'
import { Dests, fen2check, fen2dests, fen2turn, fen_play_uci } from './chess'
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

  let turn = createMap<Color, FEN>(cg_wrap.fen, fen2turn)
  let check = createMap<boolean, FEN>(cg_wrap.fen, fen2check)
  let pieces = createMap<Pieces, FEN>(cg_wrap.fen, fen2pieces)
  let orientation = cg_wrap.orientation
  let drag = createSignal<CGDrag>()
  let on_drag_play_orig_key = cg_wrap.on_drag_play_orig_key

  let dests = createMap<Dests, FEN>(cg_wrap.fen, fen2dests)

  let { on_mount, el: cg_container_el } = cg_container({
    check,
    turn,
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
    let next_fen = fen_play_uci(fen.get()!, uci)
    fen.set(next_fen)
  })

  el_wrap.appendChild(cg_wrap_el)
  el.appendChild(el_wrap)
  on_mount()

  fen.set(INITIAL_FEN)
  //fen.set('8/3k4/8/3b4/3N4/3K4/8/8 w - - 0 1')
  //fen.set('rnbqk2r/pppp1ppp/3b1n2/4p1N1/4P3/3B4/PPPP1PPP/RNBQK2R b KQkq - 5 4')

  document.addEventListener('keypress', e => {
    if (e.key === 'f') {
      orientation.set_f(color => color === 'white' ? 'black' : 'white')
    }
  })
}

app(document.getElementById('app')!)

