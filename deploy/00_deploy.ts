import {HardhatRuntimeEnvironment} from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types";

const func: DeployFunction =  async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  console.time("SushiYieldSource deployed");
  
  const contract = await deploy('SushiYieldSource', {
    from: deployer,
    args: [],
    log: true,
  });

  console.timeEnd("SushiYieldSource deployed");

  console.log("SushiYieldSource address:", contract.address);


};

export default func
module.exports.tags = ['SushiYieldSource']