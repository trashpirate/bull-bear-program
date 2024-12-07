import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BullBearProgram } from "../../target/types/bull_bear_program";
import { expect } from "chai";
import * as splToken from "@solana/spl-token";

import { INTERVAL, SLOT_OFFSET, FEE } from "../config";
import {
  airdrop,
  closeBetting,
  getOracle,
  getToken,
  getTokenAccount,
  initializeGame,
  initializeProtocol,
  initializeRound,
  setOraclePrice,
  startRound,
  warpToSlot,
} from "../helpers";
import { pullOracleClient } from "../mock_oracle";

describe("Close Betting", () => {
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
  let priceFeedAddr: PublicKey;
  let pullOracle: pullOracleClient;
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

    // setup oracle
    const oracle = await getOracle(provider);
    priceFeedAddr = oracle.feed;
    pullOracle = oracle.pullOracle;

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
      tokenAddress,
      priceFeedAddr
    );

    // initialize round
    [roundPDA, roundVaultPDA] = await initializeRound(
      program,
      game_authority,
      gamePDA,
      tokenAddress
    );

    // start round
    await startRound(program, game_authority, gamePDA, roundPDA, priceFeedAddr);
  });

  it("should allow authority to close betting for an active round", async () => {
    // warp by 10 slots -> increase timestamp by 4 seconds
    await warpToSlot(provider, slot_offset);

    // close betting
    const tx = await closeBetting(program, game_authority, gamePDA, roundPDA);

    // check betting status
    const bettingStatus = (await program.account.round.fetch(roundPDA)).betting;
    expect(Object.keys(bettingStatus)[0].toString()).to.equal("closed");
  });

  it("should not allow non-authority to close betting", async () => {
    try {
      await closeBetting(program, player, gamePDA, roundPDA);
      expect.fail("Player should not be able to close betting phase");
    } catch (_err) {
      const err = anchor.AnchorError.parse(_err.logs);
      expect(err.error.errorCode.code).to.equal("ConstraintSeeds");
    }
  });

  it("should not allow closing when already closed", async () => {
    // warp by 10 slots -> increase timestamp by 4 seconds
    await warpToSlot(provider, slot_offset);

    // close betting
    const tx = await closeBetting(program, game_authority, gamePDA, roundPDA);

    // close betting again
    try {
      await closeBetting(program, game_authority, gamePDA, roundPDA);
      expect.fail("Closed betting should not be closed again");
    } catch (_err) {
      const err = anchor.AnchorError.parse(_err.logs);
      expect(err.error.errorCode.code).to.equal("BettingIsClosed");
    }
  });
});
