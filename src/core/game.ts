/*
 * Copyright 2017 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { FnWrap } from '../plugins/main';
import { Flow } from './flow';

export type PlayerID = string;
export type PhaseID = string;

export type Plugin = object;

export interface Context {
  gameover: any;
  numPlayers: number;
  turn: number;
  currentPlayer: PlayerID;
  currentPlayerMoves: number;
  random: {
    Shuffle: <A extends any[]>(array: A) => A;
  };
  actionPlayers: PlayerID[];
  playOrder: PlayerID[];
  playOrderPos: number;
  stats: {
    turn: {
      numMoves: Partial<Record<PlayerID, number>>;
      allPlayed: boolean;
    };
    phase: {
      numMoves: Partial<Record<PlayerID, number>>;
      allPlayed: boolean;
    };
  };
  allPlayed: boolean;
  phase: PhaseID;
  prevPhase?: PhaseID;
  playerID: PlayerID;
  events: {
    endGame: () => void;
    endPhase: (options?: { next: PhaseID }) => void;
    endTurn: (options?: { next: PlayerID }) => void;
  };
}

export interface GameFlowPhase<GR, G = ExtractG<GR>, M = ExtractM<GR>> {
  endPhaseIf?: (G: G, ctx: Context) => boolean | { next: PhaseID };
  next?: PhaseID;
  endTurnIf?: (G: G, ctx: Context) => boolean | { next: PlayerID };
  onTurnBegin?: (G: G, ctx: Context) => G | void;
  onTurnEnd?: (G: G, ctx: Context) => G | void;
  onMove?: (G: G, ctx: Context) => G | void;
  onPhaseBegin?: (G: G, ctx: Context) => G | void;
  onPhaseEnd?: (G: G, ctx: Context) => G | void;
  allowedMoves?: (keyof M)[];
}

export interface GameFlow<GR, G = ExtractG<GR>> {
  moveNames?: string[];
  endTurn?: boolean;
  endPhase?: boolean;
  endGame?: boolean;
  turnOrder?: object;
  startingPhase?: PhaseID;
  phases?: Record<PhaseID, GameFlowPhase<GR>>;
  endTurnIf?: (G: G, ctx: Context) => boolean | { next: PlayerID };
  onTurnBegin?: (G: G, ctx: Context) => G | void;
  onTurnEnd?: (G: G, ctx: Context) => G | void;
  onMove?: (G: G, ctx: Context) => G | void;

  getMove?: any;

  processGameEvent?: any;
}

export type Move<GameState, Args extends any[] = any[]> = (
  G: GameState,
  ctx: Context,
  ...args: Args
) => GameState | void;

export type MovesRecord<GameState> = Record<string, Move<GameState>>;

export interface GameConfig<
  GameState extends object,
  Moves extends Record<string, Move<GameState>>,
  GameStatePlayerView extends object
> {
  ai?: any;
  seed?: string;
  name?: string;
  setup?(ctx: Context, setupData: object): GameState;
  moves?: Moves;
  flow?: GameFlow<GameReducer<GameState, Moves, GameStatePlayerView>>;
  playerView?(
    G: GameState,
    ctx: Context,
    playerID: PlayerID
  ): GameStatePlayerView;
  plugins?: Plugin[];
  turn?: {
    moveLimit?: number;
  };
  endIf?: (G: GameState, ctx: Context) => object | undefined;
}

export interface GameReducer<
  GameState extends object,
  Moves extends Record<string, Move<GameState>>,
  PlayerView extends object
> extends GameConfig<GameState, Moves, PlayerView> {
  moveNames: (keyof Moves)[];
  processMove(state: GameState, any, ctx: Context): GameState;
}

export type ExtractG<GR> = GR extends GameReducer<infer G, infer M, infer PV>
  ? G
  : never;
export type ExtractM<GR> = GR extends GameReducer<infer G, infer M, infer PV>
  ? M
  : never;
export type ExtractPV<GR> = GR extends GameReducer<infer G, infer M, infer PV>
  ? PV
  : never;

/**
 * Game
 *
 * Helper to generate the game move reducer. The returned
 * reducer has the following signature:
 *
 * (G, action, ctx) => {}
 *
 * You can roll your own if you like, or use any Redux
 * addon to generate such a reducer.
 *
 * The convention used in this framework is to
 * have action.type contain the name of the move, and
 * action.args contain any additional arguments as an
 * Array.
 *
 * ({
 *   name: 'tic-tac-toe',
 *
 *   setup: (numPlayers) => {
 *     const G = {...};
 *     return G;
 *   },
 *
 *   plugins: [plugin1, plugin2, ...],
 *
 *   moves: {
 *     'moveWithoutArgs': (G, ctx) => {
 *       return Object.assign({}, G, ...);
 *     },
 *     'moveWithArgs': (G, ctx, arg0, arg1) => {
 *       return Object.assign({}, G, ...);
 *     }
 *   },
 *
 *   playerView: (G, ctx, playerID) => { ... },
 *
 *   flow: {
 *     endIf: (G, ctx) => { ... },
 *
 *     phases: {
 *       A: { onBegin: (G, ctx) => G, onEnd: (G, ctx) => G },
 *       B: { onBegin: (G, ctx) => G, onEnd: (G, ctx) => G },
 *       ...
 *     }
 *   },
 * })
 *
 * @param {...object} setup - Function that returns the initial state of G.
 *
 * @param {...object} moves - A dictionary of move functions.
 *
 * @param {...object} playerView - A function that returns a
 *                                 derivative of G tailored for
 *                                 the specified player.
 *
 * @param {...object} flow - Customize the flow of the game (see flow.js).
 *
 * @param {...object} seed - Seed for the PRNG.
 *
 * @param {Array} plugins - List of plugins. Each plugin is an object like the following:
 *                          {
 *                            // Optional: Wraps a move / trigger function and returns
 *                            // the wrapped function. The wrapper can do anything
 *                            // it wants, but will typically be used to customize G.
 *                            fnWrap: (fn) => {
 *                              return (G, ctx, ...args) => {
 *                                G = preprocess(G);
 *                                G = fn(G, ctx, ...args);
 *                                G = postprocess(G);
 *                                return G;
 *                              };
 *                            },
 *
 *                            // Optional: Called during setup. Can be used to
 *                            // augment G with additional state during setup.
 *                            setup: (G, ctx) => G,
 *                          }
 */
