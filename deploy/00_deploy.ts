import {HardhatRuntimeEnvironment} from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types";

const func: DeployFunction =  async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, badgerSett, badger} = await getNamedAccounts();

  if (!badgerSett) {
    throw new Error('badgerSett must be defined as a named account')
  }
  
  if (!badger) {
    throw new Error('badger must be defined as a named account')
  }

  console.time("BadgerYieldSource deployed");
  const contract = await deploy('BadgerYieldSource', {
    from: deployer,
    args: [badgerSett, badger],
    log: true,
  });

  console.timeEnd("BadgerYieldSource deployed");
  console.log("BadgerYieldSource address:", contract.address);
};

export default func
module.exports.tags = ['BadgerYieldSource']