const { expect, assert } = require("chai");
const { ethers, deployments, getNamedAccounts, network } = require("hardhat");
const { networkConfig, developmentChains } = require("../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, vrfCoordinatorV2Mock, entranceFee, interval;
          let chainId = network.config.chainId;
          let deployer;

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture("all");
              raffle = await ethers.getContract("Raffle", deployer);
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
              entranceFee = await raffle.getEntranceFee();
              interval = await raffle.getInterval();
          });

          describe("constructor", function () {
              it("initializes properly", async function () {
                  const raffleState = await raffle.getRaffleState();
                  assert(raffleState.toString(), "0");
                  const interval = await raffle.getInterval();
                  assert(interval.toString(), networkConfig[chainId].interval);
              });
          });

          describe("enterRaffle", function () {
              it("enter raffle reverts without entrance fee", async function () {
                  await expect(raffle.enterRaffle()).to.be.revertedWith(
                      "Raffle__NotEnoughEntranceFee"
                  );
              });

              it("add player to raffle and emits event", async function () {
                  await expect(raffle.enterRaffle({ value: entranceFee })).to.emit(
                      raffle,
                      "RaffleEntered"
                  );
                  const player = raffle.getPlayer(0);
                  assert(player, deployer);
              });

              it("doesnt allow entering raffle when state is not open", async function () {
                  await raffle.enterRaffle({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  await raffle.performUpkeep([]);

                  await expect(raffle.enterRaffle({ value: entranceFee })).to.be.revertedWith(
                      "Raffle__NotOpened"
                  );
              });
          });

          describe("checkUpkeep", function () {
              it("no players", async function () {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                  assert(!upkeepNeeded);
              });

              it("state not open", async function () {
                  await raffle.enterRaffle({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  await raffle.performUpkeep([]);
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                  const raffleState = await raffle.getRaffleState();

                  assert(!upkeepNeeded);
                  assert(raffleState.toString(), "1");
              });

              it("enough time has not passed", async function () {
                  await raffle.enterRaffle({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 1]);
                  await network.provider.send("evm_mine", []);
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                  assert(!upkeepNeeded);
              });

              it("should return true with all parameters set", async function () {
                  await raffle.enterRaffle({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                  assert(upkeepNeeded);
              });
          });

          describe("performUpkeep", function () {
              it("can only run if checkUpkeep returns true", async function () {
                  await raffle.enterRaffle({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);

                  const tx = await raffle.performUpkeep([]);
                  assert(tx);
              });

              it("can only run if checkUpkeep returns true", async function () {
                  await expect(raffle.performUpkeep([])).to.be.revertedWith(
                      "Raffle__UpkeepNotNeeded"
                  );
              });

              it("changes the state and calls the vrfcoordinator", async function () {
                  await raffle.enterRaffle({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);

                  const tx = await raffle.performUpkeep([]);
                  const receipt = await tx.wait(1);
                  const requestId = receipt.events[1].args.requestId;
                  const raffleState = await raffle.getRaffleState();
                  assert(requestId > 0);
                  assert(raffleState == 1);
              });
          });

          describe("end to end", function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
              });

              it("picks a winner, resets the lottery and sends money", async function () {
                  // add more players
                  const [_, addr1, addr2, addr3] = await ethers.getSigners();
                  raffle.connect(addr1).enterRaffle({ value: entranceFee });
                  raffle.connect(addr2).enterRaffle({ value: entranceFee });
                  raffle.connect(addr3).enterRaffle({ value: entranceFee });

                  const startingTimestamp = await raffle.getLatestTimestamp();
                  const startingBalance = await addr1.getBalance();

                  // set up an event listener for winner picked event
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async (args) => {
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
                              assert.equal(
                                  endingBalance.toString(),
                                  startingBalance
                                      .add(entranceFee.mul(3).add(entranceFee))
                                      .toString()
                              );
                          } catch (e) {
                              reject(e);
                          }
                          resolve();
                      });

                      // trigger picking a winner
                      const tx = await raffle.performUpkeep([]);
                      const receipt = await tx.wait(1);
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          receipt.events[1].args.requestId,
                          raffle.address
                      );
                  });
              });
          });
      });
