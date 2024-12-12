import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BullBearProgram } from "../target/types/bull_bear_program";
import { expect } from "chai";
import * as splToken from "@solana/spl-token";

import fs from "fs";
import path from "path";
import os, { machine } from "os";
import { priceFeedAddrSol } from "../tests/config";

const FEE = 1000000;

function loadKeypair(filePath: string): Keypair {
  const resolvedPath = filePath.startsWith("~")
    ? path.join(os.homedir(), filePath.slice(1))
    : filePath;
  const secretKey = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

async function startRound(
  program: any,
  authority: any,
  game: any,
  priceFeedAddrSol: any
) {
  const round = await getRoundPDA(program, game);

  const tx = // start round
    await program.methods
      .startCurrentRound()
      .accounts({
        gameAuthority: authority.publicKey,
        game: game,
        round: round,
        priceUpdate: priceFeedAddrSol,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([authority])
      .simulate({ commitment: "confirmed" });
  return tx;
}

async function getRoundPDA(
  program: any,
  game_pda: any,
  roundNr: number | null = null
) {
  if (roundNr == null) {
    roundNr = (await program.account.game.fetch(game_pda)).counter;
  }

  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(roundNr, 0);
  const [pda, bump] = await PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode("ROUND_SEED"), game_pda.toBuffer(), buffer],
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

  // game
  const game = new PublicKey("71jR1eWqgNYL2pGCxTRXWfgTS2wcNPfYNvZmZ63SjvCH");

  // Initialize protocol
  const tx = await startRound(program, authority, game, priceFeedAddrSol);
  console.log("Round started: ", tx);
}

main();
