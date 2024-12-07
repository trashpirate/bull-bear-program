import * as anchor from "@coral-xyz/anchor";
import { Program, Wallet } from "@coral-xyz/anchor";
import { MockPythPull } from "../../target/types/mock_pyth_pull";

import { pullOracleClient } from "../mock_oracle";
import { BullBearProgram } from "../../target/types/bull_bear_program";
import { priceFeedAddrSol, SOL_feedId } from "../config";
import { airdrop, getOracle, setOraclePrice } from "../helpers";
import { Keypair, PublicKey } from "@solana/web3.js";
import { confirmTransaction } from "@solana-developers/helpers";

describe("Update Price Feed", async () => {
  // provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BullBearProgram as Program<BullBearProgram>;

  let authority: Keypair;
  beforeEach("Setup", async () => {
    // Generate keypairs
    authority = anchor.web3.Keypair.generate();

    // Fund accounts
    await airdrop(provider.connection, authority.publicKey);
  });

  it("test price feed", async () => {
    try {
      // program
      const oracle = await getOracle(provider);
      const priceFeed = oracle.feed;
      const pullOracle = oracle.pullOracle;

      const tx_set = await setOraclePrice(provider, pullOracle, priceFeed, 60);
      console.log("set price", tx_set);

      const tx_price = await program.methods
        .testFeed(SOL_feedId, new anchor.BN(60))
        .accounts({
          gameAuthority: authority.publicKey,
          priceUpdate: priceFeed,
        })
        .signers([authority])
        .rpc({ commitment: "confirmed" });

      console.log("tx_price", tx_price);
      let tx = await provider.connection.getTransaction(tx_price, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });

      console.log(tx?.meta?.logMessages);
    } catch (error) {
      console.log("error", error);
    }
  });
});
