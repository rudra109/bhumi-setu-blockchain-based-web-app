import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider } from 'ethers';

const AMOY_CHAIN_ID = '0x13882';

export const useMetaMask = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const switchToAmoy = async () => {
    // @ts-ignore - ethereum object embedded by MetaMask
    if (!window.ethereum) return;
    try {
      // @ts-ignore
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AMOY_CHAIN_ID }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          // @ts-ignore
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: AMOY_CHAIN_ID,
                chainName: 'Polygon Amoy Testnet',
                rpcUrls: ['https://rpc-amoy.polygon.technology/'],
                nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                blockExplorerUrls: ['https://amoy.polygonscan.com/'],
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add Amoy network", addError);
        }
      }
    }
  };

  const connect = async () => {
    // @ts-ignore
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install it to use Web3 features.");
      return;
    }
    try {
      // @ts-ignore
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setIsConnected(true);
      await switchToAmoy();
    } catch (err) {
      console.error("Failed to connect MetaMask", err);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setIsConnected(false);
  };

  useEffect(() => {
    // @ts-ignore
    if (window.ethereum) {
      // @ts-ignore
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
        } else {
          disconnect();
        }
      });
      // @ts-ignore
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  const signTransfer = useCallback(async (parcelId: string, toAddress: string) => {
    // @ts-ignore
    if (!window.ethereum) throw new Error("MetaMask not found");
    
    // @ts-ignore
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // Create an intent to transfer message ensuring non-repudiation
    const message = `I authorize the legal transfer of Land Parcel ID: ${parcelId}\nTo Aadhaar/Address: ${toAddress}.\n\nTimestamp: ${new Date().toISOString()}`;
    const signature = await signer.signMessage(message);
    
    return signature;
  }, []);

  return {
    account,
    isConnected,
    connect,
    disconnect,
    truncateAddress,
    signTransfer
  };
};
