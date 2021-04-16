import {HardhatRuntimeEnvironment} from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types";

const func: DeployFunction =  async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, sushiBar, sushiToken} = await getNamedAccounts();

  if (!sushiBar) {
    throw new Error('sushiBar must be defined as a named account')
  }
  
  if (!sushiToken) {
    throw new Error('sushiToken must be defined as a named account')
  }

  console.time("SushiYieldSource deployed");
  const contract = await deploy('SushiYieldSource', {
    from: deployer,
    args: [sushiBar, sushiToken],
    log: true,
  });

  console.timeEnd("SushiYieldSource deployed");
  console.log("SushiYieldSource address:", contract.address);


};

export default func
module.exports.tags = ['SushiYieldSource']