export function Game<
  GameState extends object,
  Moves extends Record<string, Move<GameState>>,
  GameStatePlayerView extends object
>(
  game: GameConfig<GameState, Moves, GameStatePlayerView>
): GameReducer<GameState, Moves, GameStatePlayerView> {
  function isGR(
    game: any
  ): game is GameReducer<GameState, Moves, GameStatePlayerView> {
    return game.processMove !== undefined;
  }

  // The Game() function has already been called on this
  // config object, so just pass it through.
  if (isGR(game)) {
    return game;
  }

  if (game.name === undefined) game.name = 'default';
  if (game.setup === undefined) game.setup = () => ({} as any);
  if (game.moves === undefined) game.moves = {} as any;
  if (game.playerView === undefined) game.playerView = G => G as any;
  if (game.plugins === undefined) game.plugins = [];

  if (!game.flow || game.flow.processGameEvent === undefined) {
    game.flow = Flow(game);
  }

  return {
    ...game,

    moveNames: game.flow.moveNames,

    processMove: (G, action, ctx) => {
      let moveFn = game.flow.getMove(ctx, action.type, action.playerID);

      if (moveFn instanceof Object && moveFn.move) {
        moveFn = moveFn.move;
      }

      if (moveFn instanceof Function) {
        const ctxWithPlayerID = { ...ctx, playerID: action.playerID };
        const args = [G, ctxWithPlayerID].concat(action.args);
        const fn = FnWrap(moveFn, game.plugins);
        return fn(...args);
      }

      return G;
    },
  };
}
