'use strict';

const { Contract } = require('fabric-contract-api');

class LandRegistry extends Contract {

    // 1. initLedger — seed 3 demo land parcels
    async initLedger(ctx) {
        const parcels = [
            {
                parcelId: 'parcel1',
                ulpin: '12345678901234',
                ownerName: 'Alice Smith',
                ownerAadhar: '111122223333',
                area: '1000 sqft',
                location: 'Sector 1, Gandhinagar',
                marketValue: '5000000',
                status: 'ACTIVE',
                ownershipType: 'PRIVATE',
                registrationDate: '2024-01-01T00:00:00.000Z',
                lastUpdated: '2024-01-01T00:00:00.000Z',
                docHash: 'HASH-INIT-1',
                transferHistory: []
            },
            {
                parcelId: 'parcel2',
                ulpin: '98765432109876',
                ownerName: 'Bob Jones',
                ownerAadhar: '444455556666',
                area: '1500 sqft',
                location: 'Sector 4, Gandhinagar',
                marketValue: '7500000',
                status: 'ACTIVE',
                ownershipType: 'PRIVATE',
                registrationDate: '2024-02-15T00:00:00.000Z',
                lastUpdated: '2024-02-15T00:00:00.000Z',
                docHash: 'HASH-INIT-2',
                transferHistory: []
            },
            {
                parcelId: 'parcel3',
                ulpin: '11223344556677',
                ownerName: 'Gujarat Government',
                ownerAadhar: '000000000000',
                area: '50000 sqft',
                location: 'Sector 10, Gandhinagar',
                marketValue: '100000000',
                status: 'ACTIVE',
                ownershipType: 'PUBLIC',
                registrationDate: '2020-01-01T00:00:00.000Z',
                lastUpdated: '2020-01-01T00:00:00.000Z',
                docHash: 'HASH-INIT-3',
                transferHistory: []
            }
        ];

        for (const parcel of parcels) {
            await ctx.stub.putState(parcel.parcelId, Buffer.from(JSON.stringify(parcel)));
            console.info(`Asset ${parcel.parcelId} initialized`);
        }
    }

    // 2. createParcel — validate parcel does not already exist
    async createParcel(ctx, parcelId, ulpin, ownerName, area, location, marketValue, ownershipType) {
        const exists = await this.parcelExists(ctx, parcelId);
        if (exists) {
            throw new Error(`The parcel ${parcelId} already exists`);
        }

        const parcel = {
            parcelId,
            ulpin,
            ownerName,
            ownerAadhar: 'Not Provided', // Not in the requested signature but required in fields
            area,
            location,
            marketValue,
            status: 'ACTIVE',
            ownershipType,
            registrationDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            docHash: `DOC-${Date.now()}`,
            transferHistory: []
        };

        await ctx.stub.putState(parcelId, Buffer.from(JSON.stringify(parcel)));
        return JSON.stringify(parcel);
    }

    // 3. transferParcel — change owner, set status to PENDING, record transfer history
    async transferParcel(ctx, parcelId, newOwnerName, newOwnerAadhar, requestId) {
        const parcelBytes = await ctx.stub.getState(parcelId);
        if (!parcelBytes || parcelBytes.length === 0) {
            throw new Error(`The parcel ${parcelId} does not exist`);
        }
        
        const parcel = JSON.parse(parcelBytes.toString());

        if (parcel.status === 'PENDING') {
            throw new Error(`The parcel ${parcelId} is already pending a transfer approval`);
        }

        const oldOwnerName = parcel.ownerName;
        const oldOwnerAadhar = parcel.ownerAadhar;

        // Record transfer history
        parcel.transferHistory.push({
            requestId: requestId,
            fromOwner: oldOwnerName,
            fromAadhar: oldOwnerAadhar,
            toOwner: newOwnerName,
            toAadhar: newOwnerAadhar,
            dateRequested: new Date().toISOString(),
            status: 'PENDING_APPROVAL'
        });

        // Set pending status and new owner
        parcel.ownerName = newOwnerName;
        parcel.ownerAadhar = newOwnerAadhar;
        parcel.status = 'PENDING';
        parcel.lastUpdated = new Date().toISOString();

        await ctx.stub.putState(parcelId, Buffer.from(JSON.stringify(parcel)));
        return JSON.stringify({ message: `Transfer requested for parcel ${parcelId}`, parcel });
    }

    // 4. approveTransfer — registrar approves, status becomes ACTIVE, generate a docHash using Date.now()
    async approveTransfer(ctx, parcelId, requestId) {
        const parcelBytes = await ctx.stub.getState(parcelId);
        if (!parcelBytes || parcelBytes.length === 0) {
            throw new Error(`The parcel ${parcelId} does not exist`);
        }
        
        const parcel = JSON.parse(parcelBytes.toString());

        if (parcel.status !== 'PENDING') {
            throw new Error(`The parcel ${parcelId} is not pending approval`);
        }

        parcel.status = 'ACTIVE';
        parcel.docHash = `HASH-${Date.now()}`;
        parcel.lastUpdated = new Date().toISOString();

        // Update the status in the local transfer history array
        const transferIndex = parcel.transferHistory.findIndex(t => t.requestId === requestId);
        if (transferIndex !== -1) {
            parcel.transferHistory[transferIndex].status = 'APPROVED';
            parcel.transferHistory[transferIndex].dateApproved = new Date().toISOString();
        }

        await ctx.stub.putState(parcelId, Buffer.from(JSON.stringify(parcel)));
        return JSON.stringify({ message: `Transfer approved for parcel ${parcelId}`, parcel });
    }

    // 5. queryParcel — return the parcel JSON
    async queryParcel(ctx, parcelId) {
        const parcelBytes = await ctx.stub.getState(parcelId);
        if (!parcelBytes || parcelBytes.length === 0) {
            throw new Error(`The parcel ${parcelId} does not exist`);
        }
        return parcelBytes.toString();
    }

    // 6. queryAllParcels — return all parcels using iterator
    async queryAllParcels(ctx) {
        const startKey = '';
        const endKey = '';
        const allResults = [];
        
        for await (const {key, value} of ctx.stub.getStateByRange(startKey, endKey)) {
            const strValue = Buffer.from(value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({ Key: key, Record: record });
        }
        return JSON.stringify(allResults);
    }

    // 7. getParcelHistory — return full transaction history
    async getParcelHistory(ctx, parcelId) {
        const historyIterator = await ctx.stub.getHistoryForKey(parcelId);
        const results = [];
        
        while (true) {
            const response = await historyIterator.next();
            
            if (response.value && response.value.value.toString()) {
                const jsonRes = {};
                jsonRes.txId = response.value.txId;
                jsonRes.timestamp = response.value.timestamp;
                jsonRes.isDelete = response.value.isDelete;
                
                try {
                    jsonRes.data = JSON.parse(response.value.value.toString('utf8'));
                } catch (err) {
                    console.log(err);
                    jsonRes.data = response.value.value.toString('utf8');
                }
                
                results.push(jsonRes);
            }
            
            if (response.done) {
                await historyIterator.close();
                return JSON.stringify(results);
            }
        }
    }

    async parcelExists(ctx, parcelId) {
        const parcelBytes = await ctx.stub.getState(parcelId);
        return parcelBytes && parcelBytes.length > 0;
    }
}

module.exports = LandRegistry;
