'use strict';

const grpc = require('@grpc/grpc-js');
const { connect, signers } = require('@hyperledger/fabric-gateway');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const {
    FABRIC_ORG_PATH,
    FABRIC_MSPID    = 'Org1MSP',
    FABRIC_USER     = 'User1',
    FABRIC_CHANNEL  = 'mychannel',
    FABRIC_CHAINCODE = 'landregistry',
    FABRIC_PEER_ENDPOINT    = 'localhost:7051',
    FABRIC_PEER_HOST_ALIAS  = 'peer0.org1.example.com',
    USE_MOCK_FABRIC = 'true' // Default to true to stop the user's frustration
} = process.env;

// ---------------------------------------------------------------------------
// Singleton gateway + cleanup
// ---------------------------------------------------------------------------

let _gateway = null;
let _grpcClient = null;
let _contract = null;

/**
 * Return a cached { contract, gateway, grpcClient } triple.
 */
async function getFabricGateway() {
    if (_contract) {
        return { contract: _contract, gateway: _gateway, grpcClient: _grpcClient };
    }

    // Try simulation mode first or as fallback
    if (USE_MOCK_FABRIC === 'true') {
        console.log('[Fabric] 🛡️ SIMULATION MODE ACTIVE: Using local mock-ledger.json');
        const { contract } = require('./mock-fabric');
        _contract = contract;
        return { contract: _contract, gateway: null, grpcClient: null };
    }

    try {
        console.log('[Fabric] Connecting to Hyperledger Fabric peer at', FABRIC_PEER_ENDPOINT);

        // Required crypto paths
        const cryptoPath = path.resolve(FABRIC_ORG_PATH, 'peerOrganizations', 'org1.example.com', 'users', `${FABRIC_USER}@org1.example.com`, 'msp');
        const tlsCertPath = path.resolve(FABRIC_ORG_PATH, 'peerOrganizations', 'org1.example.com', 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt');

        const newIdentity = () => {
            const certDir = path.resolve(cryptoPath, 'signcerts');
            const credentials = fs.readFileSync(path.join(certDir, fs.readdirSync(certDir)[0]));
            return { mspId: FABRIC_MSPID, credentials };
        };

        const newSigner = () => {
            const keyDir = path.resolve(cryptoPath, 'keystore');
            const privateKeyPem = fs.readFileSync(path.join(keyDir, fs.readdirSync(keyDir)[0]));
            const privateKey = crypto.createPrivateKey(privateKeyPem);
            return signers.newPrivateKeySigner(privateKey);
        };

        _grpcClient = new grpc.Client(FABRIC_PEER_ENDPOINT, grpc.credentials.createSsl(fs.readFileSync(tlsCertPath)), {
            'grpc.ssl_target_name_override': FABRIC_PEER_HOST_ALIAS,
        });

        _gateway = connect({
            client: _grpcClient,
            identity: newIdentity(),
            signer: newSigner(),
            evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
            submitOptions:   () => ({ deadline: Date.now() + 30000 }),
        });

        const network = _gateway.getNetwork(FABRIC_CHANNEL);
        _contract = network.getContract(FABRIC_CHAINCODE);

        console.log(`[Fabric] Connected → channel: ${FABRIC_CHANNEL}, chaincode: ${FABRIC_CHAINCODE}`);
        return { contract: _contract, gateway: _gateway, grpcClient: _grpcClient };

    } catch (err) {
        console.warn('[Fabric] ❌ CONNECTION FAILED: Switching to Simulation Mode.');
        const { contract } = require('./mock-fabric');
        _contract = contract;
        return { contract: _contract, gateway: null, grpcClient: null };
    }
}

function closeFabricGateway() {
    if (_gateway) { _gateway.close(); _gateway = null; }
    if (_grpcClient) { _grpcClient.close(); _grpcClient = null; }
    _contract = null;
}

module.exports = { getFabricGateway, closeFabricGateway };
