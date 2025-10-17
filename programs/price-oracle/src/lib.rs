use anchor_lang::prelude::*;

declare_id!("E3iizzNkhow2cmaMftn996fmqxM3gdzjXyZDedmhou4V");

#[program]
pub mod price_oracle {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
