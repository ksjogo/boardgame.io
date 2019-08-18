/*
 * Copyright 2017 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import React from 'react';
import { Debug } from './debug/debug';
import { Client as RawClient } from './client';

import { ComponentType } from 'react';
import {
  Context,
  PlayerID,
  GameReducer,
  MovesRecord,
  ExtractM,
  ExtractPV,
} from '../core/game';

export interface BoardProps<GR> {
  G: ExtractPV<GR>;
  ctx: Context;
  moves: ExtractM<GR>;
  gameID: string;
  playerID: PlayerID;
  isActive: boolean;
  isMultiplayer: boolean;
  isConnected: boolean;
}

export interface ClientOptions<GR> {
  ai?: {
    visualize?: boolean;
  };
  board?: ComponentType<BoardProps<GR>>;
  debug?: {
    showGameInfo?: boolean;
    dockControls?: boolean;
  };
  enhancer?: any;
  game: GR;
  loading?: ComponentType;
  multiplayer?: boolean | { server: string } | { local: boolean };
  numPlayers?: number;
}

export interface ClientProps {
  credentials?: string;
  debug?: boolean;
  gameID?: string;
  playerID?: string;
}

/**
 * Client
 *
 * boardgame.io React client.
 *
 * @param {...object} game - The return value of `Game`.
 * @param {...object} numPlayers - The number of players.
 * @param {...object} board - The React component for the game.
 * @param {...object} loading - (optional) The React component for the loading state.
 * @param {...object} multiplayer - Set to true or { server: '<host>:<port>' }
 *                                  to make a multiplayer client. The second
 *                                  syntax specifies a non-default socket server.
 * @param {...object} debug - Enables the Debug UI.
 * @param {...object} enhancer - Optional enhancer to send to the Redux store
 *
 * Returns:
 *   A React component that wraps board and provides an
 *   API through props for it to interact with the framework
 *   and dispatch actions such as MAKE_MOVE, GAME_EVENT, RESET,
 *   UNDO and REDO.
 */
export function Client<
  GameState extends object,
  Moves extends MovesRecord<GameState>,
  GameStatePlayerView extends object,
  GR = GameReducer<GameState, Moves, GameStatePlayerView>
>(opts: { game: GR } & ClientOptions<GR>) {
  let {
    game,
    numPlayers,
    loading,
    board,
    multiplayer,
    ai,
    debug,
    enhancer,
  } = opts;

  // Component that is displayed before the client has synced
  // with the game master.
  if (loading === undefined) {
    const Loading = () => <div className="bgio-loading">connecting...</div>;
    loading = Loading;
  }

  /*
   * WrappedBoard
   *
   * The main React component that wraps the passed in
   * board component and adds the API to its props.
   */
  return class WrappedBoard extends React.Component<ClientProps> {
    static defaultProps = {
      gameID: 'default',
      playerID: null,
      credentials: null,
      debug: true,
    };

    gameID: ClientProps['gameID'];
    playerID: ClientProps['playerID'];
    credentials: ClientProps['credentials'];
    debug: ClientProps['debug'];

    client: ReturnType<RawClient>;

    state = {
      gameStateOverride: null,
    };

    constructor(props) {
      super(props);

      this.client = RawClient({
        game,
        ai,
        numPlayers,
        multiplayer,
        gameID: props.gameID,
        playerID: props.playerID,
        credentials: props.credentials,
        enhancer,
      });

      this.gameID = props.gameID;
      this.playerID = props.playerID;
      this.credentials = props.credentials;

      this.client.subscribe(() => this.forceUpdate());
    }

    componentDidUpdate(prevProps) {
      if (this.props.gameID != prevProps.gameID) {
        this.updateGameID(this.props.gameID);
      }
      if (this.props.playerID != prevProps.playerID) {
        this.updatePlayerID(this.props.playerID);
      }
      if (this.props.credentials != prevProps.credentials) {
        this.updateCredentials(this.props.credentials);
      }
    }

    updateGameID = gameID => {
      this.client.updateGameID(gameID);
      this.gameID = gameID;
      this.forceUpdate();
    };

    updatePlayerID = playerID => {
      this.client.updatePlayerID(playerID);
      this.playerID = playerID;
      this.forceUpdate();
    };

    updateCredentials = credentials => {
      this.client.updateCredentials(credentials);
      this.credentials = credentials;
      this.forceUpdate();
    };

    componentDidMount() {
      this.client.connect();
    }

    overrideGameState = state => {
      this.setState({ gameStateOverride: state });
    };

    render() {
      let _board = null;
      let _debug = null;

      let state = this.client.getState();
      const { debug: debugProp, ...rest } = this.props;

      if (this.state.gameStateOverride) {
        state = { ...state, ...this.state.gameStateOverride };
      }

      if (state === null) {
        return React.createElement(loading);
      }

      if (board) {
        _board = React.createElement(board, {
          ...state,
          ...rest,
          isMultiplayer: multiplayer !== undefined,
          moves: this.client.moves,
          events: this.client.events,
          gameID: this.gameID,
          playerID: this.playerID,
          step: this.client.step,
          reset: this.client.reset,
          undo: this.client.undo,
          redo: this.client.redo,
          gameMetadata: this.client.gameMetadata,
        });
      }

      if ((debug as any) !== false && debugProp) {
        const showGameInfo = typeof debug === 'object' && debug.showGameInfo;
        const dockControls = typeof debug === 'object' && debug.dockControls;
        _debug = React.createElement(Debug, {
          gamestate: state,
          reducer: this.client.reducer,
          store: this.client.store,
          isMultiplayer: multiplayer !== undefined,
          moves: this.client.moves,
          events: this.client.events,
          gameID: this.gameID,
          playerID: this.playerID,
          credentials: this.credentials,
          step: this.client.step,
          reset: this.client.reset,
          undo: this.client.undo,
          redo: this.client.redo,
          visualizeAI: ai && ai.visualize,
          overrideGameState: this.overrideGameState,
          updateGameID: this.updateGameID,
          updatePlayerID: this.updatePlayerID,
          updateCredentials: this.updateCredentials,
          showGameInfo,
          dockControls,
        });
      }

      return (
        <div className="bgio-client">
          {_debug}
          {_board}
        </div>
      );
    }
  };
}

export default Client;
