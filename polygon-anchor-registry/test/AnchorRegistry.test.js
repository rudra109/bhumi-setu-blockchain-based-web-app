const { expect }  = require("chai");
const { ethers }  = require("hardhat");

describe("AnchorRegistry", function () {
  let anchorRegistry;
  let owner;
  let nonOwner;

  // Deploy a fresh contract before each test
  beforeEach(async function () {
    [owner, nonOwner] = await ethers.getSigners();
    const AnchorRegistry = await ethers.getContractFactory("AnchorRegistry");
    anchorRegistry = await AnchorRegistry.deploy();
  });

  // ── Deployment ────────────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("should set the deployer as owner", async function () {
      expect(await anchorRegistry.owner()).to.equal(owner.address);
    });
  });

  // ── anchorHash ────────────────────────────────────────────────────────────
  describe("anchorHash()", function () {
    it("should store the docHash for a parcelId", async function () {
      await anchorRegistry.anchorHash("parcel1", "HASH-111");
      const stored = await anchorRegistry.verifyHash("parcel1");
      expect(stored).to.equal("HASH-111");
    });

    it("should overwrite the hash when called again for the same parcelId", async function () {
      await anchorRegistry.anchorHash("parcel1", "HASH-OLD");
      await anchorRegistry.anchorHash("parcel1", "HASH-NEW");
      expect(await anchorRegistry.verifyHash("parcel1")).to.equal("HASH-NEW");
    });

    it("should emit a HashAnchored event with the correct args", async function () {
      await expect(anchorRegistry.anchorHash("parcel2", "HASH-EVT"))
        .to.emit(anchorRegistry, "HashAnchored")
        .withArgs("parcel2", "HASH-EVT", await getCurrentTimestamp());
    });

    it("should revert when called by a non-owner", async function () {
      await expect(
        anchorRegistry.connect(nonOwner).anchorHash("parcel3", "HASH-HACK")
      ).to.be.revertedWith("AnchorRegistry: Caller is not the owner");
    });
  });

  // ── verifyHash ────────────────────────────────────────────────────────────
  describe("verifyHash()", function () {
    it("should revert if no anchor exists for the parcelId", async function () {
      await expect(
        anchorRegistry.verifyHash("unknownParcel")
      ).to.be.revertedWith("AnchorRegistry: No anchor found for this parcel ID");
    });

    it("should return the correct docHash after anchoring", async function () {
      await anchorRegistry.anchorHash("parcel4", "HASH-VERIFY");
      expect(await anchorRegistry.verifyHash("parcel4")).to.equal("HASH-VERIFY");
    });
  });

  // ── getAnchorTimestamp ───────────────────────────────────────────────────
  describe("getAnchorTimestamp()", function () {
    it("should revert if no anchor exists", async function () {
      await expect(
        anchorRegistry.getAnchorTimestamp("ghost")
      ).to.be.revertedWith("AnchorRegistry: No anchor found for this parcel ID");
    });

    it("should return a recent block timestamp after anchoring", async function () {
      const tx = await anchorRegistry.anchorHash("parcel5", "HASH-TS");
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const stored = await anchorRegistry.getAnchorTimestamp("parcel5");
      expect(stored).to.equal(BigInt(block.timestamp));
    });
  });

  // ── Multiple parcels ──────────────────────────────────────────────────────
  describe("Multiple parcels", function () {
    it("should store independent hashes for different parcelIds", async function () {
      await anchorRegistry.anchorHash("p-A", "HASH-A");
      await anchorRegistry.anchorHash("p-B", "HASH-B");
      await anchorRegistry.anchorHash("p-C", "HASH-C");

      expect(await anchorRegistry.verifyHash("p-A")).to.equal("HASH-A");
      expect(await anchorRegistry.verifyHash("p-B")).to.equal("HASH-B");
      expect(await anchorRegistry.verifyHash("p-C")).to.equal("HASH-C");
    });
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────
async function getCurrentTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  // Return timestamp + 1 because the tx will be in the next block
  return block.timestamp + 1;
}
