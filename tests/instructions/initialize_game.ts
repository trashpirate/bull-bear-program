import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BullBearProgram } from "../../target/types/bull_bear_program";
import { assert, expect } from "chai";
import * as splToken from "@solana/spl-token";

import { SOL_feedId, WIF_feedId, INTERVAL, SLOT_OFFSET, FEE } from "../config";
import {
  airdrop,
  getFeedIdFromHex,
  getToken,
  getTokenAccount,
  initializeGame,
  initializeProtocol,
  updateFeed,
} from "../helpers";

describe("Intialize Game", () => {
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
  });

  describe("Game Initialization", () => {
    let gamePDA: PublicKey;
    let gameVaultPDA: PublicKey;
    it("should initialize the game with correct authority and initial state", async () => {
      // Check initial balances
      const initialGameAuthorityBalance = await provider.connection.getBalance(
        game_authority.publicKey
      );
      const initialProtocolBalance = await provider.connection.getBalance(
        protocolPDA
      );

      // Initialize Game
      [gamePDA, gameVaultPDA] = await initializeGame(
        program,
        game_authority,
        protocolPDA,
        roundInterval,
        tokenAddress
      );

      // check protocol
      const protocolAddr = (await program.account.game.fetch(gamePDA)).protocol;
      expect(protocolAddr.toString()).to.equal(protocolPDA.toString());

      // check program counter
      const programCounter = (await program.account.game.fetch(gamePDA))
        .counter;
      expect(programCounter).to.equal(0);

      // check game authority
      const gameAuthority = (await program.account.game.fetch(gamePDA))
        .gameAuthority;
      expect(gameAuthority.toString()).to.equal(
        game_authority.publicKey.toString()
      );

      // check round interval
      const gameRoundInterval = (await program.account.game.fetch(gamePDA))
        .roundInterval;
      expect(gameRoundInterval.toNumber()).to.equal(roundInterval);

      // check price feed
      const priceFeed = (await program.account.game.fetch(gamePDA)).feedId;
      const expectedPriceFeed = getFeedIdFromHex(SOL_feedId);
      expect(priceFeed.toString()).to.equal(expectedPriceFeed.toString());

      // Check final balances
      const finalGameAuthorityBalance = await provider.connection.getBalance(
        game_authority.publicKey
      );
      const finalProtocolBalance = await provider.connection.getBalance(
        protocolPDA
      );

      // Assert the fee transfer
      assert.isAtMost(
        finalGameAuthorityBalance,
        initialGameAuthorityBalance - game_fee
      );
      assert.equal(
        finalProtocolBalance,
        initialProtocolBalance + game_fee,
        "Protocol balance mismatch"
      );
    });

    it("should update price feed", async () => {
      // Initialize Game
      [gamePDA, gameVaultPDA] = await initializeGame(
        program,
        game_authority,
        protocolPDA,
        roundInterval,
        tokenAddress
      );

      // updated Feed
      await updateFeed(
        program,
        game_authority,
        protocolPDA,
        gamePDA,
        WIF_feedId
      );

      // check price feed
      const priceFeed = (await program.account.game.fetch(gamePDA)).feedId;
      const expectedPriceFeed = getFeedIdFromHex(WIF_feedId);
      expect(priceFeed.toString()).to.equal(expectedPriceFeed.toString());
    });
  });
});
