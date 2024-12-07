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
  withdrawFunds,
} from "../helpers";
import { getAccount } from "@solana/spl-token";
import { pullOracleClient } from "../mock_oracle";

describe("Withdraw Funds", () => {
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

    // place bet
    const prediction = { down: {} };
    const amount = 100 * 10 ** 9;
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
  });

  it("should allow authority to withdraw funds", async () => {
    // warp by 3 slots -> increase timestamp by 1.2 seconds
    await warpToSlot(provider, slot_offset);

    // close betting
    await closeBetting(program, game_authority, gamePDA, roundPDA);

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

    // check result
    const roundResult = (await program.account.round.fetch(roundPDA)).result;
    expect(Object.keys(roundResult)[0].toString()).to.equal("noChange");

    // get authority balance
    const authorityInitialBalance = (
      await getAccount(provider.connection, gameAuthorityTokenAccount.address)
    ).amount;
    const amount = (await getAccount(provider.connection, gameVaultPDA)).amount;

    // withdraw funds
    const tx = await withdrawFunds(
      program,
      game_authority,
      gamePDA,
      gameVaultPDA,
      tokenAddress,
      gameAuthorityTokenAccount
    );

    const authorityNewBalance = (
      await getAccount(provider.connection, gameAuthorityTokenAccount.address)
    ).amount;
    const funds = authorityNewBalance - authorityInitialBalance;
    expect(funds).to.equal(amount);
  });

  it("should not allow non-authority to withdraw", async () => {
    // warp by 3 slots -> increase timestamp by 1.2 seconds
    await warpToSlot(provider, slot_offset);

    // close betting
    await closeBetting(program, game_authority, gamePDA, roundPDA);

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

    // try to end round
    try {
      await withdrawFunds(
        program,
        player,
        gamePDA,
        gameVaultPDA,
        tokenAddress,
        playerTokenAccount
      );
      expect.fail("Player should not be able to withdraw");
    } catch (_err) {
      const err = anchor.AnchorError.parse(_err.logs);
      expect(err.error.errorCode.code).to.equal("ConstraintSeeds");
    }
  });
});
