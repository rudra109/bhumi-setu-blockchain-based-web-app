'use strict';
const fs = require('fs');
const path = require('path');

// Local file-based ledger simulation
const LEDGER_PATH = path.join(__dirname, 'simulated-ledger.json');

const getLedger = () => {
    if (!fs.existsSync(LEDGER_PATH)) {
        fs.writeFileSync(LEDGER_PATH, JSON.stringify([]));
        return [];
    }
    return JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
};

const saveLedger = (data) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2));
};

// Contract interface simulation
const contract = {
    evaluateTransaction: async (method, ...args) => {
        const ledger = getLedger();
        if (method === 'queryAllParcels' || method === 'QueryAllParcels') {
            return Buffer.from(JSON.stringify(ledger));
        }
        if (method === 'queryParcel' || method === 'ReadParcel') {
            const p = ledger.find(item => item.Key === args[0] || item.Record.parcelId === args[0]);
            if (!p) throw new Error("Parcel not found");
            return Buffer.from(JSON.stringify(p.Record));
        }
        if (method === 'getParcelHistory') {
            const p = ledger.find(item => item.Key === args[0] || item.Record.parcelId === args[0]);
            if (!p) throw new Error("Parcel not found");
            return Buffer.from(JSON.stringify(p.Record.transferHistory || []));
        }
        return Buffer.from('');
    },
    submitTransaction: async (method, ...args) => {
        const ledger = getLedger();
        if (method === 'createParcel' || method === 'CreateParcel') {
            const [parcelId, ulpin, ownerName, area, location, marketValue, ownershipType, ownerAadhar] = args;
            const newParcel = {
                Key: parcelId,
                Record: {
                    parcelId, ulpin, ownerName, area, location, marketValue, ownershipType,
                    ownerAadhar: ownerAadhar || 'XXXX-XXXX-XXXX',
                    status: 'ACTIVE',
                    registrationDate: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    docHash: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                    transferHistory: []
                }
            };
            ledger.push(newParcel);
            saveLedger(ledger);
            return Buffer.from(JSON.stringify(newParcel));
        }
        if (method === 'transferParcel' || method === 'InitiateTransfer') {
            const [parcelId, newOwnerName, newOwnerAadhar, requestId] = args;
            const item = ledger.find(i => i.Key === parcelId);
            if (!item) throw new Error("Parcel fallback");
            item.Record.status = 'PENDING';
            if (!item.Record.transferHistory) item.Record.transferHistory = [];
            item.Record.transferHistory.push({
                requestId: requestId || ('REQ-' + Date.now()),
                fromOwner: item.Record.ownerName,
                toOwner: newOwnerName,
                toAadhar: newOwnerAadhar,
                dateRequested: new Date().toISOString()
            });
            saveLedger(ledger);
            return Buffer.from(JSON.stringify(item.Record));
        }
        if (method === 'approveTransfer' || method === 'ApproveTransfer') {
            const [parcelId, requestId] = args;
            const item = ledger.find(i => i.Key === parcelId);
            if (!item) throw new Error("Parcel fallback");
            const req = item.Record.transferHistory.find(r => r.requestId === requestId);
            if (req) {
                item.Record.ownerName = req.toOwner;
                item.Record.ownerAadhar = req.toAadhar;
            }
            item.Record.status = 'ACTIVE';
            item.Record.lastUpdated = new Date().toISOString();
            saveLedger(ledger);
            return Buffer.from(JSON.stringify(item.Record));
        }
        return Buffer.from('');
    }
};

module.exports = { contract };
