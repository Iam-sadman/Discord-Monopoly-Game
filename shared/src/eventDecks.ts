import { EventCard, EventExecutionContext, EventExecutionResult } from './types.js';

export const EVENT_CARDS: readonly EventCard[] = [
  {
    id: 'remittance_bonus',
    title: 'Remittance Bonus',
    description: 'Foreign remittance payout arrives safely. Receive +150 coins.',
    type: 'REWARD',
    execute: (ctx: EventExecutionContext): EventExecutionResult => {
      return {
        cardId: 'remittance_bonus',
        playerId: ctx.playerId,
        cashDelta: 150,
        summary: `${ctx.player.username} received +150 coins from Remittance Bonus!`,
      };
    },
  },
  {
    id: 'padma_bridge_dividend',
    title: 'Padma Bridge Toll Dividend',
    description: 'National infrastructure yields high returns. Receive +100 coins.',
    type: 'REWARD',
    execute: (ctx: EventExecutionContext): EventExecutionResult => {
      return {
        cardId: 'padma_bridge_dividend',
        playerId: ctx.playerId,
        cashDelta: 100,
        summary: `${ctx.player.username} earned +100 coins in Padma Bridge Toll Dividends!`,
      };
    },
  },
  {
    id: 'wasa_pipeline_repair',
    title: 'WASA Pipeline Repair',
    description: 'Emergency water repair in your sector. Pay 40 coins per owned property.',
    type: 'PENALTY',
    execute: (ctx: EventExecutionContext): EventExecutionResult => {
      const ownedCount = ctx.properties.filter(
        (p) => p.ownerUserId === ctx.playerId && !p.mortgaged
      ).length;
      const totalCost = ownedCount * 40;
      return {
        cardId: 'wasa_pipeline_repair',
        playerId: ctx.playerId,
        cashDelta: -totalCost,
        summary: `${ctx.player.username} paid ${totalCost} coins (${ownedCount} properties × 40) for WASA Pipeline Repair.`,
      };
    },
  },
  {
    id: 'desco_peak_grid_surcharge',
    title: 'DESCO Peak Grid Surcharge',
    description: 'Summer grid overload! Pay 25 coins per building level across all owned properties.',
    type: 'PENALTY',
    execute: (ctx: EventExecutionContext): EventExecutionResult => {
      const totalLevels = ctx.properties
        .filter((p) => p.ownerUserId === ctx.playerId && !p.mortgaged)
        .reduce((sum, p) => sum + p.buildingLevel, 0);
      const totalCost = totalLevels * 25;
      return {
        cardId: 'desco_peak_grid_surcharge',
        playerId: ctx.playerId,
        cashDelta: -totalCost,
        summary: `${ctx.player.username} paid ${totalCost} coins (${totalLevels} building levels × 25) for DESCO Peak Grid Surcharge.`,
      };
    },
  },
  {
    id: 'nbr_spot_assessment',
    title: 'NBR Spot Assessment',
    description: 'National Board of Revenue audits your transactions. Pay flat 120 coins.',
    type: 'PENALTY',
    execute: (ctx: EventExecutionContext): EventExecutionResult => {
      return {
        cardId: 'nbr_spot_assessment',
        playerId: ctx.playerId,
        cashDelta: -120,
        summary: `${ctx.player.username} paid 120 coins for NBR Spot Assessment.`,
      };
    },
  },
  {
    id: 'trade_fair_grant',
    title: 'Trade Fair Grant',
    description: 'International trade fair exhibition success! Receive +120 coins.',
    type: 'REWARD',
    execute: (ctx: EventExecutionContext): EventExecutionResult => {
      return {
        cardId: 'trade_fair_grant',
        playerId: ctx.playerId,
        cashDelta: 120,
        summary: `${ctx.player.username} received +120 coins Trade Fair Grant!`,
      };
    },
  },
  {
    id: 'traffic_gridlock',
    title: 'Traffic Gridlock',
    description: 'Dhaka traffic jam reroutes you directly to Kamalapur Railway Station (Index 15). If you pass Start, collect 200 coins.',
    type: 'MOVE',
    execute: (ctx: EventExecutionContext): EventExecutionResult => {
      const targetIndex = 15;
      // If player position is past index 15, they wrap around and pass Start (index 0)
      const passedStart = ctx.player.position > targetIndex;
      const cashDelta = passedStart ? 200 : 0;
      return {
        cardId: 'traffic_gridlock',
        playerId: ctx.playerId,
        moveToIndex: targetIndex,
        passedStart,
        cashDelta,
        summary: `${ctx.player.username} rerouted through traffic gridlock to Kamalapur Railway Station${passedStart ? ' and collected +200 for passing Start' : ''}!`,
      };
    },
  },
  {
    id: 'municipal_rebate',
    title: 'Municipal Rebate',
    description: 'City corporation issues tax rebate on green development. Receive +80 coins.',
    type: 'REWARD',
    execute: (ctx: EventExecutionContext): EventExecutionResult => {
      return {
        cardId: 'municipal_rebate',
        playerId: ctx.playerId,
        cashDelta: 80,
        summary: `${ctx.player.username} collected +80 coins Municipal Rebate!`,
      };
    },
  },
];

export const getCardById = (id: string): EventCard | undefined => {
  return EVENT_CARDS.find((c) => c.id === id);
};
