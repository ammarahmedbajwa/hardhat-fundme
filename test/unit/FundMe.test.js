const { assert, expect } = require("chai");
const { network, deployments, ethers, getNamedAccounts } = require("hardhat");

describe("FundMe", async function () {
  let fundme, deployer, MockV3Aggregator;
  const sendVal = ethers.utils.parseEther("1");
  beforeEach(async function () {
    deployer = (await getNamedAccounts()).deployer;
    await deployments.fixture(["all"]);
    fundme = await ethers.getContract("FundMe", deployer);
    // console.log(fundme);
    MockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
  });
  describe("constructor", async function () {
    it("Sets the Aggregator address correctly.", async function () {
      const PF_response = await fundme.getPriceFeed();
      assert.equal(PF_response, MockV3Aggregator.address);
    });
  });
  describe("fund", async function () {
    it("it fails if you don't send enough eth", async function () {
      await expect(fundme.fund()).to.be.revertedWith(
        "You need to spend more ETH!"
      );
    });
    it("updates the amount funded data struct", async function () {
      await fundme.fund({ value: sendVal });
      const response = await fundme.getAddressToAmountFunded(deployer);

      assert.equal(response.toString(), sendVal.toString());
    });
    it("pushes the funder to funders array", async function () {
      await fundme.fund({ value: sendVal });
      const response = await fundme.getFunder(0);

      assert.equal(response, deployer);
    });
  });
  describe("withdraw", async function () {
    beforeEach("fund", async function () {
      await fundme.fund({ value: sendVal });
    });
    it("withdraw ETH from a single founder", async function () {
      //arrange
      const startingFundMeBalance = await fundme.provider.getBalance(
        fundme.address
      );
      const startingDeployerBalance = await fundme.provider.getBalance(
        deployer
      );

      //act
      const transResponse = await fundme.withdraw();
      const transReciept = await transResponse.wait(1);
      const { gasUsed, effectiveGasPrice } = transReciept;
      const gasCost = gasUsed.mul(effectiveGasPrice);
      const endingFundMeBalance = await fundme.provider.getBalance(
        fundme.address
      );
      const endingDeployerBalance = await fundme.provider.getBalance(deployer);

      //assert
      assert.equal(endingFundMeBalance, 0);
      assert.equal(
        startingDeployerBalance.add(startingFundMeBalance).toString(),
        endingDeployerBalance.add(gasCost).toString()
      );
    });
    it("allows us to withdraw from multiple funders", async function () {
      const accounts = await ethers.getSigners();
      for (let i = 0; i < 6; i++) {
        const FundmeConnectedContract = await fundme.connect(accounts[i]);
        await FundmeConnectedContract.fund({ value: sendVal });
      }
      //arrange
      const startingFundMeBalance = await fundme.provider.getBalance(
        fundme.address
      );
      const startingDeployerBalance = await fundme.provider.getBalance(
        deployer
      );
      //act
      const transResponse = await fundme.withdraw();
      const transReciept = await transResponse.wait(1);
      const { gasUsed, effectiveGasPrice } = transReciept;
      const gasCost = gasUsed.mul(effectiveGasPrice);
      const endingFundMeBalance = await fundme.provider.getBalance(
        fundme.address
      );
      const endingDeployerBalance = await fundme.provider.getBalance(deployer);

      //assert
      assert.equal(endingFundMeBalance, 0);
      assert.equal(
        startingDeployerBalance.add(startingFundMeBalance).toString(),
        endingDeployerBalance.add(gasCost).toString()
      );

      await expect(fundme.getFunder(0)).to.be.reverted;

      for (let i = 0; i < 6; i++) {
        assert.equal(
          await fundme.getAddressToAmountFunded(accounts[i].address),
          0
        );
      }
    });
    it("only owner can withdraw", async function () {
      const accounts = await ethers.getSigners();
      const attacker = accounts[1];
      const attackerConnectedContract = await fundme.connect(attacker);

      await expect(
        attackerConnectedContract.withdraw()
      ).to.be.revertedWithCustomError(fundme, "Fundme__NotOwner");
    });
  });
});
