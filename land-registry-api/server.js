'use strict';

// ---------------------------------------------------------------------------
// Land Registry API  –  Express + Hyperledger Fabric Gateway + ethers.js
// ---------------------------------------------------------------------------

const express  = require('express');
const cors     = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();

const { getFabricGateway, closeFabricGateway } = require('./fabric-connection');

// ---------------------------------------------------------------------------
// App bootstrap
// ---------------------------------------------------------------------------

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());

// Allow the React dev server (Vite default) to call this API
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ---------------------------------------------------------------------------
// AnchorRegistry ABI  (matches AnchorRegistry.sol exactly)
// anchorHash() is onlyOwner → PRIVATE_KEY must be the deployer's key
// ---------------------------------------------------------------------------
const ANCHOR_ABI = [
    // Write
    'function anchorHash(string memory parcelId, string memory docHash) public',
    // Read
    'function verifyHash(string memory parcelId) public view returns (string memory)',
    'function getAnchorTimestamp(string memory parcelId) public view returns (uint256)',
    // State
    'function owner() public view returns (address)',
    // Event
    'event HashAnchored(string indexed parcelId, string docHash, uint256 timestamp)',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const utf8Decoder = new TextDecoder();

/** Decode raw Fabric bytes → parsed JS value. */
function decodeResult(bytes) {
    const text = utf8Decoder.decode(bytes);
    try   { return JSON.parse(text); }
    catch { return text; }
}

/** Lazy-load and cache the Fabric contract singleton. */
let _contract = null;
async function getContract() {
    if (!_contract) {
        const { contract } = await getFabricGateway();
        _contract = contract;
    }
    return _contract;
}

/**
 * Centralised error handler.
 * Maps chaincode error messages to appropriate HTTP status codes.
 */
function handleError(res, error) {
    console.error('[API Error]', error?.message || error);
    const msg = error?.message || 'Internal server error';
    if (/does not exist/i.test(msg))   return res.status(404).json({ error: msg });
    if (/already exists/i.test(msg))   return res.status(409).json({ error: msg });
    if (/not pending/i.test(msg))      return res.status(400).json({ error: msg });
    if (/no anchor found/i.test(msg))  return res.status(404).json({ error: msg });
    return res.status(500).json({ error: msg });
}

// ---------------------------------------------------------------------------
// Polygon / ethers.js helpers
// ---------------------------------------------------------------------------

/**
 * Build an ethers Contract instance connected to Polygon Amoy.
 * Returns null if env vars are not configured.
 */
function getAnchorContract(signerOrProvider = 'provider') {
    const { CONTRACT_ADDRESS, PRIVATE_KEY, POLYGON_RPC_URL } = process.env;
    if (!CONTRACT_ADDRESS || !PRIVATE_KEY) return null;

    const rpcUrl  = POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology';
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    if (signerOrProvider === 'provider') {
        // Read-only
        return new ethers.Contract(CONTRACT_ADDRESS, ANCHOR_ABI, provider);
    }

    // Read-write (deployer wallet — required by onlyOwner modifier)
    const rawKey = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
    const wallet  = new ethers.Wallet(rawKey, provider);
    return new ethers.Contract(CONTRACT_ADDRESS, ANCHOR_ABI, wallet);
}

/**
 * Call anchorHash() on Polygon after a successful Fabric approveTransfer.
 * @returns {{ txHash, blockNumber }} on success, or throws.
 */
async function anchorToPolygon(parcelId, docHash) {
    const anchorContract = getAnchorContract('signer');
    if (!anchorContract) {
        console.warn('[Polygon] Anchoring skipped — CONTRACT_ADDRESS or PRIVATE_KEY not set.');
        return null;
    }

    console.log(`[Polygon] Anchoring → parcelId="${parcelId}"  docHash="${docHash}"`);
    const tx      = await anchorContract.anchorHash(parcelId, docHash);
    const receipt = await tx.wait();
    console.log(`[Polygon] ✔ Anchored  txHash=${receipt.hash}  block=${receipt.blockNumber}`);
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

// ===========================================================================
// REST Endpoints
// ===========================================================================

// ---------------------------------------------------------------------------
// POST /api/parcels
// Body: { parcelId, ulpin, ownerName, area, location, marketValue, ownershipType }
// Chaincode tx: createParcel(parcelId, ulpin, ownerName, area, location, marketValue, ownershipType)
// ---------------------------------------------------------------------------
app.post('/api/parcels', async (req, res) => {
    try {
        const {
            parcelId,
            ulpin         = '',
            ownerName,
            area          = '',
            location      = '',
            marketValue   = '0',
            ownershipType = 'PRIVATE',
        } = req.body;

        if (!parcelId || !ownerName) {
            return res.status(400).json({ error: 'parcelId and ownerName are required.' });
        }

        const contract    = await getContract();
        const resultBytes = await contract.submitTransaction(
            'createParcel',
            String(parcelId),
            String(ulpin),
            String(ownerName),
            String(area),
            String(location),
            String(marketValue),
            String(ownershipType)
        );

        const result = decodeResult(resultBytes);
        console.log(`[Fabric] createParcel → ${parcelId}`);
        return res.status(201).json({ message: 'Parcel created successfully.', result });
    } catch (err) { return handleError(res, err); }
});

// ---------------------------------------------------------------------------
// GET /api/parcels
// Chaincode query: queryAllParcels()
// ---------------------------------------------------------------------------
app.get('/api/parcels', async (req, res) => {
    try {
        const contract    = await getContract();
        const resultBytes = await contract.evaluateTransaction('queryAllParcels');
        const result      = decodeResult(resultBytes);
        console.log(`[Fabric] queryAllParcels → ${Array.isArray(result) ? result.length : '?'} records`);
        return res.json(result);
    } catch (err) { return handleError(res, err); }
});

// ---------------------------------------------------------------------------
// GET /api/parcels/:id
// Chaincode query: queryParcel(parcelId)
// IMPORTANT: declared before /api/parcels/:id/history so Express matches correctly.
// ---------------------------------------------------------------------------
app.get('/api/parcels/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const contract    = await getContract();
        const resultBytes = await contract.evaluateTransaction('queryParcel', id);
        const result      = decodeResult(resultBytes);
        console.log(`[Fabric] queryParcel → ${id}`);
        return res.json(result);
    } catch (err) { return handleError(res, err); }
});

