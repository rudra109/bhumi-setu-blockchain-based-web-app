const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");

async function main() {
  // Read contract address from deployments.json first, then fall back to .env
  let contractAddress = process.env.CONTRACT_ADDRESS;

  const logPath = path.join(__dirname, "..", "deployments.json");
  if (fs.existsSync(logPath)) {
    try {
      const deployments = JSON.parse(fs.readFileSync(logPath, "utf8"));
      const network = hre.network.name;
      if (deployments[network]?.contractAddress) {
        contractAddress = deployments[network].contractAddress;
        console.log(`[verify] Read address from deployments.json: ${contractAddress}`);
      }
    } catch (e) {
      console.warn("[verify] Could not parse deployments.json:", e.message);
    }
  }

  if (!contractAddress) {
    throw new Error(
      "No CONTRACT_ADDRESS found. Deploy first or set CONTRACT_ADDRESS in .env"
    );
  }

  console.log(`[verify] Verifying AnchorRegistry at ${contractAddress} on ${hre.network.name}…`);

  try {
    await hre.run("verify:verify", {
      address:              contractAddress,
      constructorArguments: [],    // AnchorRegistry has no constructor args
    });
    console.log("✔ Contract verified on PolygonScan.");
    console.log(`  https://amoy.polygonscan.com/address/${contractAddress}#code`);
  } catch (err) {
    if (/already verified/i.test(err.message)) {
      console.log("✔ Contract is already verified.");
      console.log(`  https://amoy.polygonscan.com/address/${contractAddress}#code`);
    } else {
      throw err;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
