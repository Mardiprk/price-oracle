import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PriceOracle } from "../target/types/price_oracle";
import { Connection, PublicKey } from "@solana/web3.js";
import { expect } from "chai";

describe("price_oracle", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PriceOracle as Program<PriceOracle>;
  
  const BTC_PRICE_FEED = new PublicKey(
    "HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J"
  );
  const SOL_PRICE_FEED = new PublicKey(
    "J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"
  );
  const ETH_PRICE_FEED = new PublicKey(
    "EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw"
  );

  let priceDataAccount: anchor.web3.Keypair;

  before(async () => {
    priceDataAccount = anchor.web3.Keypair.generate();
    
    const size = 8 + 8 + 8 + 8 + 8;
    const lamports = await provider.connection.getMinimumBalanceForRentExemption(size);
    
    const tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: priceDataAccount.publicKey,
        space: size,
        lamports,
        programId: program.programId,
      })
    );

    await provider.sendAndConfirm(tx, [priceDataAccount]);
    console.log("Price data account created:", priceDataAccount.publicKey.toString());
  });

  it("Fetches BTC, SOL, and ETH prices from Pyth", async () => {
    try {
      const tx = await program.methods
        .getPrices()
        .accounts({
          btcPriceFeed: BTC_PRICE_FEED,
          solPriceFeed: SOL_PRICE_FEED,
          ethPriceFeed: ETH_PRICE_FEED,
          priceData: priceDataAccount.publicKey,
          user: provider.wallet.publicKey,
        })
        .rpc();

      console.log("Transaction signature:", tx);

      const priceData = await program.account.priceData.fetch(
        priceDataAccount.publicKey
      );

      console.log("\n=== Price Data ===");
      console.log("BTC Price (raw):", priceData.btcPrice.toString());
      console.log("SOL Price (raw):", priceData.solPrice.toString());
      console.log("ETH Price (raw):", priceData.ethPrice.toString());
      console.log("Last Update:", new Date(priceData.lastUpdate.toNumber() * 1000).toISOString());

      // Verify that prices were actually stored
      expect(priceData.btcPrice.toNumber()).to.not.equal(0);
      expect(priceData.solPrice.toNumber()).to.not.equal(0);
      expect(priceData.ethPrice.toNumber()).to.not.equal(0);
      expect(priceData.lastUpdate.toNumber()).to.be.greaterThan(0);

      console.log("\n✅ Test passed! Prices fetched and stored successfully.");
    } catch (error) {
      console.error("Error details:", error);
      throw error;
    }
  });

  it("Verifies price updates are recent (within max_age)", async () => {
    const priceData = await program.account.priceData.fetch(
      priceDataAccount.publicKey
    );

    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - priceData.lastUpdate.toNumber();

    console.log(`Time since last update: ${timeDiff} seconds`);
    
    // Should be updated within the last minute based on max_age parameter
    expect(timeDiff).to.be.lessThan(120); // Allow 2 minute buffer
  });

  it("Can fetch prices multiple times", async () => {
    // Wait a bit between calls
    await new Promise(resolve => setTimeout(resolve, 2000));

    const tx = await program.methods
      .getPrices()
      .accounts({
        btcPriceFeed: BTC_PRICE_FEED,
        solPriceFeed: SOL_PRICE_FEED,
        ethPriceFeed: ETH_PRICE_FEED,
        priceData: priceDataAccount.publicKey,
        user: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Second transaction signature:", tx);

    const priceData = await program.account.priceData.fetch(
      priceDataAccount.publicKey
    );

    console.log("Updated BTC Price (raw):", priceData.btcPrice.toString());
    console.log("Updated SOL Price (raw):", priceData.solPrice.toString());
    console.log("Updated ETH Price (raw):", priceData.ethPrice.toString());

    expect(priceData.btcPrice.toNumber()).to.not.equal(0);
    expect(priceData.solPrice.toNumber()).to.not.equal(0);
    expect(priceData.ethPrice.toNumber()).to.not.equal(0);

    console.log("\n✅ Multiple price fetches work correctly!");
  });
});