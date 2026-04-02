/**
 * Seed data script for BhoomiSetu Land Registry
 * Run this while the HTTP Express backend server is running!
 * command: node seed.js
 */

const API_URL = 'http://localhost:4000/api';

const parcels = [
  {
    parcelId: 'SURAT-001',
    ulpin: '99887766554433',
    ownerName: 'Rahul Patel',
    ownerAadhar: '111122223333',
    area: '150 sq meters',
    location: 'Adajan, Surat, Gujarat',
    marketValue: '12000000',
    ownershipType: 'PRIVATE'
  },
  {
    parcelId: 'SURAT-002',
    ulpin: '22334455667788',
    ownerName: 'Vesu Developcorp',
    ownerAadhar: '999988887777',
    area: '500 sq meters',
    location: 'Vesu, Surat, Gujarat',
    marketValue: '50000000',
    ownershipType: 'PRIVATE'
  },
  {
    parcelId: 'SURAT-003',
    ulpin: '55667788990011',
    ownerName: 'SMC Public Park',
    ownerAadhar: '000000000000',
    area: '2000 sq meters',
    location: 'Piplod, Surat, Gujarat',
    marketValue: '150000000',
    ownershipType: 'PUBLIC'
  },
  {
    parcelId: 'SURAT-004',
    ulpin: '44332211009988',
    ownerName: 'Kajal Shah',
    ownerAadhar: '444455556666',
    area: '90 sq meters',
    location: 'Varachha, Surat, Gujarat',
    marketValue: '4500000',
    ownershipType: 'PRIVATE'
  },
  {
    parcelId: 'SURAT-005',
    ulpin: '77778888999900',
    ownerName: 'Prakash Desai',
    ownerAadhar: '777766665555',
    area: '300 sq meters',
    location: 'Palsana, Surat, Gujarat',
    marketValue: '8500000',
    ownershipType: 'PRIVATE'
  }
];

async function seed() {
  console.log("🌱 Starting Land Registry Database Seeding (Surat, Gujarat)...");
  
  // 1. Create 5 realistic Surat land parcels
  for (const parcel of parcels) {
    console.log(`Creating parcel ${parcel.parcelId}...`);
    try {
      const res = await fetch(`${API_URL}/parcels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parcel)
      });
      const data = await res.json();
      
      if (!res.ok) {
        console.error(`  ❌ Failed: ${data.error}`);
      } else {
        console.log(`  ✅ Success: ${parcel.parcelId} registered on Hyperledger Fabric.`);
      }
    } catch (err) {
      console.error(`  ❌ Network error: ${err.message}`);
    }
  }

  // 2. Create 1 pending transfer (SURAT-001 -> 'Priya Sharma')
  console.log("\nInitiating transfer for SURAT-001...");
  try {
    const transferReq = {
      parcelId: 'SURAT-001',
      newOwnerName: 'Priya Sharma',
      newOwnerAadhar: '123412341234'
    };
    
    const res = await fetch(`${API_URL}/transfers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transferReq)
    });
    
    const data = await res.json();
    if (!res.ok) {
      console.error(`  ❌ Transfer Failed: ${data.error}`);
    } else {
      console.log(`  ✅ Transfer pending. Request ID: ${data.requestId}`);
    }
  } catch (err) {
    console.error(`  ❌ Network error: ${err.message}`);
  }
  
  console.log("\n🎉 Seeding complete. Check your front-end Dashboard!");
}

seed();
