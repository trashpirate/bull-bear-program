import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BullBearProgram } from "../../target/types/bull_bear_program";
import { expect } from "chai";
import * as splToken from "@solana/spl-token";
import { INTERVAL, SLOT_OFFSET, FEE } from "../config";
import {
  airdrop,
  getOracle,
  getToken,
  getTokenAccount,
  initializeGame,
  initializeProtocol,
  updateInterval,
} from "../helpers";
import { pullOracleClient } from "../mock_oracle";

describe("Update Interval", () => {
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
  });

  it("should be able to update round interval", async () => {
    const newInterval = 3600;
    const tx = await updateInterval(
      program,
      game_authority,
      gamePDA,
      newInterval
    );

    // check program counter
    const gameInterval = (await program.account.game.fetch(gamePDA))
      .roundInterval;
    expect(gameInterval.toNumber()).to.equal(newInterval);
  });

  it("should not allow non-authority to update interval", async () => {
    try {
      const newInterval = 3600;
      await updateInterval(program, player, gamePDA, newInterval);

      expect.fail("Player should not be able to update interval.");
    } catch (_err) {
      const err = anchor.AnchorError.parse(_err.logs);
      expect(err.error.errorCode.code).to.equal("ConstraintSeeds");
    }
  });
});
