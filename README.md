[![Coverage Status](https://coveralls.io/repos/github/steffenix/sushi-pooltogether/badge.svg?branch=master)](https://coveralls.io/github/steffenix/sushi-pooltogether?branch=master)
![Tests](https://github.com/steffenix/sushi-pooltogether/actions/workflows/test.yml/badge.svg)
![Linting](https://github.com/steffenix/sushi-pooltogether/actions/workflows/lint.yml/badge.svg)

# Install project

```
yarn
```

# Run tests

## Setup

You will needs to enviroment variables to run the tests.

```
export WEB3_INFURA_PROJECT_ID=
export ETHERSCAN_TOKEN=
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

# Deployement

In order to deploy to mainnet:
```
export HDWALLET_MNEMONIC=
yarn hardhat --network mainnet deploy
yarn hardhat --network mainnet etherscan-verify --api-key $ETHERSCAN_TOKEN
```
