const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LegacyContract", function () {
  let contract;
  let owner;
  let heir;
  let guardian1;
  let guardian2;
  let guardian3;

  beforeEach(async function () {
    [owner, heir, guardian1, guardian2, guardian3] = await ethers.getSigners();

    const LegacyContract = await ethers.getContractFactory("LegacyContract");
    contract = await LegacyContract.deploy();
    await contract.deployed();
  });




  

  describe("Plan Creation", function () {
    it("Should create a new legacy plan", async function () {
      const planId = "test-plan-1";
      const threshold = 2;
      const totalShares = 3;
      const timeLock = 86400; // 1 day in seconds

      const guardianAddresses = [guardian1.address, guardian2.address, guardian3.address];
      const commitments = [
        ethers.utils.formatBytes32String("commitment1"),
        ethers.utils.formatBytes32String("commitment2"),
        ethers.utils.formatBytes32String("commitment3"),
      ];

      await expect(
        contract.createPlan(
          planId,
          heir.address,
          threshold,
          totalShares,
          0, // TimeLock mode
          timeLock,
          guardianAddresses,
          commitments
        )
      )
        .to.emit(contract, "PlanCreated")
        .withArgs(planId, owner.address, heir.address, threshold, totalShares);

      const plan = await contract.getPlan(planId);
      expect(plan[0]).to.equal(owner.address); // owner
      expect(plan[1]).to.equal(heir.address); // heir
      expect(plan[2]).to.equal(threshold); // threshold
      expect(plan[3]).to.equal(totalShares); // totalShares
    });

    it("Should not create plan with invalid parameters", async function () {
      const planId = "test-plan-2";
      const threshold = 3;
      const totalShares = 2; // Invalid: threshold > totalShares

      const guardianAddresses = [guardian1.address, guardian2.address];
      const commitments = [
        ethers.utils.formatBytes32String("commitment1"),
        ethers.utils.formatBytes32String("commitment2"),
      ];

      await expect(
        contract.createPlan(
          planId,
          heir.address,
          threshold,
          totalShares,
          0,
          86400,
          guardianAddresses,
          commitments
        )
      ).to.be.revertedWith("Threshold cannot exceed total shares");
    });
  });

  describe("Share Submission", function () {
    beforeEach(async function () {
      const planId = "test-plan-3";
      const threshold = 2;
      const totalShares = 3;
      const timeLock = 86400;

      const guardianAddresses = [guardian1.address, guardian2.address, guardian3.address];
      const commitments = [
        ethers.utils.formatBytes32String("commitment1"),
        ethers.utils.formatBytes32String("commitment2"),
        ethers.utils.formatBytes32String("commitment3"),
      ];

      await contract.createPlan(
        planId,
        heir.address,
        threshold,
        totalShares,
        0,
        timeLock,
        guardianAddresses,
        commitments
      );
    });

    it("Should allow guardian to submit share", async function () {
      const planId = "test-plan-3";
      const shareHash = ethers.utils.formatBytes32String("share1");

      await expect(contract.connect(guardian1).submitShare(planId, shareHash))
        .to.emit(contract, "ShareSubmitted")
        .withArgs(planId, guardian1.address);

      const guardianInfo = await contract.getGuardianInfo(planId, guardian1.address);
      expect(guardianInfo[1]).to.be.true; // hasSubmitted
    });

    it("Should not allow non-guardian to submit share", async function () {
      const planId = "test-plan-3";
      const shareHash = ethers.utils.formatBytes32String("share1");

      await expect(
        contract.connect(owner).submitShare(planId, shareHash)
      ).to.be.revertedWith("Only guardian can call this function");
    });
  });

  describe("Plan Triggering", function () {
    beforeEach(async function () {
      const planId = "test-plan-4";
      const threshold = 2;
      const totalShares = 3;
      const timeLock = 86400;

      const guardianAddresses = [guardian1.address, guardian2.address, guardian3.address];
      const commitments = [
        ethers.utils.formatBytes32String("commitment1"),
        ethers.utils.formatBytes32String("commitment2"),
        ethers.utils.formatBytes32String("commitment3"),
      ];

      await contract.createPlan(
        planId,
        heir.address,
        threshold,
        totalShares,
        0,
        timeLock,
        guardianAddresses,
        commitments
      );
    });

    it("Should trigger plan after time lock expires", async function () {
      const planId = "test-plan-4";
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");

      await expect(contract.triggerPlan(planId))
        .to.emit(contract, "PlanTriggered");

      const plan = await contract.getPlan(planId);
      expect(plan[7]).to.equal(1); // Triggered status
    });

    it("Should not trigger plan before time lock expires", async function () {
      const planId = "test-plan-4";

      await expect(contract.triggerPlan(planId)).to.be.revertedWith("Time lock not expired");
    });
  });
});
