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

  // Granular settings
  const [extractionProvider, setExtractionProvider] = useState<APIProvider>("gemini");
  const [solutionProvider, setSolutionProvider] = useState<APIProvider>("gemini");
  const [debuggingProvider, setDebuggingProvider] = useState<APIProvider>("gemini");

  const [extractionModel, setExtractionModel] = useState("gemini-3-flash-preview");
  const [solutionModel, setSolutionModel] = useState("gemini-3-flash-preview");
  const [debuggingModel, setDebuggingModel] = useState("gemini-3-flash-preview");

  const [systemPrompt, setSystemPrompt] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [lmstudioEndpoint, setLmstudioEndpoint] = useState("http://localhost:1234/v1");
  const [lmstudioModel, setLmstudioModel] = useState("zai-org/glm-4.6v-flash");

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
    if (onOpenChange && newOpen !== externalOpen) {
      onOpenChange(newOpen);
    }
  };

  // Load current config on dialog open
  useEffect(() => {
    if (open) {
      setIsLoading(true);

      window.electronAPI
        .getConfig()
        .then((config: any) => {
          setApiKey(config.apiKey || "");

          // Load granular providers (fallback to global apiProvider if missing)
          const fallbackProvider = config.apiProvider || "gemini";
          setExtractionProvider(config.extractionProvider || fallbackProvider);
          setSolutionProvider(config.solutionProvider || fallbackProvider);
          setDebuggingProvider(config.debuggingProvider || fallbackProvider);

          setExtractionModel(config.extractionModel || "gemini-3-flash-preview");
          setSolutionModel(config.solutionModel || "gemini-3-flash-preview");
          setDebuggingModel(config.debuggingModel || "gemini-3-flash-preview");

          setSystemPrompt(config.systemPrompt || "");

          setLmstudioEndpoint(config.lmstudioEndpoint || "http://localhost:1234/v1");
          setLmstudioModel(config.lmstudioModel || "zai-org/glm-4.6v-flash");
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

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const configUpdate: Record<string, any> = {
        extractionProvider,
        solutionProvider,
        debuggingProvider,
        extractionModel,
        solutionModel,
        debuggingModel,
        systemPrompt,
        lmstudioEndpoint,
        lmstudioModel
      };

      // Check if ANY provider is Gemini to decide if we need the API key
      const usesGemini = extractionProvider === "gemini" || solutionProvider === "gemini" || debuggingProvider === "gemini";

      if (usesGemini) {
        configUpdate.apiKey = apiKey;
      }

      // Update global apiProvider based on extraction for backward compatibility/simplicity
      configUpdate.apiProvider = extractionProvider;

      const result = await window.electronAPI.updateConfig(configUpdate);

      if (result) {
        showToast("Success", "Settings saved successfully", "success");
        handleOpenChange(false);
        // Force reload to apply changes
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

  const maskApiKey = (key: string) => {
    if (!key || key.length < 10) return "";
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

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
          width: 'min(550px, 95vw)',
          height: 'auto',
          minHeight: '500px',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 9999,
          margin: 0,
          padding: '20px',
        }}
      >
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="text-white/70">
            Configure AI providers, models, and system prompts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">

          {/* General Gemini Configuration */}
          <div className="space-y-3 pb-4 border-b border-white/10">
            <h3 className="text-sm font-medium text-white mb-2">Gemini Configuration</h3>
            <div className="space-y-2">
              <label className="text-xs text-white/70">API Key (Required for Gemini providers)</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter Gemini API Key"
                className="bg-black/50 border-white/10 text-white"
              />
              {apiKey && <p className="text-[10px] text-white/40">{maskApiKey(apiKey)}</p>}
            </div>
            <p className="text-[10px] text-white/50">
              Get your key from <span className="text-blue-400 cursor-pointer hover:underline" onClick={() => openExternalLink('https://aistudio.google.com/app/apikey')}>Google AI Studio</span>.
            </p>
          </div>

          {/* LM Studio Configuration */}
          <div className="space-y-3 pb-4 border-b border-white/10">
            <h3 className="text-sm font-medium text-white mb-2">LM Studio Configuration</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-white/70">Server URL</label>
                <Input
                  value={lmstudioEndpoint}
                  onChange={(e) => setLmstudioEndpoint(e.target.value)}
                  placeholder="http://localhost:1234/v1"
                  className="bg-black/50 border-white/10 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-white/70">Model ID</label>
                <Input
                  value={lmstudioModel}
                  onChange={(e) => setLmstudioModel(e.target.value)}
                  placeholder="qwen3-vl-8b"
                  className="bg-black/50 border-white/10 text-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div className="space-y-2 pb-4 border-b border-white/10">
            <label className="text-sm font-medium text-white">System Prompt</label>
            <p className="text-xs text-white/60">Custom instructions for valid requests (e.g. "Answer in pirate speak")</p>
            <textarea
              className="w-full h-20 bg-black/50 border border-white/10 rounded-md p-2 text-xs text-white resize-none focus:outline-none focus:border-white/30"
              placeholder="You are a helpful assistant..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>

          {/* Workflow Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white">Workflow Configuration</h3>

            {modelCategories.map((category) => {
              let currentProvider: APIProvider;
              let setProvider: (p: APIProvider) => void;
              let currentValue: string;
              let setValue: (v: string) => void;

              if (category.key === 'extractionModel') {
                currentProvider = extractionProvider;
                setProvider = setExtractionProvider;
                currentValue = extractionModel;
                setValue = setExtractionModel;
              } else if (category.key === 'solutionModel') {
                currentProvider = solutionProvider;
                setProvider = setSolutionProvider;
                currentValue = solutionModel;
                setValue = setSolutionModel;
              } else {
                currentProvider = debuggingProvider;
                setProvider = setDebuggingProvider;
                currentValue = debuggingModel;
                setValue = setDebuggingModel;
              }

              return (
                <div key={category.key} className="space-y-3 pb-4 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-white">{category.title}</label>
                      <p className="text-[10px] text-white/60">{category.description}</p>
                    </div>
                    {/* Provider Toggle */}
                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                      <button
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${currentProvider === 'gemini' ? 'bg-white text-black font-medium' : 'text-white/60 hover:text-white'}`}
                        onClick={() => setProvider('gemini')}
                      >
                        Gemini
                      </button>
                      <button
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${currentProvider === 'lmstudio' ? 'bg-white text-black font-medium' : 'text-white/60 hover:text-white'}`}
                        onClick={() => setProvider('lmstudio')}
                      >
                        LM Studio
                      </button>
                    </div>
                  </div>

                  {/* Model Selection (only for Gemini) */}
                  {currentProvider === 'gemini' && (
                    <div className="grid grid-cols-1 gap-1 pl-2 border-l border-white/10">
                      {category.geminiModels.map((m) => (
                        <div
                          key={m.id}
                          className={`p-2 rounded-lg cursor-pointer flex items-center gap-2 transition-colors ${currentValue === m.id
                            ? "bg-white/10 border border-white/20"
                            : "hover:bg-white/5 border border-transparent"
                            }`}
                          onClick={() => setValue(m.id)}
                        >
                          <div className={`w-2 h-2 rounded-full ${currentValue === m.id ? "bg-green-400" : "bg-white/10"}`} />
                          <div className="flex-1">
                            <p className="font-medium text-white text-xs">{m.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {currentProvider === 'lmstudio' && (
                    <div className="pl-2 border-l border-white/10 text-[10px] text-white/50 italic py-1">
                      Using model defined in LM Studio Configuration
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-white/10">
            <h3 className="text-xs font-medium text-white mb-2">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-y-1 text-[10px] text-white/60">
              <span>Toggle Visibility</span> <span className="text-white/80 font-mono">Ctrl+B</span>
              <span>Take Screenshot</span> <span className="text-white/80 font-mono">Ctrl+H</span>
              <span>Process</span> <span className="text-white/80 font-mono">Ctrl+Enter</span>
              <span>Quit</span> <span className="text-white/80 font-mono">Ctrl+Q</span>
            </div>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="border-white/10 text-white hover:bg-white/5">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="bg-white text-black hover:bg-white/90">
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
