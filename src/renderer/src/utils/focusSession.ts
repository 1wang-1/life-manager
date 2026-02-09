interface FocusSessionState {
  manualExit: boolean;
  autoMaximized: boolean;
  userTriggeredFullscreen: boolean;
  reset: () => void;
}

export const focusSessionState: FocusSessionState = {
  manualExit: false,
  autoMaximized: false,
  userTriggeredFullscreen: false,
  reset() {
    this.manualExit = false;
    this.autoMaximized = false;
    this.userTriggeredFullscreen = false;
  }
};
