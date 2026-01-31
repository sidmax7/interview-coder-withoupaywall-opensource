// ConfigHelper.ts
import fs from "node:fs"
import path from "node:path"
import { app } from "electron"
import { EventEmitter } from "events"

interface Config {
  apiKey: string;
  apiProvider: "gemini" | "lmstudio";  // Only Gemini and LM Studio supported
  extractionModel: string;
  solutionModel: string;
  debuggingModel: string;
  language: string;
  opacity: number;
  lmstudioEndpoint: string;  // LM Studio server endpoint
  lmstudioModel: string;     // Model name in LM Studio
}

export class ConfigHelper extends EventEmitter {
  private configPath: string;
  private defaultConfig: Config = {
    apiKey: "",
    apiProvider: "gemini", // Default to Gemini
    extractionModel: "gemini-2.0-flash", // Default to Flash for faster responses
    solutionModel: "gemini-2.0-flash",
    debuggingModel: "gemini-2.0-flash",
    language: "python",
    opacity: 1.0,
    lmstudioEndpoint: "http://localhost:1234/v1",  // Default LM Studio endpoint
    lmstudioModel: "qwen3-vl-8b"  // Default model for LM Studio
  };

  constructor() {
    super();
    // Use the app's user data directory to store the config
    try {
      this.configPath = path.join(app.getPath('userData'), 'config.json');
      console.log('Config path:', this.configPath);
    } catch (err) {
      console.warn('Could not access user data path, using fallback');
      this.configPath = path.join(process.cwd(), 'config.json');
    }

    // Ensure the initial config file exists
    this.ensureConfigExists();
  }

