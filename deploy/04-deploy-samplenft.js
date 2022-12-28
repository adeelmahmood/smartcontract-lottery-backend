const { network } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    const BLOCK_CONFIRMATIONS = developmentChains.includes(network.name) ? 1 : 6;

    const sampleNft = await deploy("SampleNft", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: BLOCK_CONFIRMATIONS,
    });

    const testContract = await deploy("Test", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: BLOCK_CONFIRMATIONS,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHER_SCAN_KEY) {
        log("Verifying...");
        await verify(sampleNft.address, arguments);
    }
    log("------------------------------------------");
};

module.exports.tags = ["all", "samplenft"];
