const hre   = require("hardhat");
const fs    = require("fs");
const path  = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network    = hre.network.name;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" AnchorRegistry – Deploy Script");
  console.log(`  Network   : ${network}`);
  console.log(`  Deployer  : ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`  Balance   : ${hre.ethers.formatEther(balance)} MATIC`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (balance === 0n && network !== "hardhat") {
    throw new Error("Deployer wallet has 0 MATIC. Fund it on Amoy before deploying.");
  }

  // ── Deploy ──────────────────────────────────────────────────────────────
  console.log("\nDeploying AnchorRegistry…");
  const AnchorRegistry = await hre.ethers.getContractFactory("AnchorRegistry");
  const contract       = await AnchorRegistry.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`\n✔ AnchorRegistry deployed to: ${contractAddress}`);

  // ── Write address to deployment log ─────────────────────────────────────
  const deployLog = {
    network,
    contractAddress,
    deployer:    deployer.address,
    deployedAt:  new Date().toISOString(),
    txHash:      contract.deploymentTransaction()?.hash ?? "N/A",
  };

  const logPath = path.join(__dirname, "..", "deployments.json");
  let existing  = {};
  if (fs.existsSync(logPath)) {
    try { existing = JSON.parse(fs.readFileSync(logPath, "utf8")); } catch {}
  }
  existing[network] = deployLog;
  fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));
  console.log(`  Deployment log written → deployments.json`);

  // ── Auto-patch .env with CONTRACT_ADDRESS ────────────────────────────────
  // Reads land-registry-api/.env and inserts/replaces CONTRACT_ADDRESS line.
  const apiEnvPath = path.join(__dirname, "..", "..", "land-registry-api", ".env");
  if (fs.existsSync(apiEnvPath)) {
    let envContent = fs.readFileSync(apiEnvPath, "utf8");
    const contractLineRegex = /^CONTRACT_ADDRESS=.*/m;
    const newLine = `CONTRACT_ADDRESS=${contractAddress}`;

    if (contractLineRegex.test(envContent)) {
      envContent = envContent.replace(contractLineRegex, newLine);
    } else {
      envContent += `\n${newLine}\n`;
    }

    fs.writeFileSync(apiEnvPath, envContent);
    console.log(`  CONTRACT_ADDRESS auto-patched → land-registry-api/.env`);
  } else {
    console.log(`  (land-registry-api/.env not found – set CONTRACT_ADDRESS manually)`);
  }

  // ── Verify on PolygonScan if on live network ─────────────────────────────
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\nWaiting 10 s for block explorer to index the contract…");
    await new Promise(r => setTimeout(r, 10_000));

    try {
      await hre.run("verify:verify", {
        address:              contractAddress,
        constructorArguments: [],
      });
      console.log("✔ Contract verified on PolygonScan.");
    } catch (err) {
      if (/already verified/i.test(err.message)) {
        console.log("  Contract is already verified.");
      } else {
        console.warn("  Verification failed (retry manually):", err.message);
        console.warn(`  Run: npx hardhat verify --network ${network} ${contractAddress}`);
      }
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" Deployment complete!");
  console.log(`  Contract  : ${contractAddress}`);
  console.log(`  Explorer  : https://amoy.polygonscan.com/address/${contractAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
