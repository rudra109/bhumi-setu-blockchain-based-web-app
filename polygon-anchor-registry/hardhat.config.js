require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// ---------------------------------------------------------------------------
// Load and validate env vars
// ---------------------------------------------------------------------------
const PRIVATE_KEY    = process.env.PRIVATE_KEY    || "";
const AMOY_RPC_URL   = process.env.AMOY_RPC_URL   || "https://rpc-amoy.polygon.technology";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "";

// Normalize private key: strip surrounding quotes, ensure 0x prefix
const rawKey = PRIVATE_KEY.replace(/^["']|["']$/g, "").trim();
const accounts = rawKey.length === 64
  ? [`0x${rawKey}`]                 // bare 32-byte hex
  : rawKey.startsWith("0x") && rawKey.length === 66
    ? [rawKey]                      // already 0x-prefixed
    : [];                           // missing/invalid → local only

if (accounts.length === 0) {
  console.warn(
    "[hardhat] WARNING: PRIVATE_KEY is missing or invalid – only 'hardhat' network will work."
  );
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  // ── Solidity compiler ──────────────────────────────────────────────────
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,         // optimise for repeated calls (anchorHash is called often)
      },
    },
  },

  // ── Networks ───────────────────────────────────────────────────────────
  networks: {
    // Local Hardhat node (default for tests)
    hardhat: {
      chainId: 31337,
    },

    // Polygon Amoy testnet
    amoy: {
      url:      AMOY_RPC_URL,
      chainId:  80002,
      accounts,
      gasPrice: 30_000_000_000,   // 30 gwei – stable on Amoy
      gas:      3_000_000,
      timeout:  120_000,          // 2 min – Amoy can be slow
    },
  },

  // ── Etherscan / PolygonScan verification ──────────────────────────────
  // Run: npx hardhat verify --network amoy <CONTRACT_ADDRESS>
  etherscan: {
    apiKey: {
      polygonAmoy: POLYGONSCAN_API_KEY,
    },
    customChains: [
      {
        network:   "polygonAmoy",
        chainId:   80002,
        urls: {
          apiURL:     "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
    ],
  },

  // ── Gas reporter (enabled when REPORT_GAS=true) ───────────────────────
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
  },

  // ── Path overrides (all defaults are fine) ────────────────────────────
  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};
