/**
 * MetaMask React Hook
 * Provides MetaMask wallet connection and transaction functionality
 */

import { useState, useEffect, useCallback } from "react";

export interface MetaMaskAccount {
  address: string;
  balance: string;
  chainId: number;
  networkName: string;
}

export interface MetaMaskTransaction {
  to: string;
  value?: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
}

export interface UseMetaMaskReturn {
  isInstalled: boolean;
  isConnected: boolean;
  account: MetaMaskAccount | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  getBalance: () => Promise<string>;
  sendTransaction: (transaction: MetaMaskTransaction) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  error: string | null;
  loading: boolean;
}

export function useMetaMask(): UseMetaMaskReturn {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<MetaMaskAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if MetaMask is installed
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ethereum = (window as any).ethereum;
      setIsInstalled(!!(ethereum && ethereum.isMetaMask));

      // Check if already connected
      if (ethereum) {
        checkConnection();
        
        // Listen for account changes
        ethereum.on("accountsChanged", handleAccountsChanged);
        ethereum.on("chainChanged", handleChainChanged);
      }
    }

    return () => {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        (window as any).ethereum.removeListener("accountsChanged", handleAccountsChanged);
        (window as any).ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  const checkConnection = async () => {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) return;

      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        await setAccountFromAddress(accounts[0]);
        setIsConnected(true);
      }
    } catch (err: any) {
      console.error("Error checking MetaMask connection:", err);
    }
  };

  const setAccountFromAddress = async (address: string) => {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) return;

      const balance = await ethereum.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      });

      const chainId = await ethereum.request({
        method: "eth_chainId",
      });

      const networkNames: Record<string, string> = {
        "0x1": "Ethereum Mainnet",
        "0x89": "Polygon Mainnet",
        "0xaa36a7": "Sepolia Testnet",
        "0x13881": "Mumbai Testnet",
      };

      setAccount({
        address,
        balance: BigInt(balance).toString(),
        chainId: parseInt(chainId, 16),
        networkName: networkNames[chainId] || "Unknown Network",
      });
    } catch (err: any) {
      console.error("Error setting account:", err);
    }
  };

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      setIsConnected(false);
      setAccount(null);
    } else {
      await setAccountFromAddress(accounts[0]);
      setIsConnected(true);
    }
  };

  const handleChainChanged = () => {
    // Reload page on chain change
    window.location.reload();
  };

  const connect = useCallback(async () => {
    if (!isInstalled) {
      setError("MetaMask is not installed");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        await setAccountFromAddress(accounts[0]);
        setIsConnected(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect MetaMask");
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [isInstalled]);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setAccount(null);
    setError(null);
  }, []);

  const switchNetwork = useCallback(async (chainId: number) => {
    if (!isInstalled || !isConnected) {
      setError("MetaMask is not connected");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ethereum = (window as any).ethereum;
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (err: any) {
      if (err.code === 4902) {
        setError("Network not added to MetaMask. Please add it manually.");
      } else {
        setError(err.message || "Failed to switch network");
      }
    } finally {
      setLoading(false);
    }
  }, [isInstalled, isConnected]);

  const getBalance = useCallback(async (): Promise<string> => {
    if (!isConnected || !account) {
      throw new Error("MetaMask is not connected");
    }

    try {
      const ethereum = (window as any).ethereum;
      const balance = await ethereum.request({
        method: "eth_getBalance",
        params: [account.address, "latest"],
      });
      return BigInt(balance).toString();
    } catch (err: any) {
      throw new Error(err.message || "Failed to get balance");
    }
  }, [isConnected, account]);

  const sendTransaction = useCallback(async (
    transaction: MetaMaskTransaction
  ): Promise<string> => {
    if (!isConnected || !account) {
      throw new Error("MetaMask is not connected");
    }

    setLoading(true);
    setError(null);

    try {
      const ethereum = (window as any).ethereum;
      const txHash = await ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: account.address,
          to: transaction.to,
          value: transaction.value || "0x0",
          data: transaction.data,
          gasLimit: transaction.gasLimit,
          gasPrice: transaction.gasPrice,
        }],
      });
      return txHash;
    } catch (err: any) {
      const errorMsg = err.message || "Transaction failed";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [isConnected, account]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!isConnected || !account) {
      throw new Error("MetaMask is not connected");
    }

    setLoading(true);
    setError(null);

    try {
      const ethereum = (window as any).ethereum;
      const signature = await ethereum.request({
        method: "eth_sign",
        params: [account.address, message],
      });
      return signature;
    } catch (err: any) {
      const errorMsg = err.message || "Failed to sign message";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [isConnected, account]);

  return {
    isInstalled,
    isConnected,
    account,
    connect,
    disconnect,
    switchNetwork,
    getBalance,
    sendTransaction,
    signMessage,
    error,
    loading,
  };
}
