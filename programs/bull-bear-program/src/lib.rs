use anchor_lang::prelude::*;
use crate::instructions::*;

pub mod errors;
pub mod instructions;
pub mod states;

declare_id!("FKkP7JrUxzVYgZfgvb1J86SNuFmPAEtCURD6snMtcjPu");

#[program]
pub mod bull_bear_program {
    use super::*;

     pub fn initialize(ctx: Context<InitializeProtocolContext>, game_fee: u64) -> Result<()> {
        return initialize_protocol(ctx, game_fee);
    }

    pub fn initialize_new_game(ctx: Context<InitializeGameContext>, round_interval: u64, feed_id: String, feed_account: Pubkey) -> Result<()> {
        return initialize_game(ctx, round_interval, feed_id, feed_account);
    }
    
    pub fn initialize_new_round(ctx: Context<InitializeRoundContext>) -> Result<()> {
        return initialize_round(ctx);
    }

    pub fn start_current_round(ctx: Context<StartRoundContext>) -> Result<()> {
        return start_round(ctx);
    }

    pub fn place_new_bet(ctx: Context<PlaceBetContext>, prediction: states::PriceMovement, amount: u64) -> Result<()> {
        return place_bet(ctx, prediction, amount);
    }
    
    pub fn close_betting_phase(ctx: Context<CloseBettingContext>) -> Result<()> {
        return close_betting(ctx);
    }
    
    pub fn end_current_round(ctx: Context<EndRoundContext>) -> Result<()> {
        return end_round(ctx);
    }

    pub fn claim_unclaimed_prize(ctx: Context<ClaimPrizeContext>) -> Result<()> {
        return claim_prize(ctx);
    }
   
    pub fn withdraw_game_funds(ctx: Context<WithdrawFundsContext>) -> Result<()> {
        return withdraw_funds(ctx);
    }

    pub fn update_round_interval(ctx: Context<UpdateIntervalContext>, round_interval: u64) -> Result<()> {
        return update_interval(ctx, round_interval);
    }
    
    pub fn test_feed(ctx: Context<PriceFeedContext>, feed_id: String, maximum_age: u64) -> Result<()> {
        return test_price_feed(ctx, feed_id, maximum_age);
    }
}


