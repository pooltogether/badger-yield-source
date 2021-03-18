import {HardhatRuntimeEnvironment} from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types";

const func: DeployFunction =  async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  console.time("SushiYieldSource deployed");
  
  const contract = await deploy('SushiYieldSource', {
    from: deployer,
    args: ["0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272"
      "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2"],
    log: true,
  });

  console.timeEnd("SushiYieldSource deployed");

  console.log("SushiYieldSource address:", contract.address);


};

export default func
module.exports.tags = ['SushiYieldSource']