// ---------------------------------------------------------------------------
// GET /api/parcels/:id/history
// Chaincode query: getParcelHistory(parcelId)
// ---------------------------------------------------------------------------
app.get('/api/parcels/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const contract    = await getContract();
        const resultBytes = await contract.evaluateTransaction('getParcelHistory', id);
        const result      = decodeResult(resultBytes);
        console.log(`[Fabric] getParcelHistory → ${id}`);
        return res.json(result);
    } catch (err) { return handleError(res, err); }
});

// ---------------------------------------------------------------------------
// GET /api/parcels/:id/anchor
// Read the anchored docHash and timestamp for a parcel directly from Polygon.
// Uses verifyHash() and getAnchorTimestamp() — no gas needed (view calls).
// ---------------------------------------------------------------------------
app.get('/api/parcels/:id/anchor', async (req, res) => {
    try {
        const { id } = req.params;
        const anchorContract = getAnchorContract('provider');

        if (!anchorContract) {
            return res.status(503).json({ error: 'Polygon anchoring is not configured on this server.' });
        }

        const [docHash, timestampBN] = await Promise.all([
            anchorContract.verifyHash(id),
            anchorContract.getAnchorTimestamp(id),
        ]);

        // timestampBN is a BigInt (ethers v6) — convert to ISO string
        const anchoredAt = new Date(Number(timestampBN) * 1000).toISOString();

        console.log(`[Polygon] verifyHash → parcelId="${id}"  docHash="${docHash}"`);
        return res.json({
            parcelId: id,
            docHash,
            anchoredAt,
            contractAddress: process.env.CONTRACT_ADDRESS,
        });
    } catch (err) { return handleError(res, err); }
});

