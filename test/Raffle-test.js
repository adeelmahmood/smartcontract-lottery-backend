const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Raffle", function () {
  const fee = ethers.utils.parseEther("0.1");
  let raffle;

  beforeEach(async function () {
    const contract = await ethers.getContractFactory("Raffle");
    raffle = await contract.deploy(fee);
    await raffle.deployed();
  });

  it("Should confirm entrance fee", async function () {
    const current = await raffle.getEntranceFee();
    expect(current).to.eq(fee);
  });

  it("Should enter lottery", async function () {
    const [owner] = await ethers.getSigners();
    await expect(
      raffle.enterRaffle({ from: owner.address, value: fee })
    ).to.emit(raffle, "RaffleEntered");

    const player = await raffle.getPlayer(0);
    expect(player).to.eq(owner.address);
  });
});
