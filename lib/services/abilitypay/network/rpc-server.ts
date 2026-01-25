/**
 * RPC Server
 * Simple HTTP JSON-RPC 2.0 server for Payment Node Network
 */

import type { RPCRequest, RPCResponse } from "./types";
import { logger } from "@/lib/logger";

export interface RPCMethodHandler {
  (params: any[]): Promise<any>;
}

export class RPCServer {
  private methods: Map<string, RPCMethodHandler> = new Map();

  /**
   * Register an RPC method
   */
  registerMethod(name: string, handler: RPCMethodHandler): void {
    this.methods.set(name, handler);
  }

  /**
   * Handle RPC request
   */
  async handleRequest(request: RPCRequest): Promise<RPCResponse> {
    const { jsonrpc, id, method, params = [] } = request;

    // Validate JSON-RPC version
    if (jsonrpc !== "2.0") {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32600,
          message: "Invalid Request",
          data: "jsonrpc must be '2.0'",
        },
      };
    }

    // Get method handler
    const handler = this.methods.get(method);
    if (!handler) {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: "Method not found",
          data: `Method '${method}' not found`,
        },
      };
    }

    // Execute method
    try {
      const result = await handler(params);
      return {
        jsonrpc: "2.0",
        id,
        result,
      };
    } catch (error: any) {
      logger.error(`RPC method error: ${method}`, error);
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32000,
          message: "Server error",
          data: error.message || "Internal server error",
        },
      };
    }
  }

  /**
   * Handle batch request
   */
  async handleBatchRequest(requests: RPCRequest[]): Promise<RPCResponse[]> {
    return Promise.all(requests.map((req) => this.handleRequest(req)));
  }

  /**
   * List all registered methods
   */
  listMethods(): string[] {
    return Array.from(this.methods.keys());
  }
}