// ---------------------------------------------------------------------------
// POST /api/transfers
// Body: { parcelId, newOwnerName, newOwnerAadhar }
// Chaincode tx: transferParcel(parcelId, newOwnerName, newOwnerAadhar, requestId)
// requestId is auto-generated — frontend does NOT need to supply it.
// It is returned in the response so the frontend can pass it to /transfers/approve.
// ---------------------------------------------------------------------------
app.post('/api/transfers', async (req, res) => {
    try {
        const { parcelId, newOwnerName, newOwnerAadhar } = req.body;

        if (!parcelId || !newOwnerName || !newOwnerAadhar) {
            return res.status(400).json({
                error: 'parcelId, newOwnerName, and newOwnerAadhar are required.',
            });
        }

        const requestId  = `REQ-${Date.now()}`;
        const contract   = await getContract();
        const resultBytes = await contract.submitTransaction(
            'transferParcel',
            String(parcelId),
            String(newOwnerName),
            String(newOwnerAadhar),
            requestId
        );

        const result = decodeResult(resultBytes);
        console.log(`[Fabric] transferParcel → ${parcelId}  requestId=${requestId}`);
        return res.json({ message: 'Transfer request submitted.', requestId, result });
    } catch (err) { return handleError(res, err); }
});

// ---------------------------------------------------------------------------
// POST /api/transfers/approve
// Body: { parcelId, requestId }
// Chaincode tx: approveTransfer(parcelId, requestId)
// After Fabric success → call anchorHash() on Polygon Amoy (onlyOwner).
// ---------------------------------------------------------------------------
app.post('/api/transfers/approve', async (req, res) => {
    try {
        const { parcelId, requestId } = req.body;

        if (!parcelId || !requestId) {
            return res.status(400).json({ error: 'parcelId and requestId are required.' });
        }

        // ── Step 1: Commit on Hyperledger Fabric ───────────────────────────
        const contract    = await getContract();
        const resultBytes = await contract.submitTransaction(
            'approveTransfer',
            String(parcelId),
            String(requestId)
        );
        const fabricResult = decodeResult(resultBytes);
        console.log(`[Fabric] approveTransfer → ${parcelId}  requestId=${requestId}`);

        // The chaincode sets docHash = "HASH-<timestamp>" on approval
        const docHash = fabricResult?.parcel?.docHash
            ?? fabricResult?.docHash
            ?? `HASH-${Date.now()}`;

        // ── Step 2: Anchor to Polygon Amoy ─────────────────────────────────
        let polygonResult = null;
        let polygonError  = null;
        try {
            polygonResult = await anchorToPolygon(parcelId, docHash);
        } catch (err) {
            // Fabric tx is already committed — don't fail the whole request.
            console.error('[Polygon] Anchoring failed (Fabric tx is committed):', err.message);
            polygonError = err.message;
        }

        // ── Step 3: Respond ────────────────────────────────────────────────
        let message;
        if (polygonResult)     message = 'Transfer approved and anchored to Polygon Amoy.';
        else if (polygonError) message = 'Transfer approved on Fabric, but Polygon anchoring failed.';
        else                   message = 'Transfer approved on Fabric (Polygon anchoring disabled).';

        return res.json({
            message,
            fabricResult,
            ...(polygonResult && {
                polygon: {
                    txHash:      polygonResult.txHash,
                    blockNumber: polygonResult.blockNumber,
                    docHash,
                    contractAddress: process.env.CONTRACT_ADDRESS,
                },
            }),
            ...(polygonError && { polygonError }),
        });
    } catch (err) { return handleError(res, err); }
});

// ---------------------------------------------------------------------------
// Health-check
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    polygon: {
        configured: !!(process.env.CONTRACT_ADDRESS && process.env.PRIVATE_KEY),
        contract:   process.env.CONTRACT_ADDRESS || null,
        network:    'Polygon Amoy',
    },
}));

// ---------------------------------------------------------------------------
// 404 catch-all
// ---------------------------------------------------------------------------
app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));

// ===========================================================================
// Start server + graceful shutdown
// ===========================================================================

const server = app.listen(PORT, () => {
    console.log('─────────────────────────────────────────────────────────');
    console.log(` Land Registry API    →  http://localhost:${PORT}`);
    console.log(` CORS allowed for     →  ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
    console.log(` Fabric peer          →  ${process.env.FABRIC_PEER_ENDPOINT || 'localhost:7051'}`);
    console.log(` AnchorRegistry       →  ${process.env.CONTRACT_ADDRESS || '(not configured)'}`);
    console.log('─────────────────────────────────────────────────────────');
});

function gracefulShutdown(signal) {
    console.log(`\n[Server] ${signal} — shutting down…`);
    closeFabricGateway();
    server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
    });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
