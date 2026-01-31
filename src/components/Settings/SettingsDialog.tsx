import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Settings } from "lucide-react";
import { useToast } from "../../contexts/toast";

type APIProvider = "gemini" | "lmstudio";  // Only Gemini and LM Studio supported

type AIModel = {
  id: string;
  name: string;
  description: string;
};

type ModelCategory = {
  key: 'extractionModel' | 'solutionModel' | 'debuggingModel';
  title: string;
  description: string;
  geminiModels: AIModel[];
  lmstudioModels?: AIModel[];  // Optional for LM Studio
};

// Define available models for each category
const modelCategories: ModelCategory[] = [
  {
    key: 'extractionModel',
    title: 'Problem Extraction',
    description: 'Model used to analyze screenshots and extract problem details',
    geminiModels: [
      {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        description: "Best overall performance for problem extraction"
      },
      {
        id: "gemini-3-flash-preview",
        name: "Gemini 3 Flash Preview",
        description: "Latest experimental model"
      },
      {
        id: "gemini-3-pro-preview",
        name: "Gemini 3 Pro Preview",
        description: "Latest pro experimental model"
      },
      {
        id: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        description: "Fast and cost-effective option"
      },
      {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        description: "Most capable model for complex tasks"
      }
    ]
  },
  {
    key: 'solutionModel',
    title: 'Solution Generation',
    description: 'Model used to generate coding solutions',
    geminiModels: [
      {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        description: "Strong overall performance for coding tasks"
      },
      {
        id: "gemini-3-flash-preview",
        name: "Gemini 3 Flash Preview",
        description: "Latest experimental model"
      },
      {
        id: "gemini-3-pro-preview",
        name: "Gemini 3 Pro Preview",
        description: "Latest pro experimental model"
      },
      {
        id: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        description: "Fast and cost-effective option"
      },
      {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        description: "Most capable model for complex tasks"
      }
    ]
  },
  {
    key: 'debuggingModel',
    title: 'Debugging',
    description: 'Model used to debug and improve solutions',
    geminiModels: [
      {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        description: "Best for analyzing code and error messages"
      },
      {
        id: "gemini-3-flash-preview",
        name: "Gemini 3 Flash Preview",
        description: "Latest experimental model"
      },
      {
        id: "gemini-3-pro-preview",
        name: "Gemini 3 Pro Preview",
        description: "Latest pro experimental model"
      },
      {
        id: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        description: "Fast and cost-effective option"
      },
      {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        description: "Most capable model for complex tasks"
      }
    ]
  }
];

interface SettingsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SettingsDialog({ open: externalOpen, onOpenChange }: SettingsDialogProps) {
  const [open, setOpen] = useState(externalOpen || false);
  const [apiKey, setApiKey] = useState("");
  const [apiProvider, setApiProvider] = useState<APIProvider>("gemini");
  const [extractionModel, setExtractionModel] = useState("gemini-2.5-flash");
  const [solutionModel, setSolutionModel] = useState("gemini-2.5-flash");
  const [debuggingModel, setDebuggingModel] = useState("gemini-2.5-flash");
  const [isLoading, setIsLoading] = useState(false);
  const [lmstudioEndpoint, setLmstudioEndpoint] = useState("http://localhost:1234/v1");
  const [lmstudioModel, setLmstudioModel] = useState("qwen3-vl-8b");
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const { showToast } = useToast();

  // Sync with external open state
  useEffect(() => {
    if (externalOpen !== undefined) {
      setOpen(externalOpen);
    }
  }, [externalOpen]);

