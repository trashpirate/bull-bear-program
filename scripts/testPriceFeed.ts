import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BullBearProgram } from "../target/types/bull_bear_program";

import fs from "fs";
import path from "path";
import os, { machine } from "os";

import { priceFeedAddrSol, SOL_feedId } from "../tests/config";

function loadKeypair(filePath: string): Keypair {
  const resolvedPath = filePath.startsWith("~")
    ? path.join(os.homedir(), filePath.slice(1))
    : filePath;
  const secretKey = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

async function testPriceFeed(program: any, authority: any, age: number) {
  const tx = await program.methods
    .testFeed(SOL_feedId, new anchor.BN(age))
    .accounts({
      authority: authority.publicKey,
      priceUpdate: priceFeedAddrSol,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc({ commitment: "confirmed" });

  return tx;
}

async function main() {
  // provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // program
  const program = anchor.workspace.BullBearProgram as Program<BullBearProgram>;
  console.log("Program ID: ", program.programId.toBase58());

  // authority
  let authority: Keypair = loadKeypair("~/.config/solana/id.json");
  console.log("Authority loaded: ", authority.publicKey.toBase58());

  // Initialize protocol
  const age = 60 * 60 * 5;
  const txId = await testPriceFeed(program, authority, age);
  console.log("Price Test: ", txId);

  // Read transaction data
  let tx = await provider.connection.getTransaction(txId, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  console.log(tx?.meta?.logMessages);
}

main();
