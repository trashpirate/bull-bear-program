import { testClaimPrize } from "./instructions/claim_prize";
import { testCloseBetting } from "./instructions/close_betting";
import { testEndRound } from "./instructions/end_round";
import { testInitializeGame } from "./instructions/initialize_game";
import { testInitializeProtocol } from "./instructions/initialize_protocol";
import { testInitializeRound } from "./instructions/initialize_round";
import { testPlaceBet } from "./instructions/place_bet";
import { testStartRound } from "./instructions/start_round";
import { testTestPriceFeed } from "./instructions/test_price_feed";
import { testWithdrawFunds } from "./instructions/withdraw_funds";

// Consolidate all tests
describe("BullBear Program", () => {
  testInitializeProtocol();
  // testTestPriceFeed();
  // testInitializeGame();
  // testInitializeRound();
  // testStartRound();
  // testPlaceBet();
  // testCloseBetting();
  // testEndRound();
  // testClaimPrize();
  // testWithdrawFunds();
});
