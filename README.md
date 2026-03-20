# TON Agentic Wallet

> **Warning:** These contracts have **not been audited**. Use at your own risk.

## Overview

This repository contains smart contracts for **TON Agentic Wallets** — on-chain wallets designed to be operated by AI agents. An agentic wallet gives an AI agent the ability to execute arbitrary transactions on the TON blockchain while remaining fully owned by a human user.

Retaining full ownership and control, users can withdraw funds or revoke an agent's access at any time. However, this model does not eliminate all risks: if an agent behaves incorrectly or executes harmful transactions, it can still spend the balance of its wallet.

References: [Wallet V5](https://github.com/ton-blockchain/tolk-bench/tree/master/contracts_Tolk/05_wallet-v5), [NFT](https://github.com/ton-blockchain/tolk-bench/tree/master/contracts_Tolk/02_nft)

## Packages

### Agentic Wallet (`contracts/agentic_wallet.tolk`)

The core contract implementing an AI-agent-operated wallet. Each agentic wallet is a Soulbound Token (SBT) conforming to [TEP-85](https://github.com/ton-blockchain/TEPs/blob/master/text/0085-sbt-standard.md), belonging to a shared NFT collection for easy indexing. Internally, the wallet retains full [Wallet V5](https://github.com/ton-blockchain/wallet-contract-v5) functionality — the agent signs transactions with its `operatorKey`, while the user (owner) can intervene at any time through internal messages as an irremovable extension.

### NFT Collection (`contracts/nft_collection.tolk`)

A minimal NFT collection contract that serves as the parent collection for all agentic wallets. It provides standard collection getters (`get_collection_data`, `get_nft_address_by_index`, `get_nft_content`) and admin operations for updating collection metadata, changing admin address, and upgrading the collection code and data.

## Deployment

Deployment happens on the first deposit to the wallet, requiring no extra steps from the user. There are two possible flows for creating an Agentic Wallet:

1. **User-created wallet.** The user generates an agent `operatorPublicKey` and deploys the wallet directly. `WalletRuntimeData` has `deployedByUser=true`. The contract verifies that the sender address matches the stored owner address.

2. **Agent-created wallet.** An agent that already has at least one user-created wallet can create additional wallets. For the new wallet, `deployedByUser=false` is set. Sender verification uses the `originOperatorPublicKey` of the parent user-root wallet (where `deployedByUser=true`).

Only wallets created directly by the user (`deployedByUser=true`) are allowed to deploy child wallets. If a deploy request comes from an agent-created wallet (`deployedByUser=false`), the contract rejects it.

If sender verification fails, the wallet deploys in an **uninitialized** state and does not appear in explorers. This makes it impossible to create unwanted (spam) wallets for a user.

The NFT item index is computed as `hash(ownerAddress, originOperatorPublicKey, deployedByUser)`.

## Contract Features

- The **agent** can use full Wallet V5 functionality, signing transactions with `operatorKey`.
- The **user** (owner) can control the wallet via internal messages, acting as an irremovable extension.
- The **user** can transfer control to a different agent by changing `operatorPublicKey`, or deactivate the agent entirely by setting `operatorPublicKey = 0`.
- The **user** can update on-chain NFT content.
- The **user** can add or remove wallet extensions at any time.
- The wallet implements **TEP-85 SBT** operations: `prove_ownership` and `request_owner` for on-chain ownership proofs, with a bounce handler that forwards `ownership_proof_bounced` to the owner.
- Standard SBT transfer, destroy, revoke, and take-excess opcodes are explicitly rejected.

## Agent Limits

The current version imposes no transaction limits on agents ("fund what you risk"). This is a deliberate design choice to keep the first iteration of the contracts simple.

## Development

### Build

```bash
npx blueprint build
```

### Test

```bash
npm test
```
