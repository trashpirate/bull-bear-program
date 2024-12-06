import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SendTransactionError } from "@solana/web3.js";
import { BullBearProgram } from "../../target/types/bull_bear_program";
import { assert, expect } from "chai";
import * as splToken from "@solana/spl-token";
import { INTERVAL, SLOT_OFFSET, FEE } from "../config";
import {
  airdrop,
  getToken,
  getTokenAccount,
  initializeGame,
  initializeProtocol,
  initializeRound,
} from "../helpers";

export function testInitializeRound() {
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
  });

  describe("Round Initialization", () => {
    let roundPDA: PublicKey;
    let roundVaultPDA: PublicKey;
    it("should initialize a round with correct game association and default state", async () => {
      [roundPDA, roundVaultPDA] = await initializeRound(
        program,
        game_authority,
        gamePDA,
        tokenAddress
      );

      // check program counter
      const programCounter = (await program.account.game.fetch(gamePDA))
        .counter;
      expect(programCounter).to.equal(0);

      // check linked game id
      const gameId = (await program.account.round.fetch(roundPDA)).game;
      expect(gameId.toString()).to.equal(gamePDA.toString());

      // check round number
      const roundNr = (await program.account.round.fetch(roundPDA)).roundNr;
      expect(roundNr).to.equal(0);

      // check betting status
      const betting = (await program.account.round.fetch(roundPDA)).betting;
      expect(Object.keys(betting)[0].toString()).to.equal("closed");

      // check round status
      const status = (await program.account.round.fetch(roundPDA)).status;
      expect(Object.keys(status)[0].toString()).to.equal("inactive");
    });

    it("should not allow non-authority to initialize a round", async () => {
      try {
        await initializeRound(program, player, gamePDA, tokenAddress);
        expect.fail("Player should not be able to initialize round.");
      } catch (_err) {
        const err = anchor.AnchorError.parse(_err.logs);
        expect(err.error.errorCode.code).to.equal("ConstraintSeeds");
      }
    });

    it("should prevent initializing multiple rounds for the same game", async () => {
      // initialize round
      [roundPDA, roundVaultPDA] = await initializeRound(
        program,
        game_authority,
        gamePDA,
        tokenAddress
      );

      // initialize round again
      try {
        await initializeRound(program, game_authority, gamePDA, tokenAddress);
        expect.fail("Player should not be able to initialize round.");
      } catch (err) {
        if (err instanceof SendTransactionError) {
          assert.include(err.message, "already in use");
        } else {
          console.error("Unexpected Error:", err);
          assert.fail("Unexpected error during transaction.");
        }
      }
    });
  });
}

if (require.main === module) {
  const mocha = require("mocha");
  mocha.run(() => testInitializeRound());
}
