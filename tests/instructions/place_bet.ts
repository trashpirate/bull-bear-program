import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SendTransactionError } from "@solana/web3.js";
import { BullBearProgram } from "../../target/types/bull_bear_program";
import { assert, expect } from "chai";
import * as splToken from "@solana/spl-token";

import { priceFeedAddrSol, INTERVAL, SLOT_OFFSET, FEE } from "../config";
import {
  airdrop,
  closeBetting,
  getToken,
  getTokenAccount,
  initializeGame,
  initializeProtocol,
  initializeRound,
  placeBet,
  startRound,
  warpToSlot,
} from "../helpers";
import { approve, getAccount } from "@solana/spl-token";

export function testPlaceBet() {
  // provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // program
  const program = anchor.workspace.BullBearProgram as Program<BullBearProgram>;

  let authority: Keypair;
  let game_authority: Keypair;
  let player: Keypair;
  let roundInterval: number;
  let slot_offset: number;
  let protocolPDA: PublicKey;
  let game_fee: number;
  let tokenAddress: PublicKey;
  let playerTokenAccount: splToken.Account;
  let gameAuthorityTokenAccount: splToken.Account;
  let gamePDA: PublicKey;
  let gameVaultPDA: PublicKey;
  let roundPDA: PublicKey;
  let roundVaultPDA: PublicKey;
  beforeEach("Setup", async () => {
    // Generate keypairs
    authority = anchor.web3.Keypair.generate();
    game_authority = anchor.web3.Keypair.generate();
    player = anchor.web3.Keypair.generate();

    // Fund accounts
    await airdrop(provider.connection, authority.publicKey);
    await airdrop(provider.connection, game_authority.publicKey);
    await airdrop(provider.connection, player.publicKey);

    // create token accounts
    const token = await getToken(provider);
    tokenAddress = token.address;

    playerTokenAccount = await getTokenAccount(
      provider.connection,
      tokenAddress,
      token.authority,
      player
    );

    gameAuthorityTokenAccount = await getTokenAccount(
      provider.connection,
      tokenAddress,
      token.authority,
      game_authority
    );

    // initialize parameters
    game_fee = FEE;
    roundInterval = INTERVAL;
    slot_offset = SLOT_OFFSET;

    // Initialize Protocol
    protocolPDA = await initializeProtocol(program, authority, game_fee);

    // Initialize Game
    [gamePDA, gameVaultPDA] = await initializeGame(
      program,
      game_authority,
      protocolPDA,
      roundInterval,
      tokenAddress
    );

    // initialize round
    [roundPDA, roundVaultPDA] = await initializeRound(
      program,
      game_authority,
      gamePDA,
      tokenAddress
    );

    // start round
    await startRound(
      program,
      game_authority,
      gamePDA,
      roundPDA,
      priceFeedAddrSol
    );

    // fund player account
    const playerBalance = (
      await getAccount(provider.connection, playerTokenAccount.address)
    ).amount;

    // approve tokens
    await approve(
      provider.connection,
      player,
      playerTokenAccount.address,
      roundVaultPDA,
      player, // Signer of the transaction
      playerBalance
    );
  });

  describe("Betting", () => {
    it("should allow a player to place a valid bet on an active round", async () => {
      // get player balance
      const playerInitialBalance = (
        await getAccount(provider.connection, playerTokenAccount.address)
      ).amount;

      // place bet
      const prediction = { down: {} };
      const amount = 100 * 10 ** 9;
      const betPDA = await placeBet(
        program,
        gamePDA,
        roundPDA,
        roundVaultPDA,
        tokenAddress,
        player,
        playerTokenAccount,
        prediction,
        amount
      );

      const betPrediction = (await program.account.bet.fetch(betPDA))
        .prediction;
      expect(Object.keys(betPrediction)[0].toString()).to.equal("down");

      const totalBetsDown = (await program.account.round.fetch(roundPDA))
        .totalDown;
      expect(totalBetsDown.toString()).to.equal(
        new anchor.BN(amount).toString()
      );

      const playerNewBalance = (
        await getAccount(provider.connection, playerTokenAccount.address)
      ).amount;
      const vaultBalance = (
        await getAccount(provider.connection, roundVaultPDA)
      ).amount;

      expect(vaultBalance).to.equal(BigInt(amount));
      expect(playerNewBalance).to.equal(playerInitialBalance - BigInt(amount));
    });

    it("should not allow a player to update their bet", async () => {
      // place bet
      const prediction = { down: {} };
      const amount = 100 * 10 ** 9;
      const betPDA = await placeBet(
        program,
        gamePDA,
        roundPDA,
        roundVaultPDA,
        tokenAddress,
        player,
        playerTokenAccount,
        prediction,
        amount
      );

      // update bet
      const newPrediction = { down: {} };
      const newAmount = 500 * 10 ** 9;
      try {
        await placeBet(
          program,
          gamePDA,
          roundPDA,
          roundVaultPDA,
          tokenAddress,
          player,
          playerTokenAccount,
          newPrediction,
          newAmount
        );

        expect.fail("User should not be able to update bet");
      } catch (err) {
        if (err instanceof SendTransactionError) {
          assert.include(err.message, "already in use");
        } else {
          console.error("Unexpected Error:", err);
          assert.fail("Unexpected error during transaction.");
        }
      }
    });

    it("should not allow bets on a closed round", async () => {
      // warp by 5 slots -> increase timestamp by 2 seconds
      await warpToSlot(provider, 2);

      // close betting
      await closeBetting(program, game_authority, gamePDA, roundPDA);

      // try place bet
      let prediction = { down: {} };
      let amount = 100 * 10 ** 9;
      try {
        await placeBet(
          program,
          gamePDA,
          roundPDA,
          roundVaultPDA,
          tokenAddress,
          player,
          playerTokenAccount,
          prediction,
          amount
        );
        expect.fail("Player should not be able to place bet.");
      } catch (_err) {
        const err = anchor.AnchorError.parse(_err.logs);
        expect(err.error.errorCode.code).to.equal("BettingIsClosed");
      }
    });
  });
}

if (require.main === module) {
  const mocha = require("mocha");
  mocha.run(() => testPlaceBet());
}
