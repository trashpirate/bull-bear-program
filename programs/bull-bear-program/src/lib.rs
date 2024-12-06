use anchor_lang::prelude::*;

declare_id!("FKkP7JrUxzVYgZfgvb1J86SNuFmPAEtCURD6snMtcjPu");

#[program]
pub mod bull_bear_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
