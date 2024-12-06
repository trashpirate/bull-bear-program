import * as anchor from "@coral-xyz/anchor";

import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import * as splToken from "@solana/spl-token";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

import { SOL_feedId } from "./config";

/*//////////////////////////////////////////////////////////////
                              INSTRUCTIONS
//////////////////////////////////////////////////////////////*/

export async function initializeProtocol(
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

  return protocolPDA;
}

export async function initializeGame(
  program: any,
  game_authority: any,
  protocolPDA: any,
  roundInterval: number,
  tokenAddress: any
) {
  const gamePDA = await getGamePDA(
    program,
    game_authority,
    protocolPDA,
    tokenAddress,
    roundInterval
  );
  const gameVaultPDA = splToken.getAssociatedTokenAddressSync(
    tokenAddress,
    gamePDA,
    true
  );
  await program.methods
    .initializeNewGame(new anchor.BN(roundInterval), SOL_feedId)
    .accounts({
      gameAuthority: game_authority.publicKey,
      protocol: protocolPDA,
      game: gamePDA,
      mint: tokenAddress,
      vault: gameVaultPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: splToken.TOKEN_PROGRAM_ID,
      associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([game_authority])
    .rpc({ commitment: "confirmed" });

  return [gamePDA, gameVaultPDA];
}

export async function initializeRound(
  program: any,
  signer: any,
  gamePDA: any,
  tokenAddress: any
) {
  const pda = await getRoundPDA(program, gamePDA);
  const vault = splToken.getAssociatedTokenAddressSync(tokenAddress, pda, true);

  const tx = await program.methods
    .initializeNewRound()
    .accounts({
      gameAuthority: signer.publicKey,
      game: gamePDA,
      round: pda,
      mint: tokenAddress,
      vault: vault,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: splToken.TOKEN_PROGRAM_ID,
      associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([signer])
    .rpc({ commitment: "confirmed" });

  return [pda, vault];
}

export async function startRound(
  program: any,
  signer: any,
  gamePDA: any,
  roundPDA: any,
  priceFeedAddrSol: any
) {
  const tx = // start round
    await program.methods
      .startCurrentRound()
      .accounts({
        gameAuthority: signer.publicKey,
        game: gamePDA,
        round: roundPDA,
        priceUpdate: priceFeedAddrSol,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([signer])
      .rpc({ commitment: "confirmed" });
  return tx;
}

export async function placeBet(
  program: any,
  gamePDA: any,
  roundPDA: any,
  roundVaultPDA: any,
  tokenAddress: any,
  signer: any,
  signerTokenAccount: any,
  prediction: any,
  amount: number
) {
  // generate bet PDA
  const betPDA = await getBetPDA(program, roundPDA, signer);

  const tx_bet = await program.methods
    .placeNewBet(prediction, new anchor.BN(amount))
    .accounts({
      player: signer.publicKey,
      game: gamePDA,
      round: roundPDA,
      bet: betPDA,
      mint: tokenAddress,
      vault: roundVaultPDA,
      signerVault: signerTokenAccount.address,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: splToken.TOKEN_PROGRAM_ID,
      associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([signer])
    .rpc({ commitment: "confirmed" });
  return betPDA;
}

export async function closeBetting(
  program: any,
  signer: any,
  gamePDA: any,
  roundPDA: any
) {
  const tx = // start round
    await program.methods
      .closeBettingPhase()
      .accounts({
        gameAuthority: signer.publicKey,
        game: gamePDA,
        round: roundPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([signer])
      .rpc({ commitment: "confirmed" });
  return tx;
}

export async function endRound(
  program: any,
  signer: any,
  gamePDA: any,
  roundPDA: any,
  gameVaultPDA: any,
  roundVaultPDA: any,
  tokenAddress: any,
  priceFeedAddr: any
) {
  const tx = await program.methods
    .endCurrentRound()
    .accounts({
      gameAuthority: signer.publicKey,
      game: gamePDA,
      round: roundPDA,
      priceUpdate: priceFeedAddr,
      mint: tokenAddress,
      round_vault: roundVaultPDA,
      game_vault: gameVaultPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: splToken.TOKEN_PROGRAM_ID,
      associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([signer])
    .rpc({ commitment: "confirmed" });
  return tx;
}

export async function claimPrize(
  program: any,
  signer: any,
  gamePDA: any,
  roundPDA: any,
  betPDA: any,
  tokenAddress: any,
  roundVaultPDA: any,
  playerTokenAccount: any
) {
  const tx = await program.methods
    .claimUnclaimedPrize()
    .accounts({
      player: signer.publicKey,
      game: gamePDA,
      round: roundPDA,
      bet: betPDA,
      mint: tokenAddress,
      vault: roundVaultPDA,
      signerVault: playerTokenAccount.address,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: splToken.TOKEN_PROGRAM_ID,
      associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([signer])
    .rpc({ commitment: "confirmed" });
  return tx;
}

export async function withdrawFunds(
  program: any,
  signer: any,
  gamePDA: any,
  gameVaultPDA: any,
  tokenAddress: any,
  signerTokenAccount: any
) {
  const tx = await program.methods
    .withdrawGameFunds()
    .accounts({
      gameAuthority: signer.publicKey,
      game: gamePDA,
      mint: tokenAddress,
      vault: gameVaultPDA,
      signerVault: signerTokenAccount.address,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: splToken.TOKEN_PROGRAM_ID,
      associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([signer])
    .rpc({ commitment: "confirmed" });
  return tx;
}

export async function updateFeed(
  program: any,
  game_authority: any,
  protocolPDA: any,
  gamePDA: any,
  priceFeedId: any
) {
  await program.methods
    .updatePriceFeed(priceFeedId)
    .accounts({
      gameAuthority: game_authority.publicKey,
      protocol: protocolPDA,
      game: gamePDA,
    })
    .signers([game_authority])
    .rpc({ commitment: "confirmed" });

  return gamePDA;
}

/*//////////////////////////////////////////////////////////////
                              PDA ACCOUNTS
//////////////////////////////////////////////////////////////*/
export async function getProtocolPDA(program: any, authority: any) {
  const [pda, bump] = await PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("PROTOCOL_SEED"),
      authority.publicKey.toBuffer(),
    ],
    program.programId
  );

  return pda;
}

export async function getGamePDA(
  program: any,
  authority: any,
  protocolPDA: any,
  tokenAddress: any,
  roundInterval: number = 0
) {
  const buffer64 = Buffer.alloc(8);
  buffer64.writeBigUint64LE(BigInt(roundInterval), 0);
  const [pda, bump] = await PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("GAME_SEED"),
      authority.publicKey.toBuffer(),
      protocolPDA.toBuffer(),
      buffer64,
      tokenAddress.toBuffer(),
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
    [anchor.utils.bytes.utf8.encode("ROUND_SEED"), game_pda.toBuffer(), buffer],
    program.programId
  );

  return pda;
}

export async function getBetPDA(program: any, round_pda: any, player: any) {
  const [pda, bump] = await PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("BET_SEED"),
      player.publicKey.toBuffer(),
      round_pda.toBuffer(),
    ],
    program.programId
  );

  return pda;
}

/*//////////////////////////////////////////////////////////////
                                HELPERS
//////////////////////////////////////////////////////////////*/

export async function airdrop(
  connection: any,
  address: any,
  amount = 10000000000000
) {
  await connection.confirmTransaction(
    await connection.requestAirdrop(address, amount),
    "confirmed"
  );
}

export async function getToken(provider) {
  // Create a new token mint
  const mintAuthority = Keypair.generate();
  await airdrop(provider.connection, mintAuthority.publicKey);

  const tokenAddress = await createMint(
    provider.connection,
    mintAuthority, // The payer for transaction fees
    mintAuthority.publicKey, // Mint authority
    null, // Freeze authority (optional)
    9 // Decimals
  );

  return { address: tokenAddress, authority: mintAuthority };
}

export async function getTokenAccount(
  connection: any,
  mint: any,
  mintAuthority: any,
  account: any,
  amount = BigInt(1000000 * 10 ** 9)
) {
  const userTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    mintAuthority,
    mint,
    account.publicKey
  );

  await mintTo(
    connection,
    mintAuthority,
    mint,
    userTokenAccount.address,
    mintAuthority,
    amount
  );

  return userTokenAccount;
}

export function getFeedIdFromHex(hexString: string): Uint8Array {
  const buffer = Buffer.alloc(32); // Create a 32-byte buffer (zero-padded by default)
  const hexBuffer = Buffer.from(hexString, "hex"); // Convert hex string to bytes
  hexBuffer.copy(buffer, 0, 0, Math.min(hexBuffer.length, 32)); // Copy to 32-byte buffer
  return new Uint8Array(buffer);
}

export async function warpToSlot(provider: any, slot: number) {
  const payer = provider.wallet.payer; // Your test payer account
  const receiver = Keypair.generate().publicKey; // Dummy recipient account

  for (let index = 0; index < slot; index++) {
    // Create a transaction that sends 0 SOL
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: receiver,
        lamports: 0, // Sending 0 lamports
      })
    );
    // Send the transaction
    const signature = await provider.sendAndConfirm(tx);
  }
}
