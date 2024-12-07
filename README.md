# BullBear Game: A Price Prediction Game on Solana

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=for-the-badge)
![Node](https://img.shields.io/badge/node-v20.17.0-blue.svg?style=for-the-badge)
![NPM](https://img.shields.io/badge/npm-v10.8.3-blue?style=for-the-badge)
![Rust](https://img.shields.io/badge/Rust-v1.82.0-blue?style=for-the-badge)
![Anchor](https://img.shields.io/badge/Anchor-v0.30.1-blue?style=for-the-badge)
![Solana](https://img.shields.io/badge/Solana-v1.18.18-blue?style=for-the-badge)
[![License: MIT](https://img.shields.io/github/license/trashpirate/bull-bear-program.svg?style=for-the-badge)](https://github.com/trashpirate/bull-bear-program/blob/master/LICENSE)

[![Website: nadinaoates.com](https://img.shields.io/badge/Portfolio-00e0a7?style=for-the-badge&logo=Website)](https://nadinaoates.com)
[![LinkedIn: nadinaoates](https://img.shields.io/badge/LinkedIn-0a66c2?style=for-the-badge&logo=LinkedIn&logoColor=f5f5f5)](https://linkedin.com/in/nadinaoates)
[![Twitter: 0xTrashPirate](https://img.shields.io/badge/@0xTrashPirate-black?style=for-the-badge&logo=X)](https://twitter.com/0xTrashPirate)

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
     - **Bull**: Predicting the price will go **bull**.
     - **Bear**: Predicting the price will go **bear**.
   - Bets can only be placed during the first half of the interval.

3. **Betting Closes:**
   - Once half of the round interval has passed, the betting phase is **closed**. No more bets are accepted for the ongoing round.

4. **Outcome Determination:**
   - At `end_time`, the price of the cryptocurrency is observed as `end_price`.
   - The price movement is evaluated:
     - If `end_price` > `start_price`: **Bull**.
     - If `end_price` < `start_price`: **Bear**.
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
- **Total Bets Bull**: Total amount bet on the price going up.  
- **Total Bets Bear**: Total amount bet on the price going down.  
- **Betting Status**: Current status of betting (`Open`, `Closed`).  
- **Round Result**: Outcome of the round (`Bull`, `Bear`, `No Change`).  
- **Round Status**: Current round state (`Active`, `Ended`).  
- **Number of Bets**: Total number of bets placed.

#### Bets
- **Player**: Public key of the player.  
- **Round**: Public key of the associated round.  
- **Prediction**: Player's prediction (`Bull`, `Bear`).  
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
anchor deploy --program-name bull_bear_program --provider.cluster Devnet
```

#### Deployment on Devnet

https://explorer.solana.com/address/FKkP7JrUxzVYgZfgvb1J86SNuFmPAEtCURD6snMtcjPu?cluster=devnet

### Instructions

To initialize the protocol, run:
```
anchor run init --provider.cluster Devnet 
```

Transaction: https://explorer.solana.com/tx/445wEs3q3qKxTbFKvHbgiznemyqmqukoLK27wGuFEmLYu26F7mGPYBPcefVFye7jRezJNGnsqCst54Bu1tQKJuSf?cluster=devnet


To test the price feed from the Pyth Oracle, run:
```
anchor run test_price_feed --provider.cluster Devnet 
```


<!-- CONTRIBUTING -->

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<!-- LICENSE -->

## License

Distributed under the MIT License. See `LICENSE` for more information.

<!-- CONTACT -->

## Contact

Nadina Oates - [@0xTrashPirate](https://twitter.com/0xTrashPirate)

Main Repository: [https://github.com/trashpirate/flameling-queens](https://github.com/trashpirate/flameling-queens)

Project Link: [https://0x52.buyholdearn.com/](https://0x52.buyholdearn.com/)