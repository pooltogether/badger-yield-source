[![Coverage Status](https://coveralls.io/repos/github/0xkarl/badger-sett-pooltogether/badge.svg?branch=master)](https://coveralls.io/github/0xkarl/badger-sett-pooltogether?branch=master)
![Tests](https://github.com/0xkarl/badger-sett-pooltogether/actions/workflows/test.yml/badge.svg)
![Linting](https://github.com/0xkarl/badger-sett-pooltogether/actions/workflows/lint.yml/badge.svg)

Adapted from https://github.com/steffenix/sushi-pooltogether

# Install project

```
yarn
```

# Run tests

## Setup

Copy .env.sample to .env and update the required enviroment variables to ran integration tests:

```
WEB3_INFURA_PROJECT_ID=
ETHERSCAN_TOKEN=
```

You will get the first one from https://infura.io/
You will get the second one from https://etherscan.io/

## Verify

```
yarn verify
```

runs both test and hint.

## Test

```
yarn test
```

## Coverage

```
yarn coverage
```

# Deployment

In order to deploy to mainnet:

Update `HDWALLET_MNEMONIC` in your env file and deploy:

```
env-cmd yarn hardhat --network mainnet deploy
env-cmd yarn hardhat --network mainnet etherscan-verify --api-key $ETHERSCAN_TOKEN
```

Then, have [Badger Gov](https://snapshot.org/#/badgerdao.eth) whitelist the yield source contract in the BadgetSett contract.

```
  await badgerSett.connect(badger.governance).approveContractAccess(yieldSource.address);
```