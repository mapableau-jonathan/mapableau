/**
 * Connected Accounts Page
 * Manage OAuth account connections
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Google, 
  Microsoft, 
  Facebook, 
  CheckCircle, 
  XCircle,
  Link as LinkIcon,
  Unlink
} from "lucide-react";

interface ConnectedAccount {
  provider: string;
  providerAccountId: string;
  email?: string;
  connectedAt?: Date;
  isPrimary?: boolean;
}

export default function ConnectedAccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/account/connected");
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch accounts");
      }

      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (provider: string) => {
    const callbackUrl = encodeURIComponent("/account/connected");
    window.location.href = `/api/auth/passport/${provider}?callback=${callbackUrl}`;
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/account/connected/${provider}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect account");
      }

      await fetchAccounts();
    } catch (error) {
      console.error("Error disconnecting account:", error);
      alert("Failed to disconnect account");
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "google":
        return <Google className="w-5 h-5" aria-hidden="true" />;
      case "microsoft":
      case "azure-ad":
        return <Microsoft className="w-5 h-5" aria-hidden="true" />;
      case "facebook":
        return <Facebook className="w-5 h-5" aria-hidden="true" />;
      default:
        return <LinkIcon className="w-5 h-5" aria-hidden="true" />;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "google":
        return "Google";
      case "microsoft":
      case "azure-ad":
        return "Microsoft";
      case "facebook":
        return "Facebook";
      default:
        return provider;
    }
  };

  const isConnected = (provider: string) => {
    return accounts.some(
      (acc) => acc.provider.toLowerCase() === provider.toLowerCase()
    );
  };

  const providers = ["google", "microsoft", "facebook"];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" id="page-title">
          Connected Accounts
        </h1>
        <p className="text-muted-foreground">
          Manage your OAuth account connections
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12" role="status" aria-live="polite">
          <p>Loading accounts...</p>
        </div>
      ) : (
        <div className="space-y-4" role="list" aria-label="Connected accounts">
          {providers.map((provider) => {
            const connected = isConnected(provider);
            const account = accounts.find(
              (acc) => acc.provider.toLowerCase() === provider.toLowerCase()
            );

            return (
              <Card key={provider} role="listitem">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getProviderIcon(provider)}
                      <div>
                        <CardTitle className="text-lg">
                          {getProviderName(provider)}
                        </CardTitle>
                        {connected && account?.email && (
                          <CardDescription>{account.email}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {connected ? (
                        <>
                          <Badge variant="success" className="gap-1">
                            <CheckCircle className="w-3 h-3" aria-hidden="true" />
                            Connected
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(provider)}
                            aria-label={`Disconnect ${getProviderName(provider)}`}
                          >
                            <Unlink className="w-4 h-4 mr-2" aria-hidden="true" />
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => handleConnect(provider)}
                          aria-label={`Connect ${getProviderName(provider)}`}
                        >
                          <LinkIcon className="w-4 h-4 mr-2" aria-hidden="true" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {connected && account?.connectedAt && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Connected on{" "}
                      {new Date(account.connectedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
