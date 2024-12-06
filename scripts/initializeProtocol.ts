import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
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
  authority: any,
  game_fee: number
) {
  const protocolPDA = await getProtocolPDA(program, authority);
  const tx = await program.methods
    .initialize(new anchor.BN(game_fee))
    .accounts({
      authority: authority.publicKey,
      protocol: protocolPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc({ commitment: "confirmed" });

  return tx;
}

async function getProtocolPDA(program: any, authority: any) {
  const [pda, bump] = await PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("PROTOCOL_SEED"),
      authority.publicKey.toBuffer(),
    ],
    program.programId
  );

  return pda;
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
  const tx = await initializeProtocol(program, authority, FEE);
  console.log("Protocol initialized: ", tx);
}

main();
