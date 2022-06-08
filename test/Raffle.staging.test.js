const { expect, assert } = require("chai");
const { ethers, deployments, getNamedAccounts, network } = require("hardhat");
const { networkConfig, developmentChains } = require("../helper-hardhat-config");

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", function () {
          let raffle, entranceFee;
          let deployer;

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture("all");
              raffle = await ethers.getContract("Raffle", deployer);
              entranceFee = await raffle.getEntranceFee();
          });

          it("picks a winner, resets the lottery and sends money", async function () {
              const startingTimestamp = await raffle.getLatestTimestamp();

              console.log("Setting up listener..");
              // set up an event listener for winner picked event
              await new Promise(async (resolve, reject) => {
                  raffle.once("WinnerPicked", async (args) => {
                      console.log("Winner picked..");
                      //perform assertions once the winner has been picked
                      try {
                          const winner = await raffle.getRecentWinner();
                          const raffleState = await raffle.getRaffleState();
                          const numOfPlayers = await raffle.getNumberOfPlayers();
                          const endingBalance = await ethers.provider.getBalance(winner);
                          const endingTimestamp = await raffle.getLatestTimestamp();

                          assert.equal(winner, args);
                          assert.equal(raffleState, 0);
                          assert.equal(numOfPlayers, 0);
                          assert(endingTimestamp > startingTimestamp);
                          assert.equal(endingBalance.toString(), entranceFee.toString());
                      } catch (e) {
                          reject(e);
                      }
                      resolve();
                  });

                  console.log("Entering raffle..");
                  await raffle.enterRaffle({ value: entranceFee });
                  console.log("Waiting..");
              });
          });
      });
