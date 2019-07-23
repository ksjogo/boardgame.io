/*
 * Copyright 2018 The boardgame.io Authors.
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import React from 'react';
import { TurnOrder } from 'boardgame.io/core';

const code = `{
  startingPhase: 'A',
  phases: {
    A: { turn: { order: TurnOrder.ANY_ONCE }, next: 'B' },
    B: {},
  }
}
`;

const Description = () => (
  <div>
    <pre>{code}</pre>
  </div>
);

export default {
  description: Description,
  game: {
    moves: {
      move: G => G,
    },

    endTurn: false,
    endPhase: false,
    startingPhase: 'A',

    phases: {
      A: { turn: { order: TurnOrder.ANY_ONCE }, next: 'B' },
      B: {},
    },
  },
};
