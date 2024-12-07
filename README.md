# BullBear Game: A Price Prediction Game on Solana

## Description

### Overview
BullBear Game is an exciting and strategic price prediction game built on the Solana blockchain. It allows players to predict the price movement of their favorite cryptocurrencies over a set period and win rewards. The game leverages the Pyth Oracle network for real-time price feeds and supports SPL tokens for betting and rewards.

---

### How to Play the BullBear Game

1. **Round Initialization:**
   - The game creator sets up the parameters:
     - **Cryptocurrency**: The token for price prediction (e.g., SOL).
     - **Bet Token**: The SPL token used for placing bets and paying rewards.
     - **Round Interval**: The duration of the round.
   - When the round starts, the current price of the selected cryptocurrency is recorded as `start_price`, and the `start_time` is noted.

2. **Betting Phase:**
   - The betting phase is **open** at the start of the round.
   - Players place bets predicting the price movement of the selected cryptocurrency at `end_time` (`start_time + round_interval`):
     - **Bull**: Predicting the price will go **up**.
     - **Bear**: Predicting the price will go **down**.
   - Bets can only be placed during the first half of the interval.

3. **Betting Closes:**
   - Once half of the round interval has passed, the betting phase is **closed**. No more bets are accepted for the ongoing round.

4. **Outcome Determination:**
   - At `end_time`, the price of the cryptocurrency is observed as `end_price`.
   - The price movement is evaluated:
     - If `end_price` > `start_price`: **Up**.
     - If `end_price` < `start_price`: **Down**.
     - If `end_price` == `start_price`: **No change**.

5. **Winners and Protocol Rules:**
   - Players who predicted the price movement correctly are the **winners**.
   - If there is no price change, the protocol wins, and all funds are transferred to the game vault.

6. **Claiming Rewards:**
   - After the round ends, winners can claim their rewards from the prize pool.
   - Each winner's reward is proportional to their bet amount compared to the total bet amount on the winning side.

## Features and Customization
- **Custom Cryptocurrencies**: Choose any token with a price feed on the Pyth Oracle network.
- **Flexible Betting Tokens**: Use any SPL token for betting and rewards.
- **Dynamic Intervals**: Define custom time intervals for each game round.



The BullBear Game combines blockchain transparency with the thrill of market prediction, creating a fair and engaging experience for all players. Predict, bet, and claim your winnings—are you ready to take on the market?

---

## Program Structure

The program is structured as follows:

### **States**
#### Protocol
- **Authority**: Public key of the protocol administrator.  
- **Game Creation Fee**: Fee for creating a game.

#### Game
- **Protocol**: Public key of the associated protocol.  
- **Game Authority**: Public key of the game creator.  
- **Round Counter**: Tracks the number of rounds.  
- **Round Interval**: Duration of each round.  
- **Price Feed ID**: Identifier for the Pyth Oracle price feed.  
- **Vault Address**: Public key of the vault for game funds.  
- **Token Address**: Public key of the SPL token used for bets and rewards.

#### Rounds
- **Game**: Public key of the associated game.  
- **Start Time**: Timestamp when the round starts.  
- **End Time**: Timestamp when the round ends.  
- **Start Price**: Price of the token at the start of the round.  
- **End Price**: Price of the token at the end of the round.  
- **Total Bets Up**: Total amount bet on the price going up.  
- **Total Bets Down**: Total amount bet on the price going down.  
- **Betting Status**: Current status of betting (`Open`, `Closed`).  
- **Round Result**: Outcome of the round (`Up`, `Down`, `No Change`).  
- **Round Status**: Current round state (`Active`, `Ended`).  
- **Number of Bets**: Total number of bets placed.

#### Bets
- **Player**: Public key of the player.  
- **Round**: Public key of the associated round.  
- **Prediction**: Player's prediction (`Up`, `Down`).  
- **Amount**: Bet amount.  
- **Claimed**: Whether the prize has been claimed.

### **Instructions**
- `initialize_protocol`: Sets up the protocol.  
- `initialize_game`: Creates a new game under the protocol.  
- `initialize_round`: Prepares a new round for a game.  
- `start_round`: Starts the betting phase.  
- `place_bet`: Allows players to place their bets.  
- `close_betting`: Closes the betting phase.  
- `end_round`: Ends the round and determines the result.  
- `claim_prize`: Allows winners to claim their prize.  
- `withdraw_funds`: Game authority can withdraw funds from the vault.  
- `test_feed`: Test the price feed information.

### **Roles**
#### Protocol Authority
- Initializes the protocol.  
- Claims the game creation fee.

#### Game Authority (Anyone)
- Initializes games and rounds.  
- Starts and ends rounds.  
- Closes betting.  
- Withdraws funds from the game vault.

#### Player
- Places bets during the betting phase.  
- Claims prizes after the round ends.

### **Conditions**
- Rounds can only be started once.  
- Each player is limited to one bet per round.  
- Bets cannot be placed after the betting period closes.  
- Bets can only be placed on active rounds.  
- Only winners can claim prizes.  
- Prizes can only be claimed once.

---

## Installation & Usage

### Setup
For this Program you need:
- [Rust installed](https://www.rust-lang.org/tools/install)
    - Make sure to use stable version:
    ```bash
    rustup default stable
    ```
- [Solana installed](https://docs.solana.com/cli/install-solana-cli-tools)
    - Use v1.18.18
    - After you have Solana-CLI installed, you can switch between versions using:
    ```bash
    solana-install init 1.18.18
    ```

- [Anchor installed](https://www.anchor-lang.com/docs/installation)
    - Use v0.30.1
    - After you have Anchor installed, you can switch between versions using:
    ```bash
    avm use 0.30.1
    ```

### Install
With the setup described above, you should be able to run the following commands.

You should have **Yarn** installed as it is one of the steps during **Anchor** installation, so once you clone the repo, you should be able to run:
```
yarn install
```

To build the project, run:
```
anchor build
```

### Test

To test the project, run:
```
anchor test
```
To run individual tests, comment out the other test functions in the `test.ts` file.

### Deploying to Devnet

To check you active keys, run:
```
anchor keys list
```

If the keys do not match the program id in  `Anchor.toml`, you can sync the keys using:
```
anchor keys sync
```

To deploy the program to devnet, run:
```
anchor deploy --provider.cluster Devnet
```

#### Deployment on Devnet

https://explorer.solana.com/address/9uXBFpbqUohLxpQecPKtiDA8s8cLRU5HucTnDT9jaFJW?cluster=devnet

### Instructions

To initialize the protocol, run:
```
anchor run init --provider.cluster Devnet 
```

Transaction: https://explorer.solana.com/tx/HZkeNc8mfKak7G7BETEB6S2yompMWiF9YQrXdjmu6PNbEzFA1WQCPbQnmfGAT8tz3GK4TQ6U5CAhy4wwGdRU81L?cluster=devnet


To test the price feed from the Pyth Oracle, run:
```
anchor run test_price_feed --provider.cluster Devnet 
```
