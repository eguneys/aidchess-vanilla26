import { Chess } from "chessops";
import { Dests, FEN } from "./board";
import { parseFen } from "chessops/fen";
import { chessgroundDests } from "chessops/compat";

function fen2pos(fen: FEN) {
    return Chess.fromSetup(parseFen(fen).unwrap()).unwrap()
}

export function fen2dests(fen: FEN): Dests {
    return chessgroundDests(fen2pos(fen))
}