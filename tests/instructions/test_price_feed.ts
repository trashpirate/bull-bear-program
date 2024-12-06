import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BullBearProgram } from "../../target/types/bull_bear_program";

import { priceFeedAddrSol, SOL_feedId } from "../config";
import { airdrop } from "../helpers";

export function testTestPriceFeed() {
  // provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // program
  const program = anchor.workspace.BullBearProgram as Program<BullBearProgram>;

  let authority: Keypair;
  beforeEach("Setup", async () => {
    // Generate keypairs
    authority = anchor.web3.Keypair.generate();

    // Fund accounts
    await airdrop(provider.connection, authority.publicKey);
  });

  describe("Test Price Feed", () => {
    it("should allow authority to start a round with valid state", async () => {
      // test price feed
      const txId = // start round
        await program.methods
          .testFeed(SOL_feedId, new anchor.BN(60))
          .accounts({
            gameAuthority: authority.publicKey,
            priceUpdate: priceFeedAddrSol,
          })
          .signers([authority])
          .rpc({ commitment: "confirmed" });

      let tx = await provider.connection.getTransaction(txId, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
      console.log(tx?.meta?.logMessages);
    });
  });
}

if (require.main === module) {
  const mocha = require("mocha");
  mocha.run(() => testTestPriceFeed());
}
