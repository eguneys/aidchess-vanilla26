import { Chess, parseUci } from "chessops";
import { makeFen, parseFen } from "chessops/fen";
import { chessgroundDests } from "chessops/compat";
import type { PositionKey } from "./board";

export type Dests = Map<PositionKey, PositionKey[]>
export type FEN = string
export type UCI = string

export function fen2pos(fen: FEN) {
    return Chess.fromSetup(parseFen(fen).unwrap()).unwrap()
}

export function fen2dests(fen: FEN): Dests {
    return chessgroundDests(fen2pos(fen))
}

export function fen_play_uci(fen: FEN, uci: UCI): FEN {
    let pos = fen2pos(fen)
    pos.play(parseUci(uci)!)
    return makeFen(pos.toSetup())
}