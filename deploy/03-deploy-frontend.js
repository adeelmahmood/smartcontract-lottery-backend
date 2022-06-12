const { ethers, network } = require("hardhat");
const fs = require("fs");

const FRONT_END_ADDRS_FILE = "../lottery-front-end/constants/contract.json";
const FRONT_END_ABI_FILE = "../lottery-front-end/constants/abi.json";

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating front end");
        updateContractAddress();
        updateAbi();
    }
};

async function updateAbi() {
    const raffle = await ethers.getContract("Raffle");
    fs.writeFileSync(FRONT_END_ABI_FILE, raffle.interface.format(ethers.utils.FormatTypes.json));
}

async function updateContractAddress() {
    const raffle = await ethers.getContract("Raffle");
    const chainId = network.config.chainId.toString();
    const contractAddress = JSON.parse(fs.readFileSync(FRONT_END_ADDRS_FILE));
    if (chainId in contractAddress) {
        if (!contractAddress[chainId].includes(raffle.address)) {
            contractAddress[chainId].push(raffle.address);
        }
    }
    {
        contractAddress[chainId] = [raffle.address];
    }
    fs.writeFileSync(FRONT_END_ADDRS_FILE, JSON.stringify(contractAddress));
}

module.exports.tags = ["all", "frontend"];
