-- PostgreSQL Schema for Block Party

CREATE TABLE IF NOT EXISTS users (
    discord_user_id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    avatar_hash VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY,
    discord_instance_id VARCHAR(128),
    host_user_id VARCHAR(64) NOT NULL REFERENCES users(discord_user_id),
    status VARCHAR(32) NOT NULL DEFAULT 'LOBBY',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at BIGINT,
    ends_at BIGINT,
    current_player_id VARCHAR(64) REFERENCES users(discord_user_id),
    turn_deadline BIGINT,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_players (
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    discord_user_id VARCHAR(64) NOT NULL REFERENCES users(discord_user_id),
    turn_order INT NOT NULL DEFAULT 0,
    position INT NOT NULL DEFAULT 0,
    cash BIGINT NOT NULL DEFAULT 1500,
    unpaid_bills BIGINT NOT NULL DEFAULT 0,
    turns_taken INT NOT NULL DEFAULT 0,
    jailed BOOLEAN NOT NULL DEFAULT FALSE,
    jail_turns SMALLINT NOT NULL DEFAULT 0,
    connected BOOLEAN NOT NULL DEFAULT TRUE,
    ready BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (game_id, discord_user_id)
);

CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    board_index INT NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    tile_type VARCHAR(32) NOT NULL,
    category_id VARCHAR(32) NOT NULL,
    purchase_price INT,
    base_rent INT,
    building_costs JSONB,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS game_properties (
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    property_id INT NOT NULL REFERENCES properties(id),
    owner_user_id VARCHAR(64) REFERENCES users(discord_user_id),
    building_level INT NOT NULL DEFAULT 0,
    base_upgrade_spent BIGINT NOT NULL DEFAULT 0,
    mortgaged BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (game_id, property_id)
);

CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    discord_user_id VARCHAR(64) NOT NULL REFERENCES users(discord_user_id),
    principal INT NOT NULL,
    accrued_interest INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    issued_at BIGINT NOT NULL,
    last_interest_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS auctions (
    id UUID PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    property_id INT NOT NULL REFERENCES properties(id),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    starting_bid INT NOT NULL,
    highest_bid INT NOT NULL,
    highest_bidder_id VARCHAR(64) REFERENCES users(discord_user_id),
    ends_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS auction_bids (
    id UUID PRIMARY KEY,
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    bidder_user_id VARCHAR(64) NOT NULL REFERENCES users(discord_user_id),
    amount INT NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS game_actions (
    id UUID PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    actor_user_id VARCHAR(64) NOT NULL REFERENCES users(discord_user_id),
    action_type VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_game_idempotency UNIQUE(game_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS financial_ledger (
    id BIGSERIAL PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_user_id VARCHAR(64) NOT NULL REFERENCES users(discord_user_id),
    action_id VARCHAR(128) NOT NULL,
    entry_type VARCHAR(64) NOT NULL,
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_events (
    id UUID PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    card_id VARCHAR(64) NOT NULL,
    triggered_by_user_id VARCHAR(64) NOT NULL REFERENCES users(discord_user_id),
    effect_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_results (
    game_id UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
    winner_user_id VARCHAR(64) REFERENCES users(discord_user_id),
    standings JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_properties_game ON game_properties(game_id);
CREATE INDEX IF NOT EXISTS idx_loans_game_user ON loans(game_id, discord_user_id);
CREATE INDEX IF NOT EXISTS idx_auctions_game ON auctions(game_id);
CREATE INDEX IF NOT EXISTS idx_ledger_game ON financial_ledger(game_id);
