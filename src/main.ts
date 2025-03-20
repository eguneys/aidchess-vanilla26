import { Color } from 'chessops'
import { cg_container, CGPiece, FEN, fen_to_pieces, INITIAL_FEN, Pieces, PositionKey } from './board'
import { h, set_klass } from './dom'
import './index.scss'
import { createMap, createSignal, Signal } from './reactive'
import './showcase.scss'


export type CGWrap = {
  fen: Signal<FEN>,
  last_move: Signal<[PositionKey, PositionKey]>
  orientation: Signal<Color>
  drag: Signal<CGPiece>
}
export function cg_wrap(cg_wrap: CGWrap)  {

  let el = h('div')
  set_klass(el, { 'cg-wrap': true, 'is2d': true })

  let pieces = createMap<Pieces, FEN>(cg_wrap.fen, fen_to_pieces)
  let orientation = cg_wrap.orientation
  let drag = createSignal<[CGPiece, CGPiece | undefined] | undefined>()

  let { on_mount, el: cg_container_el } = cg_container({
    pieces,
    orientation,
    drag
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

  let { el: cg_wrap_el, on_mount } = cg_wrap({
    fen,
    orientation,
    last_move,
    drag
  })

  el_wrap.appendChild(cg_wrap_el)
  el.appendChild(el_wrap)
  on_mount()

  fen.set(INITIAL_FEN)

  document.addEventListener('keypress', e => {
    if (e.key === 'f') {
      orientation.set_f(color => color === 'white' ? 'black' : 'white')
    }
  })
}

app(document.getElementById('app')!)