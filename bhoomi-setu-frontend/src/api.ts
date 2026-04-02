import axios from 'axios';

// By default pointing to your local Node Express Land Registry API port 4000
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Parcel {
  parcelId: string;
  ulpin: string;
  ownerName: string;
  ownerAadhar: string;
  area: string;
  location: string;
  marketValue: string;
  status: 'ACTIVE' | 'PENDING' | 'LOCKED';
  ownershipType: 'PUBLIC' | 'PRIVATE';
  registrationDate: string;
  lastUpdated: string;
  docHash: string;
  transferHistory?: any[];
}

export const fetchParcels = async (): Promise<Parcel[]> => {
  // Query all parcels
  const response = await api.get('/parcels');
  // Fabric returns an array of { Key, Record } usually
  return response.data.map((item: any) => item.Record || item);
};

export const fetchParcelById = async (parcelId: string): Promise<Parcel> => {
  const response = await api.get(`/parcels/${parcelId}`);
  return response.data;
};

export const fetchParcelAnchor = async (parcelId: string) => {
  const response = await api.get(`/parcels/${parcelId}/anchor`);
  return response.data;
};

export const requestTransfer = async (
  parcelId: string,
  newOwnerName: string,
  newOwnerAadhar: string
) => {
  const response = await api.post('/transfers', {
    parcelId,
    newOwnerName,
    newOwnerAadhar,
  });
  return response.data;
};

export const approveTransfer = async (parcelId: string, requestId: string) => {
  const response = await api.post('/transfers/approve', {
    parcelId,
    requestId,
  });
  return response.data;
};

export default api;
