import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { BullBearProgram } from "../target/types/bull_bear_program";
import { expect } from "chai";
import * as splToken from "@solana/spl-token";

import fs from "fs";
import path from "path";
import os, { machine } from "os";

const FEE = 1000000;

function loadKeypair(filePath: string): Keypair {
  const resolvedPath = filePath.startsWith("~")
    ? path.join(os.homedir(), filePath.slice(1))
    : filePath;
  const secretKey = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

async function initializeProtocol(
  program: any,
  anchorProvider: anchor.AnchorProvider,
  game_fee: number,
  simulate: boolean = true
) {
  const authority = anchorProvider;
  const protocolPDA = await getProtocolPDA(program, authority.publicKey);
  const instruction = await program.methods
    .initialize(new anchor.BN(game_fee))
    .accounts({
      authority: authority.publicKey,
      protocol: protocolPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .instruction();

  const transaction = new Transaction();
  transaction.add(await instruction);

  let response;
  if (simulate) {
    response = await anchorProvider.simulate(transaction);
  } else {
    response = await anchorProvider.sendAndConfirm(transaction);
  }
  return response.logs;
}

async function getProtocolPDA(program: any, authority: any) {
  const [pda, bump] = await PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode("PROTOCOL_SEED"), authority.toBuffer()],
    program.programId
  );

  return pda;
}

async function main() {
  // process arguments
  const args = process.argv.slice(2);
  let simulate;
  if (args[0] == "false") {
    simulate = false;
  } else {
    simulate = true;
  }

  // provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // program
  const program = anchor.workspace.BullBearProgram as Program<BullBearProgram>;
  console.log("Program ID: ", program.programId.toBase58());

  // Initialize protocol
  const tx = await initializeProtocol(program, provider, FEE, simulate);
  console.log("Protocol initialized: ", tx);
}

main();
