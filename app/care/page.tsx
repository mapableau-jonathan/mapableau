"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, X } from "lucide-react";
import { WorkerCard } from "@/components/care/worker-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";

interface Worker {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  status: string;
  verifications: {
    hasIdentity: boolean;
    hasVEVO: boolean;
    hasWWCC: boolean;
    hasNDIS: boolean;
    hasFirstAid: boolean;
  };
  createdAt: string;
}

interface SearchFilters {
  query: string;
  role: string;
  location: string;
  verifiedOnly: boolean;
}

export default function CarePage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    role: "",
    location: "",
    verifiedOnly: true,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedQuery = useDebounce(filters.query, 500);

  const searchWorkers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        verifiedOnly: filters.verifiedOnly.toString(),
      });

      if (debouncedQuery) {
        params.append("query", debouncedQuery);
      }
      if (filters.role) {
        params.append("role", filters.role);
      }
      if (filters.location) {
        params.append("location", filters.location);
      }

      const response = await fetch(`/api/care/workers/search?${params}`);
      if (!response.ok) {
        throw new Error("Failed to search workers");
      }

      const data = await response.json();
      setWorkers(data.workers || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search workers");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filters, page]);

  useEffect(() => {
    searchWorkers();
  }, [searchWorkers]);

  const handleFilterChange = (key: keyof SearchFilters, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      role: "",
      location: "",
      verifiedOnly: true,
    });
    setPage(1);
  };

  const hasActiveFilters =
    filters.query || filters.role || filters.location || !filters.verifiedOnly;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Find Support Workers</h1>
        <p className="text-muted-foreground">
          Search for verified support workers in your area
        </p>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={filters.query}
                onChange={(e) => handleFilterChange("query", e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <input
                  type="text"
                  placeholder="e.g., Support Worker, Care Assistant"
                  value={filters.role}
                  onChange={(e) => handleFilterChange("role", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g., Sydney, NSW"
                  value={filters.location}
                  onChange={(e) =>
                    handleFilterChange("location", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly}
                    onChange={(e) =>
                      handleFilterChange("verifiedOnly", e.target.checked)
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Verified workers only</span>
                </label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Searching workers...</p>
        </div>
      ) : workers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No workers found matching your criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Found {workers.length} worker{workers.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workers.map((worker) => (
              <WorkerCard key={worker.id} {...worker} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