  // Handle open state changes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    // Only call onOpenChange when there's actually a change
    if (onOpenChange && newOpen !== externalOpen) {
      onOpenChange(newOpen);
    }
  };

  // Load current config on dialog open
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      interface Config {
        apiKey?: string;
        apiProvider?: APIProvider;
        extractionModel?: string;
        solutionModel?: string;
        debuggingModel?: string;
        lmstudioEndpoint?: string;
        lmstudioModel?: string;
      }

      window.electronAPI
        .getConfig()
        .then((config: Config) => {
          setApiKey(config.apiKey || "");
          setApiProvider(config.apiProvider || "gemini");
          setExtractionModel(config.extractionModel || "gemini-2.5-flash");
          setSolutionModel(config.solutionModel || "gemini-2.5-flash");
          setDebuggingModel(config.debuggingModel || "gemini-2.5-flash");
          setLmstudioEndpoint(config.lmstudioEndpoint || "http://localhost:1234/v1");
          setLmstudioModel(config.lmstudioModel || "qwen3-vl-8b");
        })
        .catch((error: unknown) => {
          console.error("Failed to load config:", error);
          showToast("Error", "Failed to load settings", "error");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, showToast]);

  // Handle API provider change
  const handleProviderChange = (provider: APIProvider) => {
    setApiProvider(provider);

    // Reset models to defaults when changing provider
    if (provider === "gemini") {
      setExtractionModel("gemini-2.5-flash");
      setSolutionModel("gemini-2.5-flash");
      setDebuggingModel("gemini-2.5-flash");
    } else if (provider === "lmstudio") {
      // LM Studio uses a single model for all tasks
      setExtractionModel(lmstudioModel);
      setSolutionModel(lmstudioModel);
      setDebuggingModel(lmstudioModel);
      setConnectionStatus("idle");
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const configUpdate: Record<string, any> = {
        apiProvider,
        extractionModel,
        solutionModel,
        debuggingModel,
      };

      // Only include API key for non-LM Studio providers
      if (apiProvider !== "lmstudio") {
        configUpdate.apiKey = apiKey;
      } else {
        // Include LM Studio-specific config
        configUpdate.lmstudioEndpoint = lmstudioEndpoint;
        configUpdate.lmstudioModel = lmstudioModel;
        configUpdate.apiKey = ""; // Clear API key for LM Studio
      }

      const result = await window.electronAPI.updateConfig(configUpdate);

      if (result) {
        showToast("Success", "Settings saved successfully", "success");
        handleOpenChange(false);

        // Force reload the app to apply the API key
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      showToast("Error", "Failed to save settings", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Mask API key for display
  const maskApiKey = (key: string) => {
    if (!key || key.length < 10) return "";
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  // Open external link handler
  const openExternalLink = (url: string) => {
    window.electronAPI.openLink(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-black border border-white/10 text-white settings-dialog"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(450px, 90vw)',
          height: 'auto',
          minHeight: '400px',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 9999,
          margin: 0,
          padding: '20px',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          animation: 'fadeIn 0.25s ease forwards',
          opacity: 0.98
        }}
      >
        <DialogHeader>
          <DialogTitle>API Settings</DialogTitle>
          <DialogDescription className="text-white/70">
            Configure your API key and model preferences. You'll need your own API key to use this application.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* API Provider Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">API Provider</label>
            <div className="flex gap-2">
              <div
                className={`flex-1 p-2 rounded-lg cursor-pointer transition-colors ${apiProvider === "gemini"
                  ? "bg-white/10 border border-white/20"
                  : "bg-black/30 border border-white/5 hover:bg-white/5"
                  }`}
                onClick={() => handleProviderChange("gemini")}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${apiProvider === "gemini" ? "bg-white" : "bg-white/20"
                      }`}
                  />
                  <div className="flex flex-col">
                    <p className="font-medium text-white text-sm">Gemini</p>
                    <p className="text-xs text-white/60">Gemini 1.5 models</p>
                  </div>
                </div>
              </div>
              <div
                className={`flex-1 p-2 rounded-lg cursor-pointer transition-colors ${apiProvider === "lmstudio"
                  ? "bg-white/10 border border-white/20"
                  : "bg-black/30 border border-white/5 hover:bg-white/5"
                  }`}
                onClick={() => handleProviderChange("lmstudio")}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${apiProvider === "lmstudio" ? "bg-white" : "bg-white/20"
                      }`}
                  />
                  <div className="flex flex-col">
                    <p className="font-medium text-white text-sm">LM Studio</p>
                    <p className="text-xs text-white/60">Local models</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {apiProvider === "lmstudio" ? (
              // LM Studio endpoint configuration
              <>
                <label className="text-sm font-medium text-white" htmlFor="lmEndpoint">
                  LM Studio Server URL
                </label>
                <Input
                  id="lmEndpoint"
                  type="text"
                  value={lmstudioEndpoint}
                  onChange={(e) => setLmstudioEndpoint(e.target.value)}
                  placeholder="http://localhost:1234/v1"
                  className="bg-black/50 border-white/10 text-white"
                />
                <div className="mt-2">
                  <label className="text-sm font-medium text-white" htmlFor="lmModel">
                    Model Name
                  </label>
                  <Input
                    id="lmModel"
                    type="text"
                    value={lmstudioModel}
                    onChange={(e) => setLmstudioModel(e.target.value)}
                    placeholder="qwen3-vl-8b"
                    className="bg-black/50 border-white/10 text-white mt-1"
                  />
                </div>
                <div className="mt-2 p-2 rounded-md bg-white/5 border border-white/10">
                  <p className="text-xs text-white/80 mb-1">Setup Instructions:</p>
                  <p className="text-xs text-white/60 mb-1">1. Download and install LM Studio</p>
                  <p className="text-xs text-white/60 mb-1">2. Load a vision model (e.g., Qwen3-VL-8B)</p>
                  <p className="text-xs text-white/60">3. Click "Start Server" in LM Studio (default port: 1234)</p>
                </div>
              </>
            ) : (
              // Cloud API key configuration (Gemini)
              <>
                <label className="text-sm font-medium text-white" htmlFor="apiKey">
                  Gemini API Key
                </label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key"
                  className="bg-black/50 border-white/10 text-white"
                />
                {apiKey && (
                  <p className="text-xs text-white/50">
                    Current: {maskApiKey(apiKey)}
                  </p>
                )}
                <p className="text-xs text-white/50">
                  Your API key is stored locally and never sent to any server except Google
                </p>
                <div className="mt-2 p-2 rounded-md bg-white/5 border border-white/10">
                  <p className="text-xs text-white/80 mb-1">Don't have an API key?</p>
                  <p className="text-xs text-white/60 mb-1">1. Create an account at <button
                    onClick={() => openExternalLink('https://aistudio.google.com/')}
                    className="text-blue-400 hover:underline cursor-pointer">Google AI Studio</button>
                  </p>
                  <p className="text-xs text-white/60 mb-1">2. Go to the <button
                    onClick={() => openExternalLink('https://aistudio.google.com/app/apikey')}
                    className="text-blue-400 hover:underline cursor-pointer">API Keys</button> section
                  </p>
                  <p className="text-xs text-white/60">3. Create a new API key and paste it here</p>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium text-white mb-2 block">Keyboard Shortcuts</label>
            <div className="bg-black/30 border border-white/10 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <div className="text-white/70">Toggle Visibility</div>
                <div className="text-white/90 font-mono">Ctrl+B / Cmd+B</div>

                <div className="text-white/70">Take Screenshot</div>
                <div className="text-white/90 font-mono">Ctrl+H / Cmd+H</div>

                <div className="text-white/70">Process Screenshots</div>
                <div className="text-white/90 font-mono">Ctrl+Enter / Cmd+Enter</div>

                <div className="text-white/70">Delete Last Screenshot</div>
                <div className="text-white/90 font-mono">Ctrl+L / Cmd+L</div>

                <div className="text-white/70">Reset View</div>
                <div className="text-white/90 font-mono">Ctrl+R / Cmd+R</div>

                <div className="text-white/70">Quit Application</div>
                <div className="text-white/90 font-mono">Ctrl+Q / Cmd+Q</div>

                <div className="text-white/70">Move Window</div>
                <div className="text-white/90 font-mono">Ctrl+Arrow Keys</div>

                <div className="text-white/70">Decrease Opacity</div>
                <div className="text-white/90 font-mono">Ctrl+[ / Cmd+[</div>

                <div className="text-white/70">Increase Opacity</div>
                <div className="text-white/90 font-mono">Ctrl+] / Cmd+]</div>

                <div className="text-white/70">Zoom Out</div>
                <div className="text-white/90 font-mono">Ctrl+- / Cmd+-</div>

                <div className="text-white/70">Reset Zoom</div>
                <div className="text-white/90 font-mono">Ctrl+0 / Cmd+0</div>

                <div className="text-white/70">Zoom In</div>
                <div className="text-white/90 font-mono">Ctrl+= / Cmd+=</div>
              </div>
            </div>
          </div>

          {apiProvider !== "lmstudio" && (
            <div className="space-y-4 mt-4">
              <label className="text-sm font-medium text-white">AI Model Selection</label>
              <p className="text-xs text-white/60 -mt-3 mb-2">
                Select which models to use for each stage of the process
              </p>

              {modelCategories.map((category) => {
                // Get the Gemini model list (only cloud provider now)
                const models = category.geminiModels;

                return (
                  <div key={category.key} className="mb-4">
                    <label className="text-sm font-medium text-white mb-1 block">
                      {category.title}
                    </label>
                    <p className="text-xs text-white/60 mb-2">{category.description}</p>

                    <div className="space-y-2">
                      {models.map((m) => {
                        // Determine which state to use based on category key
                        const currentValue =
                          category.key === 'extractionModel' ? extractionModel :
                            category.key === 'solutionModel' ? solutionModel :
                              debuggingModel;

                        // Determine which setter function to use
                        const setValue =
                          category.key === 'extractionModel' ? setExtractionModel :
                            category.key === 'solutionModel' ? setSolutionModel :
                              setDebuggingModel;

                        return (
                          <div
                            key={m.id}
                            className={`p-2 rounded-lg cursor-pointer transition-colors ${currentValue === m.id
                              ? "bg-white/10 border border-white/20"
                              : "bg-black/30 border border-white/5 hover:bg-white/5"
                              }`}
                            onClick={() => setValue(m.id)}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full ${currentValue === m.id ? "bg-white" : "bg-white/20"
                                  }`}
                              />
                              <div>
                                <p className="font-medium text-white text-xs">{m.name}</p>
                                <p className="text-xs text-white/60">{m.description}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-white/10 hover:bg-white/5 text-white"
          >
            Cancel
          </Button>
          <Button
            className="px-4 py-3 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-colors"
            onClick={handleSave}
            disabled={isLoading || (apiProvider !== "lmstudio" && !apiKey)}
          >
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
