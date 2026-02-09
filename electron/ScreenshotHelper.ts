// ScreenshotHelper.ts

import path from "node:path";
import fs from "node:fs";
import { app } from "electron";
import { v4 as uuidv4 } from "uuid";
import { execFile } from "child_process";
import { promisify } from "util";
import screenshot from "screenshot-desktop";
import os from "os";

const execFileAsync = promisify(execFile);

export class ScreenshotHelper {
  private screenshotQueue: string[] = [];
  private extraScreenshotQueue: string[] = [];
  private readonly MAX_SCREENSHOTS = 5;

  private readonly screenshotDir: string;
  private readonly extraScreenshotDir: string;
  private readonly tempDir: string;

  private view: "queue" | "solutions" | "debug" = "queue";

  constructor(view: "queue" | "solutions" | "debug" = "queue") {
    this.view = view;

    // Initialize directories
    this.screenshotDir = path.join(app.getPath("userData"), "screenshots");
    this.extraScreenshotDir = path.join(
      app.getPath("userData"),
      "extra_screenshots"
    );
    this.tempDir = path.join(
      app.getPath("temp"),
      "interview-coder-screenshots"
    );

    // Create directories if they don't exist
    this.ensureDirectoriesExist();

    // Clean existing screenshot directories when starting the app
    this.cleanScreenshotDirectories();
  }

