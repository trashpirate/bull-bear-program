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
import { MockPythPull } from "../target/types/mock_pyth_pull";
import { Wallet } from "@coral-xyz/anchor";
import { pullOracleClient } from "./mock_oracle";
import { confirmTransaction } from "@solana-developers/helpers";

const oracle = anchor.workspace.MockPythPull as anchor.Program<MockPythPull>;

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
  tokenAddress: any,
  priceFeed: any
) {
  const gamePDA = await getGamePDA(
    program,
    game_authority,
    protocolPDA,
    tokenAddress,
    priceFeed
  );
  const gameVaultPDA = splToken.getAssociatedTokenAddressSync(
    tokenAddress,
    gamePDA,
    true
  );
  await program.methods
    .initializeNewGame(new anchor.BN(roundInterval), SOL_feedId, priceFeed)
    .accounts({
      gameAuthority: game_authority.publicKey,
      protocol: protocolPDA,
      game: gamePDA,
      mint: tokenAddress,
      vault: gameVaultPDA,
      tokenProgram: splToken.TOKEN_PROGRAM_ID,
      associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
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
      tokenProgram: splToken.TOKEN_PROGRAM_ID,
      associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
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
  priceFeed: any
) {
  const tx = // start round
    await program.methods
      .startCurrentRound()
      .accounts({
        gameAuthority: signer.publicKey,
        game: gamePDA,
        round: roundPDA,
        priceUpdate: priceFeed,
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
      tokenProgram: splToken.TOKEN_PROGRAM_ID,
      associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
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
  priceFeed: any
) {
  const tx = await program.methods
    .endCurrentRound()
    .accounts({
      gameAuthority: signer.publicKey,
      game: gamePDA,
      round: roundPDA,
      priceUpdate: priceFeed,
      mint: tokenAddress,
      round_vault: roundVaultPDA,
      game_vault: gameVaultPDA,
      tokenProgram: splToken.TOKEN_PROGRAM_ID,
      associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
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
      tokenProgram: splToken.TOKEN_PROGRAM_ID,
      associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
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
      tokenProgram: splToken.TOKEN_PROGRAM_ID,
      associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([signer])
    .rpc({ commitment: "confirmed" });
  return tx;
}
export async function updateInterval(
  program: any,
  signer: any,
  gamePDA: any,
  interval: number
) {
  const tx = await program.methods
    .updateRoundInterval(new anchor.BN(interval))
    .accounts({
      gameAuthority: signer.publicKey,
      game: gamePDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([signer])
    .rpc({ commitment: "confirmed" });
  return tx;
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
  priceFeed: any
) {
  const [pda, bump] = await PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("GAME_SEED"),
      authority.publicKey.toBuffer(),
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

export async function getOracle(provider) {
  const wallet = provider.wallet as Wallet;

  // program
  let pullOracle: pullOracleClient = new pullOracleClient({
    provider: provider,
    wallet: wallet,
    program: oracle,
  });

  const [txId, priceFeed] = await pullOracle.createOracle(
    SOL_feedId,
    100,
    100,
    -9
  );

  await confirmTransaction(provider.connection, txId);

  // console.log("priceFeed", priceFeed.toBase58());

  return { pullOracle: pullOracle, feed: priceFeed };
}

export async function setOraclePrice(
  provider: any,
  pullOracle: any,
  priceFeed: PublicKey,
  price: number
) {
  const tx = await pullOracle.setPrice(priceFeed, price, -9, 1.5);
  await confirmTransaction(provider.connection, tx);
  // console.log("set price", tx);
  return tx;
}
