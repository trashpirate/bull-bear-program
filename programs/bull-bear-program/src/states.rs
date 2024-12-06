use anchor_lang::prelude::*;

pub const PROTOCOL_SEED: &str = "PROTOCOL_SEED";
pub const GAME_SEED: &str = "GAME_SEED";
pub const ROUND_SEED: &str = "ROUND_SEED";
pub const BET_SEED: &str = "BET_SEED";

pub const MAXIMUM_AGE: u64 = 60; // 1 minute


/** PROTOCOL */
#[account]
#[derive(InitSpace)]
pub struct Protocol {
    pub authority: Pubkey,
    pub game_fee: u64, 
    pub bump: u8,                
}

/** GAMES */
#[account]
#[derive(InitSpace)]
pub struct Game {
    pub protocol: Pubkey,
    pub game_authority: Pubkey,
    pub counter: u16,
    pub round_interval: u64,
    pub feed_id: [u8; 32],
    pub vault: Pubkey,
    pub token: Pubkey,
    pub bump: u8,
}


/** ROUNDS */
#[account]
#[derive(InitSpace)]
pub struct Round {
    pub game: Pubkey,
    pub round_nr: u16,
    pub start_time: i64,
    pub end_time: i64,
    pub start_price: i64,
    pub end_price: i64,
    pub total_up: u64,
    pub total_down: u64,
    pub betting: BettingStatus,
    pub result: PriceMovement,
    pub status: RoundStatus,
    pub num_bets: u16,
    pub bump: u8,
}

/** BETS */
#[account]
#[derive(InitSpace)]
pub struct Bet {
    pub player: Pubkey,
    pub round: Pubkey,
    pub prediction: PriceMovement,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

/** ENUMS */
#[derive(AnchorDeserialize, AnchorSerialize, Clone, PartialEq, InitSpace)]
pub enum BettingStatus {
    Open,
    Closed,
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone, PartialEq, InitSpace)]
pub enum PriceMovement {
    None,
    Up,
    Down,
    NoChange,
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone, PartialEq, InitSpace)]
pub enum RoundStatus {
    Active,
    Inactive,
    Ended,
}

