// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
// This module provides configuration utilities for mock API error simulation
// See TODO_MOCK_CLEANUP.md for removal instructions.

export type ErrorType =
  | "none"
  | "duplicate_slug"
  | "validation_error"
  | "permission_error"
  | "server_error"
  | "timeout"
  | "conflict"
  | "not_found";

export interface ErrorSimulationConfig {
  enabled: boolean;
  errorType: ErrorType;
  statusCode: number;
  message: string;
}

export interface MockConfig {
  mode: "normal" | "error";
  latencyMs: number;
  errorSimulation: {
    create: ErrorSimulationConfig;
    update: ErrorSimulationConfig;
    archive: ErrorSimulationConfig;
    restore: ErrorSimulationConfig;
    delete: ErrorSimulationConfig;
    reassignOwner: ErrorSimulationConfig;
  };
}

let cachedConfig: MockConfig | null = null;

const defaultConfig: MockConfig = {
  mode: "normal",
  latencyMs: 100,
  errorSimulation: {
    create: { enabled: false, errorType: "none", statusCode: 500, message: "Simulated server error" },
    update: { enabled: false, errorType: "none", statusCode: 500, message: "Simulated server error" },
    archive: { enabled: false, errorType: "none", statusCode: 500, message: "Simulated server error" },
    restore: { enabled: false, errorType: "none", statusCode: 500, message: "Simulated server error" },
    delete: { enabled: false, errorType: "none", statusCode: 500, message: "Simulated server error" },
    reassignOwner: { enabled: false, errorType: "none", statusCode: 500, message: "Simulated server error" },
  },
};

/**
 * Load mock configuration from file
 * Falls back to default config if file doesn't exist or is invalid
 * Only works in Node.js environment (server-side)
 */
export function loadMockConfig(): MockConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Check if running in Node.js environment
  if (typeof window !== "undefined") {
    // Browser environment - return default config
    cachedConfig = defaultConfig;
    return cachedConfig;
  }

  try {
    // Use require for synchronous loading of Node.js modules
    // This is intentional for server-side only code
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require("fs");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require("path");

    const configPath = path.join(process.cwd(), "mocks", "config", "org-management-mock.json");
    
    // Check if file exists
    if (!fs.existsSync(configPath)) {
      cachedConfig = defaultConfig;
      return cachedConfig;
    }

    const configFile = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configFile);

    // Merge with defaults to ensure all fields exist
    cachedConfig = {
      mode: config.mode || defaultConfig.mode,
      latencyMs: config.latencyMs || defaultConfig.latencyMs,
      errorSimulation: {
        create: { ...defaultConfig.errorSimulation.create, ...config.errorSimulation?.create },
        update: { ...defaultConfig.errorSimulation.update, ...config.errorSimulation?.update },
        archive: { ...defaultConfig.errorSimulation.archive, ...config.errorSimulation?.archive },
        restore: { ...defaultConfig.errorSimulation.restore, ...config.errorSimulation?.restore },
        delete: { ...defaultConfig.errorSimulation.delete, ...config.errorSimulation?.delete },
        reassignOwner: { ...defaultConfig.errorSimulation.reassignOwner, ...config.errorSimulation?.reassignOwner },
      },
    };

    return cachedConfig;
  } catch (error) {
    if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
      console.warn("Failed to load mock config, using defaults:", error);
    }
    cachedConfig = defaultConfig;
    return cachedConfig;
  }
}

/**
 * Clear cached config (useful for testing)
 */
export function clearMockConfigCache(): void {
  cachedConfig = null;
}

/**
 * Simulate artificial latency
 */
export async function simulateLatency(ms?: number): Promise<void> {
  const config = loadMockConfig();
  const delay = ms ?? config.latencyMs;
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Check if error simulation is enabled for an operation
 * Returns error details if enabled, null otherwise
 */
export function checkErrorSimulation(
  operation: keyof MockConfig["errorSimulation"]
): { statusCode: number; message: string; errorType: ErrorType } | null {
  const config = loadMockConfig();
  const errorConfig = config.errorSimulation[operation];

  if (errorConfig.enabled && errorConfig.errorType !== "none") {
    return {
      statusCode: errorConfig.statusCode,
      message: errorConfig.message,
      errorType: errorConfig.errorType,
    };
  }

  return null;
}
