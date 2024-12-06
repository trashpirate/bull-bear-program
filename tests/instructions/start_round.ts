import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BullBearProgram } from "../../target/types/bull_bear_program";
import { expect } from "chai";
import * as splToken from "@solana/spl-token";

import { priceFeedAddrSol, INTERVAL, SLOT_OFFSET, FEE } from "../config";
import {
  airdrop,
  getToken,
  getTokenAccount,
  initializeGame,
  initializeProtocol,
  initializeRound,
  startRound,
} from "../helpers";

describe("Start Round", () => {
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
  });

  describe("Starting a Round", () => {
    it("should allow authority to start a round with valid state", async () => {
      // start round
      const tx = await startRound(
        program,
        game_authority,
        gamePDA,
        roundPDA,
        priceFeedAddrSol
      );

      // check result status
      const result = (await program.account.round.fetch(roundPDA)).result;
      expect(Object.keys(result)[0].toString()).to.equal("none");

      const betting = (await program.account.round.fetch(roundPDA)).betting;
      expect(Object.keys(betting)[0].toString()).to.equal("open");

      const status = (await program.account.round.fetch(roundPDA)).status;
      expect(Object.keys(status)[0].toString()).to.equal("active");

      const startPrice = (await program.account.round.fetch(roundPDA))
        .startPrice;
      expect(startPrice.toNumber()).to.be.greaterThan(0);

      const startTime = (await program.account.round.fetch(roundPDA)).startTime;
      const transaction = await provider.connection.getTransaction(tx, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
      const actualTime = await provider.connection.getBlockTime(
        transaction.slot
      );
      expect(startTime.toString()).to.equal(
        new anchor.BN(actualTime).toString()
      );
    });

    it("should prevent starting a round more than once", async () => {
      // start round
      await startRound(
        program,
        game_authority,
        gamePDA,
        roundPDA,
        priceFeedAddrSol
      );

      // start second time
      try {
        await startRound(
          program,
          game_authority,
          gamePDA,
          roundPDA,
          priceFeedAddrSol
        );

        expect.fail("User should not be able to restart round.");
      } catch (_err) {
        const err = anchor.AnchorError.parse(_err.logs);
        expect(err.error.errorCode.code).to.equal("RoundAlreadyStarted");
      }
    });

    it("should not allow non-authority to start a round", async () => {
      try {
        await startRound(program, player, gamePDA, roundPDA, priceFeedAddrSol);
        expect.fail("Player should not be able to initialize round.");
      } catch (_err) {
        const err = anchor.AnchorError.parse(_err.logs);
        expect(err.error.errorCode.code).to.equal("ConstraintSeeds");
      }
    });
  });
});
