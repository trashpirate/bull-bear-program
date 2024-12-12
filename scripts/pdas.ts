import { Connection, PublicKey } from "@solana/web3.js";
import {
  Program,
  AnchorProvider,
  web3,
  utils,
  BN,
  setProvider,
} from "@coral-xyz/anchor";

export async function fetchPdaDataRaw(connection: Connection, pda: PublicKey) {
  const accountInfo = await connection.getAccountInfo(pda);

  if (accountInfo === null) {
    throw new Error("Account not found");
  }

  return accountInfo.data;
}

export async function getProtocolPDA(program: any, authority: any) {
  const [pda, bump] = await PublicKey.findProgramAddressSync(
    [utils.bytes.utf8.encode("PROTOCOL_SEED"), authority.publicKey.toBuffer()],
    program.programId
  );

  return pda;
}

export async function getGamePDA(
  program: any,
  authority: any,
  protocolPDA: any,
  tokenAddress: any,
  priceFeed: any
) {
  const [pda, bump] = await PublicKey.findProgramAddressSync(
    [
      utils.bytes.utf8.encode("GAME_SEED"),
      authority.toBuffer(),
      protocolPDA.toBuffer(),
      tokenAddress.toBuffer(),
      priceFeed.toBuffer(),
    ],
    program.programId
  );

  return pda;
}

export async function getRoundPDA(
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
    [utils.bytes.utf8.encode("ROUND_SEED"), game_pda.toBuffer(), buffer],
    program.programId
  );

  return pda;
}

export async function getBetPDA(program: any, round_pda: any, player: any) {
  const [pda, bump] = await PublicKey.findProgramAddressSync(
    [
      utils.bytes.utf8.encode("BET_SEED"),
      player.toBuffer(),
      round_pda.toBuffer(),
    ],
    program.programId
  );

  return pda;
}
