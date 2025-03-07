import * as vscode from "vscode";
import { ConfigurationManager } from "./config/configuration-manager";
import { Diagnostics } from "./core/diagnostics";
import { AnalyzerService } from "./services/analyzer-service";
import { CodingStyleStatusBar } from "./ui/status-bar";
import { Debugger } from "./utils/debugger";

export class Extension {
  private static configManager: ConfigurationManager;
  private static statusBar: CodingStyleStatusBar;
  private static analyzerService: AnalyzerService;

  private constructor() {}

  private static async showMenu() {
    const isEnabled = this.configManager.isEnabled();

    const items = [
      {
        label: `${isEnabled ? "$(check) " : ""}Enable Coding Style Check`,
        description: isEnabled ? "Currently enabled" : "Currently disabled",
      },
      {
        label: `${!isEnabled ? "$(check) " : ""}Disable Coding Style Check`,
        description: !isEnabled ? "Currently disabled" : "Currently enabled",
      },
    ];

    const selected = await vscode.window.showQuickPick(items, {
      title: "Epitech Coding Style Options",
    });

    if (selected) {
      const newValue = selected.label.includes("Enable");
      await this.configManager.setEnabled(newValue);
    }
  }

  private static onConfigurationChanged(enabled: boolean) {
    if (enabled) {
      vscode.workspace.textDocuments.forEach(
        (doc) => void this.analyzeDocument(doc)
      );
    } else {
      this.statusBar.stopLoadingAnimation();
      this.statusBar.updateStatus(0);
      Diagnostics.clearDiagnostics();
    }
  }

  private static async analyzeDocument(doc: vscode.TextDocument) {
    if (!this.configManager.isEnabled()) {
      return;
    }
    this.statusBar.startAnalysis();
    const errorCount = await this.analyzerService.analyze(
      doc,
      this.extensionContext
    );
    if (errorCount >= 0) {
      this.statusBar.updateStatus(errorCount);
    }
  }

  public static activate(context: vscode.ExtensionContext): void {
    Debugger.info("Extension", "Activating extension");
    this.extensionContext = context;

    // Initialize services
    this.configManager = ConfigurationManager.getInstance();
    this.statusBar = CodingStyleStatusBar.getInstance();
    this.analyzerService = AnalyzerService.getInstance();

    // Register commands and handlers
    this.statusBar.registerCommand(context, () => this.showMenu());

    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(
        (doc) => void this.analyzeDocument(doc)
      ),
      this.configManager.registerConfigurationChangeHandler((enabled) =>
        this.onConfigurationChanged(enabled)
      )
    );

    Debugger.info("Extension", "Extension activated successfully");
  }

  public static deactivate(): void {
    Debugger.info("Extension", "Extension deactivated");
    this.statusBar.dispose();
    Diagnostics.dispose();
  }

  private static extensionContext: vscode.ExtensionContext;
}

export function activate(context: vscode.ExtensionContext): void {
  Extension.activate(context);
}

export function deactivate(): void {
  Extension.deactivate();
}
