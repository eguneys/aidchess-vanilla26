import { Color } from 'chessops'
import { cg_container, CGPiece, fen_to_pieces, INITIAL_FEN, Pieces } from './board'
import { h, set_klass } from './dom'
import './index.scss'
import { createSignal } from './reactive'
import './showcase.scss'

function app(el: HTMLElement) {

  let el_wrap = h('div')
  set_klass(el_wrap, { 'board-wrap': true })

  let pieces = createSignal<Pieces>({})
  let orientation = createSignal<Color>('white')
  let drag = createSignal<[CGPiece, CGPiece | undefined] | undefined>()

  let { on_mount, el: cg_container_el } = cg_container({
    pieces,
    orientation,
    drag
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