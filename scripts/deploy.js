const Confirm = require("prompt-confirm");
const hre = require("hardhat");
const ethers = hre.ethers;

const prompt = new Confirm("Do you wish to deploy?");

async function main() {
  await hre.run("compile");
  const SushiYieldSource = await ethers.getContractFactory("SushiYieldSource");

  await promptAndSubmit(SushiYieldSource);
}

function promptAndSubmit(SushiYieldSource) {
  return new Promise((resolve) => {
    try {
      prompt.ask(async (answer) => {
        if (answer) {
          console.time("SushiYieldSource deployed");
          const contract = await SushiYieldSource.deploy();
          console.timeEnd("SushiYieldSource deployed");

          console.log("SushiYieldSource address:", contract.address);

          resolve();
        } else {
          console.error("Aborted!");
          resolve();
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
