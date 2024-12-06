use anchor_lang::prelude::*;

#[error_code]
pub enum BullBearProgramError {
    #[msg("Signer is not authorized.")]
    SignerNotAuthorized,
    #[msg("Current round has not ended.")]
    CurrentRoundNotEnded,
    #[msg("Round is not active.")]
    RoundNotActive,
    #[msg("Betting is closed.")]
    BettingIsClosed,
    #[msg("Betting phase cannot be closed yet.")]
    BettingPhaseNotEnded,
    #[msg("Betting needs to be closed.")]
    BettingNeedsToBeClosed,
    #[msg("Round already started.")]
    RoundAlreadyStarted,
    #[msg("No prize claimable.")]
    NoPrizeClaimable,
    #[msg("Prize already claimed.")]
    PrizeAlreadyClaimed,
    #[msg("Invalid prediction.")]
    InvalidPrediction,
    #[msg("Maximum bet amount reached.")]
    MaximumBetAmountReached,
    #[msg("Nothing to withdraw.")]
    NothingToWithdraw,
    #[msg("Wrong token address.")]
    WrongTokenAddress,
    #[msg("The provided mint account does not match the expected token address.")]
    InvalidMintAccount,
}

