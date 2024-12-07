import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BullBearProgram } from "../../target/types/bull_bear_program";
import { expect } from "chai";
import * as splToken from "@solana/spl-token";

import { INTERVAL, SLOT_OFFSET, FEE } from "../config";
import {
  airdrop,
  claimPrize,
  closeBetting,
  endRound,
  getOracle,
  getToken,
  getTokenAccount,
  initializeGame,
  initializeProtocol,
  initializeRound,
  placeBet,
  setOraclePrice,
  startRound,
  warpToSlot,
} from "../helpers";
import { approve, getAccount } from "@solana/spl-token";
import { pullOracleClient } from "../mock_oracle";

describe("Claim Prize", () => {
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
    await setOraclePrice(provider, pullOracle, priceFeedAddr, 60);

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

  it("should allow a winning player to claim their prize", async () => {
    // place bet
    const prediction = { bear: {} };
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

    // updated Feed
    await setOraclePrice(provider, pullOracle, priceFeedAddr, 30);

    // end round
    await endRound(
      program,
      game_authority,
      gamePDA,
      roundPDA,
      gameVaultPDA,
      roundVaultPDA,
      tokenAddress,
      priceFeedAddr
    );

    // get player balance
    const playerInitialBalance = (
      await getAccount(provider.connection, playerTokenAccount.address)
    ).amount;

    // claim prize
    const tx = await claimPrize(
      program,
      player,
      gamePDA,
      roundPDA,
      betPDA,
      tokenAddress,
      roundVaultPDA,
      playerTokenAccount
    );

    // check claimed status
    const betClaimed = (await program.account.bet.fetch(betPDA)).claimed;
    expect(betClaimed).to.equal(true);

    const playerNewBalance = (
      await getAccount(provider.connection, playerTokenAccount.address)
    ).amount;

    const prizeMoney = playerNewBalance - playerInitialBalance;
    expect(Number(prizeMoney)).to.equal(amount);
  });

  it("should not allow losers to claim a prize", async () => {
    // place bet
    const prediction = { bear: {} };
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

    // updated Feed
    await setOraclePrice(provider, pullOracle, priceFeedAddr, 100);

    // end round
    await endRound(
      program,
      game_authority,
      gamePDA,
      roundPDA,
      gameVaultPDA,
      roundVaultPDA,
      tokenAddress,
      priceFeedAddr
    );

    // claim prize
    try {
      await claimPrize(
        program,
        player,
        gamePDA,
        roundPDA,
        betPDA,
        tokenAddress,
        roundVaultPDA,
        playerTokenAccount
      );
      expect.fail("Loser should not be able to claim prize.");
    } catch (_err) {
      const err = anchor.AnchorError.parse(_err.logs);
      expect(err.error.errorCode.code).to.equal("NoPrizeClaimable");
    }
  });

  it("should not allow a player to claim their prize more than once", async () => {
    // place bet
    const prediction = { bear: {} };
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

    // updated Feed
    await setOraclePrice(provider, pullOracle, priceFeedAddr, 30);

    // end round
    await endRound(
      program,
      game_authority,
      gamePDA,
      roundPDA,
      gameVaultPDA,
      roundVaultPDA,
      tokenAddress,
      priceFeedAddr
    );

    // claim prize
    await claimPrize(
      program,
      player,
      gamePDA,
      roundPDA,
      betPDA,
      tokenAddress,
      roundVaultPDA,
      playerTokenAccount
    );

    // claim prize
    try {
      await claimPrize(
        program,
        player,
        gamePDA,
        roundPDA,
        betPDA,
        tokenAddress,
        roundVaultPDA,
        playerTokenAccount
      );
      expect.fail("Winner should not be able to claim twice");
    } catch (_err) {
      const err = anchor.AnchorError.parse(_err.logs);
      expect(err.error.errorCode.code).to.equal("PrizeAlreadyClaimed");
    }
  });

  it("should not allow prize claims for unfinished rounds", async () => {
    // place bet
    const prediction = { bear: {} };
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

    // claim prize
    try {
      await claimPrize(
        program,
        player,
        gamePDA,
        roundPDA,
        betPDA,
        tokenAddress,
        roundVaultPDA,
        playerTokenAccount
      );
      expect.fail("Winner should not be able to claim prize when round active");
    } catch (_err) {
      const err = anchor.AnchorError.parse(_err.logs);
      expect(err.error.errorCode.code).to.equal("CurrentRoundNotEnded");
    }
  });
});
