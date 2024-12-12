import * as anchor from "@coral-xyz/anchor";
import { BN, Program, utils } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { BullBearProgram } from "../target/types/bull_bear_program";
import { expect } from "chai";
import * as splToken from "@solana/spl-token";

import fs from "fs";
import path from "path";
import os, { machine } from "os";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getGamePDA, getProtocolPDA, getRoundPDA } from "./pdas";

const SOL_feedId =
  "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
const priceFeedAddrSol = new PublicKey(
  "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"
);

const protocolAddress = new PublicKey(
  "CVF4Gm38MrgN1rDZribjLLZvxaKxrkgHHZiZzAtfE81H"
);

const tokenAddress = new PublicKey(
  "28Taa1aB5AmoqmA7P1b3MrK3oCogLDPPyuLBFA4D2HR2"
);

const FEE = 1000000;
const DEFAULT_ROUND_INTERVAL = 60 * 60 * 5; // 10 minutes

function loadKeypair(filePath: string): Keypair {
  const resolvedPath = filePath.startsWith("~")
    ? path.join(os.homedir(), filePath.slice(1))
    : filePath;
  const secretKey = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

export async function initializeRoundInstruction(
  signer: any,
  program: any,
  gamePDA: any,
  roundPDA: any,
  vault: any,
  tokenAddress: any
) {
  const instruction = await program.methods
    .initializeNewRound()
    .accounts({
      gameAuthority: signer,
      game: gamePDA,
      round: roundPDA,
      mint: tokenAddress,
      vault: vault,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .instruction();
  return instruction;
}

export async function startRoundInstruction(
  signer: any,
  program: any,
  gamePDA: any,
  roundPDA: any,
  priceFeedAccount: any
) {
  const instruction = await program.methods
    .startCurrentRound()
    .accountsStrict({
      gameAuthority: signer,
      game: gamePDA,
      round: roundPDA,
      priceUpdate: priceFeedAccount,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  return instruction;
}

async function startGame(
  program: Program<BullBearProgram>,
  anchorProvider: anchor.AnchorProvider,
  gameAddress: PublicKey,
  tokenAddress: PublicKey,
  priceFeedAddrSol: PublicKey,
  simulate: boolean = true
) {
  const round = await getRoundPDA(program, gameAddress, 0);
  const vault = getAssociatedTokenAddressSync(tokenAddress, round, true);

  const instruction1 = initializeRoundInstruction(
    anchorProvider.publicKey,
    program,
    gameAddress,
    round,
    vault,
    tokenAddress
  );

  const instruction2 = startRoundInstruction(
    anchorProvider.publicKey,
    program,
    gameAddress,
    round,
    priceFeedAddrSol
  );

  const transaction: Transaction = new Transaction();
  transaction.add(await instruction1, await instruction2);

  let response;
  if (simulate) {
    response = await anchorProvider.simulate(transaction);
  } else {
    response = await anchorProvider.sendAndConfirm(transaction);
  }

  return response.logs;
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

  // authority
  let authority: Keypair = loadKeypair("~/.config/solana/id.json");
  console.log("Authority loaded: ", authority.publicKey.toBase58());

  // game address
  const gameAddress = await getGamePDA(
    program,
    authority.publicKey,
    protocolAddress,
    tokenAddress,
    priceFeedAddrSol
  );

  // start game
  const tx = await startGame(
    program,
    provider,
    gameAddress,
    tokenAddress,
    priceFeedAddrSol,
    simulate
  );
  console.log(tx);
  console.log("Game started");
}

main();
