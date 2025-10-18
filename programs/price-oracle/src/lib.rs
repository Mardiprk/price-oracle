use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

declare_id!("E3iizzNkhow2cmaMftn996fmqxM3gdzjXyZDedmhou4V");

#[program]
pub mod price_oracle {
    use super::*;

    pub fn get_prices(ctx: Context<GetPrices>) -> Result<()> {
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        let max_age = 60;
        
        let btc_price_update = &mut ctx.accounts.btc_price_feed;
        let btc_price = btc_price_update.get_price_no_older_than(
            &clock,
            max_age,
            &get_feed_id_from_hex(
                "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"
            )?
        )?;

        let sol_price_update = &mut ctx.accounts.sol_price_feed;
        let sol_price = sol_price_update.get_price_no_older_than(
            &clock,
            max_age, 
            &get_feed_id_from_hex(
                "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d" 
            )?
        )?;

        let eth_price_update=  &mut ctx.accounts.eth_price_feed;
        let eth_price = eth_price_update.get_price_no_older_than(
            &clock,
            max_age,
            &get_feed_id_from_hex(
                "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"
            )?
        )?;

        let btc_value = (btc_price.price as f64) * 10f64.powi(btc_price.exponent);
        let sol_value = (sol_price.price as f64) * 10f64.powi(sol_price.exponent);
        let eth_value = (eth_price.price as f64) * 10f64.powi(eth_price.exponent);

        msg!("BTC Price: {}", btc_value);
        msg!("SOL Price: {}", sol_value);
        msg!("ETH Price: {}", eth_value);
        msg!("Price fetched at timestamp: {}", current_time);

        ctx.accounts.price_data.btc_price = btc_price.price;
        ctx.accounts.price_data.sol_price = sol_price.price;
        ctx.accounts.price_data.eth_price = eth_price.price;
        ctx.accounts.price_data.last_update = current_time;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct GetPrices<'info> {
    ///BTC/USD Price feed
    pub btc_price_feed: Account<'info, PriceUpdateV2>,
    ///SOL/USD Price feed
    pub sol_price_feed: Account<'info, PriceUpdateV2>,
    ///ETh/USD Price feed
    pub eth_price_feed: Account<'info, PriceUpdateV2>,
    ///Account to store price data
    #[account(mut)]
    pub price_data: Account<'info, PriceData>,

    pub user: Signer<'info>

}

#[account]
pub struct PriceData{
    pub btc_price: i64,
    pub sol_price: i64,
    pub eth_price: i64,
    pub last_update: i64
}