  /**
   * Ensure config file exists
   */
  private ensureConfigExists(): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        this.saveConfig(this.defaultConfig);
      }
    } catch (err) {
      console.error("Error ensuring config exists:", err);
    }
  }

  /**
   * Validate and sanitize model selection to ensure only allowed models are used
   */
  private sanitizeModelSelection(model: string, provider: "gemini" | "lmstudio"): string {
    if (provider === "gemini") {
      // Only allow Gemini models
      const GEMINI_MODELS = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.5-pro",
        "gemini-2.0-flash-lite",
        "gemini-3-pro-preview",
        "gemini-3-flash-preview"
      ];
      if (!GEMINI_MODELS.includes(model)) {
        console.warn(`Invalid Gemini model specified: ${model}. Using default model: gemini-2.5-flash`);
        return 'gemini-2.5-flash';
      }
      return model;
    } else if (provider === "lmstudio") {
      // LM Studio accepts any model name - no validation needed
      return model;
    }
    // Default fallback
    return model;
  }

  public loadConfig(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const config = JSON.parse(configData);

        // Ensure apiProvider is a valid value (only gemini or lmstudio supported)
        if (config.apiProvider !== "gemini" && config.apiProvider !== "lmstudio") {
          config.apiProvider = "gemini"; // Default to Gemini if invalid
        }

        // Sanitize model selections to ensure only allowed models are used
        if (config.extractionModel) {
          config.extractionModel = this.sanitizeModelSelection(config.extractionModel, config.apiProvider);
        }
        if (config.solutionModel) {
          config.solutionModel = this.sanitizeModelSelection(config.solutionModel, config.apiProvider);
        }
        if (config.debuggingModel) {
          config.debuggingModel = this.sanitizeModelSelection(config.debuggingModel, config.apiProvider);
        }

        return {
          ...this.defaultConfig,
          ...config
        };
      }

      // If no config exists, create a default one
      this.saveConfig(this.defaultConfig);
      return this.defaultConfig;
    } catch (err) {
      console.error("Error loading config:", err);
      return this.defaultConfig;
    }
  }

  /**
   * Save configuration to disk
   */
  public saveConfig(config: Config): void {
    try {
      // Ensure the directory exists
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      // Write the config file
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (err) {
      console.error("Error saving config:", err);
    }
  }

  /**
   * Update specific configuration values
   */
  public updateConfig(updates: Partial<Config>): Config {
    try {
      const currentConfig = this.loadConfig();
      let provider = updates.apiProvider || currentConfig.apiProvider;

      // If provider is changing, reset models to the default for that provider
      if (updates.apiProvider && updates.apiProvider !== currentConfig.apiProvider) {
        if (updates.apiProvider === "lmstudio") {
          // LM Studio uses a single model for all tasks
          const lmModel = currentConfig.lmstudioModel || "qwen3-vl-8b";
          updates.extractionModel = lmModel;
          updates.solutionModel = lmModel;
          updates.debuggingModel = lmModel;
        } else {
          // Gemini (default)
          updates.extractionModel = "gemini-2.0-flash";
          updates.solutionModel = "gemini-2.0-flash";
          updates.debuggingModel = "gemini-2.0-flash";
        }
      }

      // Sanitize model selections in the updates
      if (updates.extractionModel) {
        updates.extractionModel = this.sanitizeModelSelection(updates.extractionModel, provider);
      }
      if (updates.solutionModel) {
        updates.solutionModel = this.sanitizeModelSelection(updates.solutionModel, provider);
      }
      if (updates.debuggingModel) {
        updates.debuggingModel = this.sanitizeModelSelection(updates.debuggingModel, provider);
      }

      const newConfig = { ...currentConfig, ...updates };
      this.saveConfig(newConfig);

      // Only emit update event for changes other than opacity
      // This prevents re-initializing the AI client when only opacity changes
      if (updates.apiKey !== undefined || updates.apiProvider !== undefined ||
        updates.extractionModel !== undefined || updates.solutionModel !== undefined ||
        updates.debuggingModel !== undefined || updates.language !== undefined) {
        this.emit('config-updated', newConfig);
      }

      return newConfig;
    } catch (error) {
      console.error('Error updating config:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Check if the API key is configured (or provider doesn't need one)
   */
  public hasApiKey(): boolean {
    const config = this.loadConfig();
    // LM Studio doesn't require an API key
    if (config.apiProvider === "lmstudio") {
      return true;
    }
    return !!config.apiKey && config.apiKey.trim().length > 0;
  }

  /**
   * Validate the API key format (Gemini only)
   */
  public isValidApiKeyFormat(apiKey: string): boolean {
    // Basic format validation for Gemini API keys (usually alphanumeric with no specific prefix)
    return apiKey.trim().length >= 10; // Assuming Gemini keys are at least 10 chars
  }

  /**
   * Get the stored opacity value
   */
  public getOpacity(): number {
    const config = this.loadConfig();
    return config.opacity !== undefined ? config.opacity : 1.0;
  }

  /**
   * Set the window opacity value
   */
  public setOpacity(opacity: number): void {
    // Ensure opacity is between 0.1 and 1.0
    const validOpacity = Math.min(1.0, Math.max(0.1, opacity));
    this.updateConfig({ opacity: validOpacity });
  }

  /**
   * Get the preferred programming language
   */
  public getLanguage(): string {
    const config = this.loadConfig();
    return config.language || "python";
  }

  /**
   * Set the preferred programming language
   */
  public setLanguage(language: string): void {
    this.updateConfig({ language });
  }

  /**
   * Test API key (Gemini only)
   */
  public async testApiKey(apiKey: string): Promise<{ valid: boolean, error?: string }> {
    return this.testGeminiKey(apiKey);
  }

  /**
   * Test Gemini API key
   */
  private async testGeminiKey(apiKey: string): Promise<{ valid: boolean, error?: string }> {
    try {
      // For now, we'll just do a basic check to ensure the key exists and has valid format
      if (apiKey && apiKey.trim().length >= 20) {
        return { valid: true };
      }
      return { valid: false, error: 'Invalid Gemini API key format.' };
    } catch (error: any) {
      console.error('Gemini API key test failed:', error);
      let errorMessage = 'Unknown error validating Gemini API key';

      if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      return { valid: false, error: errorMessage };
    }
  }

  /**
   * Test LM Studio connection by checking if the server is running
   */
  public async testLMStudioConnection(endpoint?: string): Promise<{ valid: boolean, error?: string }> {
    try {
      const config = this.loadConfig();
      const serverEndpoint = endpoint || config.lmstudioEndpoint || "http://localhost:1234/v1";

      // Try to reach the LM Studio models endpoint
      const response = await fetch(`${serverEndpoint}/models`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        console.log("LM Studio connection successful, available models:", data);
        return { valid: true };
      } else {
        return { valid: false, error: `LM Studio server returned status ${response.status}` };
      }
    } catch (error: any) {
      console.error('LM Studio connection test failed:', error);

      if (error.name === 'AbortError' || error.code === 'ECONNREFUSED') {
        return { valid: false, error: 'Cannot connect to LM Studio. Make sure the server is running on the specified port.' };
      }

      return { valid: false, error: error.message || 'Failed to connect to LM Studio server' };
    }
  }
}

// Export a singleton instance
export const configHelper = new ConfigHelper();
