import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BullBearProgram } from "../../target/types/bull_bear_program";
import { expect } from "chai";
import * as splToken from "@solana/spl-token";

import {
  priceFeedAddrSol,
  INTERVAL,
  SLOT_OFFSET,
  FEE,
  WIF_feedId,
  priceFeedAddrWif,
} from "../config";
import {
  airdrop,
  closeBetting,
  endRound,
  getToken,
  getTokenAccount,
  initializeGame,
  initializeProtocol,
  initializeRound,
  placeBet,
  startRound,
  updateFeed,
  warpToSlot,
} from "../helpers";
import { getAccount } from "@solana/spl-token";

export function testEndRound() {
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
  });

  describe("Ending a Round", () => {
    it("should allow authority to end a round and calculate results", async () => {
      // warp by 10 slots -> increase timestamp by 4 seconds
      await warpToSlot(provider, slot_offset);

      // close betting
      await closeBetting(program, game_authority, gamePDA, roundPDA);

      // updated Feed
      await updateFeed(
        program,
        game_authority,
        protocolPDA,
        gamePDA,
        WIF_feedId
      );

      // end round
      const tx = await endRound(
        program,
        game_authority,
        gamePDA,
        roundPDA,
        gameVaultPDA,
        roundVaultPDA,
        tokenAddress,
        priceFeedAddrWif
      );

      // check end price
      const endPrice = (await program.account.round.fetch(roundPDA)).endPrice;
      expect(endPrice.toNumber()).to.be.greaterThan(0);

      // check round status
      const roundStatus = (await program.account.round.fetch(roundPDA)).status;
      expect(Object.keys(roundStatus)[0].toString()).to.equal("ended");

      // check result
      const roundResult = (await program.account.round.fetch(roundPDA)).result;
      expect(Object.keys(roundResult)[0].toString()).to.equal("down");

      // check game counter
      const roundNr = (await program.account.round.fetch(roundPDA)).roundNr;
      const gameCounter = (await program.account.game.fetch(gamePDA)).counter;
      expect(gameCounter).to.equal(roundNr + 1);
    });

    it("should sends funds to game vault if no change", async () => {
      const gameInitialBalance = (
        await getAccount(provider.connection, gameVaultPDA)
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

      // warp by 10 slots -> increase timestamp by 4 seconds
      await warpToSlot(provider, slot_offset);

      // close betting
      await closeBetting(program, game_authority, gamePDA, roundPDA);

      // end round
      const tx = await endRound(
        program,
        game_authority,
        gamePDA,
        roundPDA,
        gameVaultPDA,
        roundVaultPDA,
        tokenAddress,
        priceFeedAddrSol
      );

      // check round status
      const roundStatus = (await program.account.round.fetch(roundPDA)).status;
      expect(Object.keys(roundStatus)[0].toString()).to.equal("ended");

      // check result
      const roundResult = (await program.account.round.fetch(roundPDA)).result;
      expect(Object.keys(roundResult)[0].toString()).to.equal("noChange");

      // check game counter
      const roundNr = (await program.account.round.fetch(roundPDA)).roundNr;
      const gameCounter = (await program.account.game.fetch(gamePDA)).counter;
      expect(gameCounter).to.equal(roundNr + 1);

      const gameEndingBalance = (
        await getAccount(provider.connection, gameVaultPDA)
      ).amount;

      const receivedBalance = gameEndingBalance - gameInitialBalance;
      expect(Number(receivedBalance)).to.equal(amount);
    });

    it("should not allow non-authority to end a round", async () => {
      // warp by 10 slots -> increase timestamp by 4 seconds
      await warpToSlot(provider, slot_offset);

      // close betting
      await closeBetting(program, game_authority, gamePDA, roundPDA);

      // try to end round
      try {
        await endRound(
          program,
          player,
          gamePDA,
          roundPDA,
          gameVaultPDA,
          roundVaultPDA,
          tokenAddress,
          priceFeedAddrSol
        );
        expect.fail("Player should not be able to end round");
      } catch (_err) {
        const err = anchor.AnchorError.parse(_err.logs);
        expect(err.error.errorCode.code).to.equal("ConstraintSeeds");
      }
    });

    it("should prevent ending a round before betting is closed", async () => {
      // try to end round
      try {
        await endRound(
          program,
          game_authority,
          gamePDA,
          roundPDA,
          gameVaultPDA,
          roundVaultPDA,
          tokenAddress,
          priceFeedAddrSol
        );
        expect.fail("Round should not be ended before betting is closed");
      } catch (_err) {
        const err = anchor.AnchorError.parse(_err.logs);
        expect(err.error.errorCode.code).to.equal("BettingNeedsToBeClosed");
      }
    });

    it("should prevent ending a second time", async () => {
      // warp by 10 slots -> increase timestamp by 4 seconds
      await warpToSlot(provider, slot_offset);

      // close betting
      await closeBetting(program, game_authority, gamePDA, roundPDA);

      // end round
      const tx = await endRound(
        program,
        game_authority,
        gamePDA,
        roundPDA,
        gameVaultPDA,
        roundVaultPDA,
        tokenAddress,
        priceFeedAddrSol
      );

      // end again
      try {
        await endRound(
          program,
          game_authority,
          gamePDA,
          roundPDA,
          gameVaultPDA,
          roundVaultPDA,
          tokenAddress,
          priceFeedAddrSol
        );
        expect.fail("Ended round should not be ended");
      } catch (_err) {
        const err = anchor.AnchorError.parse(_err.logs);
        expect(err.error.errorCode.code).to.equal("ConstraintSeeds");
      }
    });
  });
}

if (require.main === module) {
  const mocha = require("mocha");
  mocha.run(() => testEndRound());
}
