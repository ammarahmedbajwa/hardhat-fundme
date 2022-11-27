const { network } = require("hardhat");
const { networkConfig, devChains } = require("../helper-hardhat-config");

const DECIMALS = 8;
const INITIAL_ANSWER = 200000000000;

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  if (devChains.includes(network.name)) {
    console.log("local net detected, deploying mocks...");
    await deploy("MockV3Aggregator", {
      from: deployer,
      log: true,
      args: [DECIMALS, INITIAL_ANSWER],
    });

    log("Mocks deployed");
    log("--------------------------------------------------");
  }
};

module.exports.tags = ["all", "mocks"];
