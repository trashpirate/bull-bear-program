#!/bin/bash

# Start the local validator in the background
solana-test-validator --reset \
    --bpf-program FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH tests/clones/pythOracle.so \
    --bpf-program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA tests/clones/tokenProgram.so \
    --clone 7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE \
    --clone 6B23K3tkb51vLZA14jcEQVCA1pfHptzEHFA93V5dYwbT \
    --clone 42amVS4KgzR9rA28tkVYqVXjq9Qa8dcZQMbH5EYFX6XC \
    --clone 3T3R5KTAXgMF5KVw6v38qUfSUernCHQwYFzfVo1jdjMX --url "https://api.mainnet-beta.solana.com"

# # Wait for the validator to start
# sleep 10

# # Deploy the programs
# solana program deploy --program-id FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH tests/clones/pythOracle.so
# solana program deploy --program-id TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA tests/clones/tokenProgram.so

# # Clone the accounts
# solana account 7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE
# solana account 6B23K3tkb51vLZA14jcEQVCA1pfHptzEHFA93V5dYwbT
# solana account 42amVS4KgzR9rA28tkVYqVXjq9Qa8dcZQMbH5EYFX6XC
# solana account 3T3R5KTAXgMF5KVw6v38qUfSUernCHQwYFzfVo1jdjMX

# Kill the validator process after tests are done
# kill $VALIDATOR_PID