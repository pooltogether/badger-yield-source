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
```

