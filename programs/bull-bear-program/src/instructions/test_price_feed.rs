
use anchor_lang::{prelude::*, solana_program::system_program};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2, VerificationLevel};


pub fn test_price_feed(ctx: Context<PriceFeedContext>, feed_id: String, maximum_age: u64) -> Result<()> {

    let price_update = &mut ctx.accounts.price_update;
    let price = price_update.get_price_no_older_than_with_custom_verification_level(&Clock::get()?,
        maximum_age,
         &get_feed_id_from_hex(&feed_id)?,VerificationLevel::Partial{num_signatures: 1})?;
   
    let sol_price = price.price;

    msg!("Price updated: {:?}", sol_price);

    Ok(())
}


#[derive(Accounts)]
pub struct PriceFeedContext<'info> {
    #[account(mut)]
    pub game_authority: Signer<'info>,
    
    pub price_update: Account<'info, PriceUpdateV2>,

    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
}