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
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { getGamePDA, getProtocolPDA } from "./pdas";

const SOL_feedId =
  "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
const priceFeedAddrSol = new PublicKey(
  "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"
);

const protocolAddress = new PublicKey(
  "CVF4Gm38MrgN1rDZribjLLZvxaKxrkgHHZiZzAtfE81H"
);

const tokenAddress = new PublicKey(
  "EL9dj31wW1sws4aXTrap8ZH3gvxAyM4LHiUm2qe8GpCM"
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

export async function initializeGameInstruction(
  program: Program<BullBearProgram>,
  signer: PublicKey,
  protocolAddress: PublicKey,
  tokenAddress: PublicKey,
  priceFeedId: string,
  priceFeedAddr: PublicKey,
  roundInterval: number
) {
  const gameAccount = await getGamePDA(
    program,
    signer,
    protocolAddress,
    tokenAddress,
    priceFeedAddr
  );

  const gameVault = getAssociatedTokenAddressSync(
    tokenAddress,
    gameAccount,
    true
  );

  const instruction = program.methods
    .initializeNewGame(new BN(roundInterval), priceFeedId, priceFeedAddr)
    .accountsStrict({
      gameAuthority: signer,
      protocol: protocolAddress,
      game: gameAccount,
      mint: tokenAddress,
      vault: gameVault,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .instruction();
  return instruction;
}

async function initializeGame(
  program: Program<BullBearProgram>,
  anchorProvider: anchor.AnchorProvider,
  authority: Keypair,
  protocolAddress: PublicKey,
  tokenAddress: PublicKey,
  SOL_feedId: string,
  priceFeedAddrSol: PublicKey,
  interval: number,
  simulate: boolean = true
) {
  const instruction = initializeGameInstruction(
    program,
    authority.publicKey,
    protocolAddress,
    tokenAddress,
    SOL_feedId,
    priceFeedAddrSol,
    interval
  );

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

async function main() {
  // process arguments
  const args = process.argv.slice(2);
  let simulate;
  if (args[0] == "false") {
    simulate = false;
  } else {
    simulate = true;
  }
  console.log(TOKEN_PROGRAM_ID.toBase58());

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
  const tx = await initializeGame(
    program,
    provider,
    authority,
    protocolAddress,
    tokenAddress,
    SOL_feedId,
    priceFeedAddrSol,
    DEFAULT_ROUND_INTERVAL
  );
  console.log("Game initialized: ", tx);
}

main();