  private ensureDirectoriesExist(): void {
    const directories = [
      this.screenshotDir,
      this.extraScreenshotDir,
      this.tempDir,
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`Created directory: ${dir}`);
        } catch (err) {
          console.error(`Error creating directory ${dir}:`, err);
        }
      }
    }
  }

  // This method replaces loadExistingScreenshots() to ensure we start with empty queues
  private cleanScreenshotDirectories(): void {
    try {
      // Clean main screenshots directory
      if (fs.existsSync(this.screenshotDir)) {
        const files = fs
          .readdirSync(this.screenshotDir)
          .filter((file) => file.endsWith(".png"))
          .map((file) => path.join(this.screenshotDir, file));

        // Delete each screenshot file
        for (const file of files) {
          try {
            fs.unlinkSync(file);
            console.log(`Deleted existing screenshot: ${file}`);
          } catch (err) {
            console.error(`Error deleting screenshot ${file}:`, err);
          }
        }
      }

      // Clean extra screenshots directory
      if (fs.existsSync(this.extraScreenshotDir)) {
        const files = fs
          .readdirSync(this.extraScreenshotDir)
          .filter((file) => file.endsWith(".png"))
          .map((file) => path.join(this.extraScreenshotDir, file));

        // Delete each screenshot file
        for (const file of files) {
          try {
            fs.unlinkSync(file);
            console.log(`Deleted existing extra screenshot: ${file}`);
          } catch (err) {
            console.error(`Error deleting extra screenshot ${file}:`, err);
          }
        }
      }

      console.log("Screenshot directories cleaned successfully");
    } catch (err) {
      console.error("Error cleaning screenshot directories:", err);
    }
  }

  public getView(): "queue" | "solutions" | "debug" {
    return this.view;
  }

  public setView(view: "queue" | "solutions" | "debug"): void {
    console.log("Setting view in ScreenshotHelper:", view);
    console.log(
      "Current queues - Main:",
      this.screenshotQueue,
      "Extra:",
      this.extraScreenshotQueue
    );
    this.view = view;
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotQueue;
  }

  public getExtraScreenshotQueue(): string[] {
    console.log("Getting extra screenshot queue:", this.extraScreenshotQueue);
    return this.extraScreenshotQueue;
  }

  public clearQueues(): void {
    // Clear screenshotQueue
    this.screenshotQueue.forEach((screenshotPath) => {
      fs.unlink(screenshotPath, (err) => {
        if (err)
          console.error(`Error deleting screenshot at ${screenshotPath}:`, err);
      });
    });
    this.screenshotQueue = [];

    // Clear extraScreenshotQueue
    this.extraScreenshotQueue.forEach((screenshotPath) => {
      fs.unlink(screenshotPath, (err) => {
        if (err)
          console.error(
            `Error deleting extra screenshot at ${screenshotPath}:`,
            err
          );
      });
    });
    this.extraScreenshotQueue = [];
  }

  private async captureScreenshot(): Promise<Buffer> {
    try {
      console.log("Starting screenshot capture...");

      // For Windows, try multiple methods
      if (process.platform === "win32") {
        return await this.captureWindowsScreenshot();
      }

      // For macOS and Linux, use buffer directly
      console.log("Taking screenshot on non-Windows platform");
      const buffer = await screenshot({ format: "png" });
      console.log(
        `Screenshot captured successfully, size: ${buffer.length} bytes`
      );
      return buffer;
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to capture screenshot: ${errorMsg}`);
    }
  }

  /**
   * Helper to wrap a promise with a timeout
   */
  private withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(errorMessage));
      }, ms);

      promise
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
    });
  }

  /**
   * Validate that a buffer contains a valid PNG image
   */
  private isValidPng(buffer: Buffer): boolean {
    // PNG signature: 137 80 78 71 13 10 26 10
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (buffer.length < 8) return false;
    return buffer.subarray(0, 8).equals(pngSignature);
  }

  /**
   * Clean up any stale temp files from previous failed attempts
   */
  private async cleanupTempFiles(): Promise<void> {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        const now = Date.now();
        for (const file of files) {
          const filePath = path.join(this.tempDir, file);
          try {
            const stats = fs.statSync(filePath);
            // Delete files older than 5 minutes
            if (now - stats.mtimeMs > 5 * 60 * 1000) {
              fs.unlinkSync(filePath);
              console.log(`Cleaned up stale temp file: ${filePath}`);
            }
          } catch (err) {
            // Ignore errors for individual files
          }
        }
      }
    } catch (err) {
      console.warn("Error cleaning up temp files:", err);
    }
  }

  /**
   * Windows-specific screenshot capture with multiple fallback mechanisms
   */
  private async captureWindowsScreenshot(): Promise<Buffer> {
    console.log("Attempting Windows screenshot with multiple methods");

    // Clean up any stale temp files first
    await this.cleanupTempFiles();

    const errors: string[] = [];
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Screenshot attempt ${attempt}/${maxRetries}`);

      // Method 1: Try screenshot-desktop with filename first
      try {
        const tempFile = path.join(this.tempDir, `temp-${uuidv4()}.png`);
        console.log(
          `Taking Windows screenshot to temp file (Method 1): ${tempFile}`
        );

        // Add timeout to screenshot-desktop (5 seconds)
        await this.withTimeout(
          screenshot({ filename: tempFile, screen: 0 }),
          5000,
          "screenshot-desktop timed out after 5 seconds"
        );

        if (fs.existsSync(tempFile)) {
          const buffer = await fs.promises.readFile(tempFile);
          console.log(
            `Method 1 captured, screenshot size: ${buffer.length} bytes`
          );

          // Validate PNG format
          if (!this.isValidPng(buffer)) {
            console.warn("Method 1 produced invalid PNG, trying next method");
            throw new Error("Invalid PNG format");
          }

          // Check for reasonable size (at least 1KB for a real screenshot)
          if (buffer.length < 1024) {
            console.warn("Method 1 produced suspiciously small image, trying next method");
            throw new Error("Screenshot too small - likely invalid");
          }

          // Cleanup temp file
          try {
            await fs.promises.unlink(tempFile);
          } catch (cleanupErr) {
            console.warn("Failed to clean up temp file:", cleanupErr);
          }

          console.log(`Method 1 successful on attempt ${attempt}`);
          return buffer;
        } else {
          console.log("Method 1 failed: File not created");
          throw new Error("Screenshot file not created");
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`Windows screenshot Method 1 failed (attempt ${attempt}):`, errorMsg);
        errors.push(`Method 1 (attempt ${attempt}): ${errorMsg}`);

        // Method 2: Try using PowerShell
        try {
          console.log("Attempting Windows screenshot with PowerShell (Method 2)");
          const tempFile = path.join(this.tempDir, `ps-temp-${uuidv4()}.png`);

          // PowerShell command to take screenshot using .NET classes - PRIMARY SCREEN ONLY
          // Added explicit error handling and verification in PowerShell script
          const psScript = `
          try {
            Add-Type -AssemblyName System.Windows.Forms,System.Drawing
            $primaryScreen = [System.Windows.Forms.Screen]::PrimaryScreen
            if ($null -eq $primaryScreen) {
              throw "No primary screen detected"
            }
            $bounds = $primaryScreen.Bounds
            if ($bounds.Width -le 0 -or $bounds.Height -le 0) {
              throw "Invalid screen bounds: $($bounds.Width)x$($bounds.Height)"
            }
            Write-Host "Capturing screen: $($bounds.Width)x$($bounds.Height)"
            $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
            $graphics = [System.Drawing.Graphics]::FromImage($bmp)
            $graphics.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bounds.Size)
            $bmp.Save('${tempFile.replace(/\\/g, "\\\\")}', [System.Drawing.Imaging.ImageFormat]::Png)
            $graphics.Dispose()
            $bmp.Dispose()
            Write-Host "Screenshot saved successfully"
          } catch {
            Write-Error $_.Exception.Message
            exit 1
          }
          `;

          // Execute PowerShell with timeout (10 seconds)
          await this.withTimeout(
            execFileAsync("powershell", [
              "-NoProfile",
              "-ExecutionPolicy",
              "Bypass",
              "-Command",
              psScript,
            ]),
            10000,
            "PowerShell screenshot timed out after 10 seconds"
          );

          // Check if file exists and read it
          if (fs.existsSync(tempFile)) {
            const buffer = await fs.promises.readFile(tempFile);
            console.log(
              `Method 2 captured, screenshot size: ${buffer.length} bytes`
            );

            // Validate PNG format
            if (!this.isValidPng(buffer)) {
              console.warn("Method 2 produced invalid PNG");
              throw new Error("Invalid PNG format from PowerShell");
            }

            // Check for reasonable size
            if (buffer.length < 1024) {
              console.warn("Method 2 produced suspiciously small image");
              throw new Error("PowerShell screenshot too small - likely invalid");
            }

            // Cleanup
            try {
              await fs.promises.unlink(tempFile);
            } catch (err) {
              console.warn("Failed to clean up PowerShell temp file:", err);
            }

            console.log(`Method 2 successful on attempt ${attempt}`);
            return buffer;
          } else {
            throw new Error("PowerShell screenshot file not created");
          }
        } catch (psError) {
          const psErrorMsg = psError instanceof Error ? psError.message : String(psError);
          console.warn(`Windows PowerShell screenshot failed (attempt ${attempt}):`, psErrorMsg);
          errors.push(`Method 2 (attempt ${attempt}): ${psErrorMsg}`);
        }
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = 200 * Math.pow(2, attempt - 1); // 200ms, 400ms, 800ms
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // All attempts failed - throw comprehensive error
    const errorSummary = errors.join("; ");
    console.error("All screenshot methods failed after retries:", errorSummary);
    throw new Error(
      `Could not capture screenshot after ${maxRetries} attempts. Errors: ${errorSummary}`
    );
  }

  /**
   * Take a screenshot and add it to the appropriate queue.
   * Note: Window hide/show is not needed as the app window is excluded from screen capture.
   */
  public async takeScreenshot(): Promise<string> {
    console.log("Taking screenshot in view:", this.view);

    let screenshotPath = "";
    try {
      // Get screenshot buffer using cross-platform method
      const screenshotBuffer = await this.captureScreenshot();

      if (!screenshotBuffer || screenshotBuffer.length === 0) {
        throw new Error("Screenshot capture returned empty buffer");
      }

      // Validate PNG format
      if (!this.isValidPng(screenshotBuffer)) {
        throw new Error("Captured screenshot is not a valid PNG");
      }

      // Save and manage the screenshot based on current view
      if (this.view === "queue") {
        screenshotPath = path.join(this.screenshotDir, `${uuidv4()}.png`);
        const screenshotDir = path.dirname(screenshotPath);
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }
        await fs.promises.writeFile(screenshotPath, screenshotBuffer);
        console.log("Adding screenshot to main queue:", screenshotPath);
        this.screenshotQueue.push(screenshotPath);
        if (this.screenshotQueue.length > this.MAX_SCREENSHOTS) {
          const removedPath = this.screenshotQueue.shift();
          if (removedPath) {
            try {
              await fs.promises.unlink(removedPath);
              console.log(
                "Removed old screenshot from main queue:",
                removedPath
              );
            } catch (error) {
              console.error("Error removing old screenshot:", error);
            }
          }
        }
      } else {
        // In solutions view, only add to extra queue
        screenshotPath = path.join(this.extraScreenshotDir, `${uuidv4()}.png`);
        const screenshotDir = path.dirname(screenshotPath);
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }
        await fs.promises.writeFile(screenshotPath, screenshotBuffer);
        console.log("Adding screenshot to extra queue:", screenshotPath);
        this.extraScreenshotQueue.push(screenshotPath);
        if (this.extraScreenshotQueue.length > this.MAX_SCREENSHOTS) {
          const removedPath = this.extraScreenshotQueue.shift();
          if (removedPath) {
            try {
              await fs.promises.unlink(removedPath);
              console.log(
                "Removed old screenshot from extra queue:",
                removedPath
              );
            } catch (error) {
              console.error("Error removing old screenshot:", error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Screenshot error:", error);
      throw error;
    }

    return screenshotPath;
  }

  public async getImagePreview(filepath: string): Promise<string> {
    try {
      if (!fs.existsSync(filepath)) {
        console.error(`Image file not found: ${filepath}`);
        return "";
      }

      const data = await fs.promises.readFile(filepath);
      return `data:image/png;base64,${data.toString("base64")}`;
    } catch (error) {
      console.error("Error reading image:", error);
      return "";
    }
  }

  public async deleteScreenshot(
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (fs.existsSync(path)) {
        await fs.promises.unlink(path);
      }

      if (this.view === "queue") {
        this.screenshotQueue = this.screenshotQueue.filter(
          (filePath) => filePath !== path
        );
      } else {
        this.extraScreenshotQueue = this.extraScreenshotQueue.filter(
          (filePath) => filePath !== path
        );
      }
      return { success: true };
    } catch (error) {
      console.error("Error deleting file:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMsg };
    }
  }

  public clearExtraScreenshotQueue(): void {
    // Clear extraScreenshotQueue
    this.extraScreenshotQueue.forEach((screenshotPath) => {
      if (fs.existsSync(screenshotPath)) {
        fs.unlink(screenshotPath, (err) => {
          if (err)
            console.error(
              `Error deleting extra screenshot at ${screenshotPath}:`,
              err
            );
        });
      }
    });
    this.extraScreenshotQueue = [];
  }
}
