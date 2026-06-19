// Google Cast / Chromecast Sender SDK Integration Helper
// Dynamically loads scripts ONLY after user grants explicit consent.

export interface CastSessionInfo {
  isConnected: boolean;
  deviceName: string | null;
  volume: number;
  isMuted: boolean;
  currentTime: number;
}

type CastStateListener = (state: string) => void;
type SessionListener = (session: any) => void;

class ChromecastManager {
  private hasConsent: boolean = false;
  private sdkLoaded: boolean = false;
  private apiAvailable: boolean = false;
  private castContext: any = null;
  private activeSession: any = null;
  private stateListeners: Set<CastStateListener> = new Set();
  private sessionListeners: Set<SessionListener> = new Set();

  constructor() {
    this.hasConsent = localStorage.getItem("chromecast_consent_granted") === "true";
    if (this.hasConsent) {
      this.loadSdk();
    }
  }

  // Check if user has consented
  public checkConsent(): boolean {
    return this.hasConsent;
  }

  // Grant user consent & load script
  public grantConsent(): void {
    this.hasConsent = true;
    localStorage.setItem("chromecast_consent_granted", "true");
    this.loadSdk();
  }

  // Revoke user consent and reset
  public revokeConsent(): void {
    this.hasConsent = false;
    localStorage.removeItem("chromecast_consent_granted");
    // Reload can be suggested, or we just suspend active features
  }

  // Load the external Chromecast SDK script dynamically
  private loadSdk() {
    if (this.sdkLoaded) return;
    this.sdkLoaded = true;

    // Define the global callback BEFORE loading the script
    (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
      console.log("GCast API availability callback:", isAvailable);
      this.apiAvailable = isAvailable;
      if (isAvailable) {
        this.initializeCastContext();
      }
    };

    const script = document.createElement("script");
    script.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
    script.async = true;
    script.id = "chromecast-sdk-loader";
    document.head.appendChild(script);
  }

  // Initialize the cast framework context
  private initializeCastContext() {
    try {
      const chrome = (window as any).chrome;
      const cast = (window as any).cast;

      if (chrome?.cast?.media && cast?.framework) {
        this.castContext = cast.framework.CastContext.getInstance();
        
        this.castContext.setOptions({
          receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
          autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
        });

        // Register default status listeners
        this.castContext.addEventListener(
          cast.framework.CastStateEvent.CAST_STATE_CHANGED,
          (event: any) => {
            const state = event.castState;
            this.stateListeners.forEach((lis) => lis(state));
          }
        );

        // Listen for session changes
        this.castContext.addEventListener(
          cast.framework.SessionStateEvent.SESSION_STATE_CHANGED,
          (event: any) => {
            const sessionState = event.sessionState;
            if (sessionState === "SESSION_STARTED" || sessionState === "SESSION_RESUMED") {
              this.activeSession = this.castContext.getCurrentSession();
              this.sessionListeners.forEach((lis) => lis(this.activeSession));
            } else if (sessionState === "SESSION_ENDED" || sessionState === "SESSION_START_FAILED") {
              this.activeSession = null;
              this.sessionListeners.forEach((lis) => lis(null));
            }
          }
        );

        // Trigger initial state update
        const initialState = this.getCastState();
        this.stateListeners.forEach((lis) => lis(initialState));
      }
    } catch (err) {
      console.warn("Failed to initialize Cast context safely:", err);
    }
  }

  // Check current cast state status
  public getCastState(): string {
    const cast = (window as any).cast;
    if (this.castContext && cast?.framework) {
      return this.castContext.getCastState();
    }
    if (!this.hasConsent) return "UNAUTHORIZED";
    if (!this.apiAvailable) return "LOADING";
    return "NO_DEVICES_AVAILABLE";
  }

  // Get active session if available
  public getSession(): any {
    if (!this.activeSession && this.castContext) {
      this.activeSession = this.castContext.getCurrentSession();
    }
    return this.activeSession;
  }

  // Subscribe to status events
  public addStateListener(listener: CastStateListener) {
    this.stateListeners.add(listener);
    listener(this.getCastState());
    return () => this.stateListeners.delete(listener);
  }

  // Subscribe to session events
  public addSessionListener(listener: SessionListener) {
    this.sessionListeners.add(listener);
    listener(this.getSession());
    return () => this.sessionListeners.delete(listener);
  }

  // Select device and request casting session
  public requestSession(): Promise<any> {
    if (!this.castContext) {
      return Promise.reject("Cast context not initialized yet.");
    }
    return this.castContext.requestSession()
      .then((session: any) => {
        this.activeSession = session;
        this.sessionListeners.forEach((lis) => lis(session));
        return session;
      });
  }

  // Load a video stream onto the connected Chromecast
  public loadVideo(videoUrl: string, title: string, subtitleUrl?: string): Promise<void> {
    const session = this.getSession();
    if (!session) return Promise.reject("No active Chromecast session.");

    const chrome = (window as any).chrome;
    if (!chrome?.cast?.media) return Promise.reject("Chrome Cast media namespace not ready.");

    const mediaInfo = new chrome.cast.media.MediaInfo(videoUrl, "video/mp4");
    mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
    mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
    mediaInfo.metadata.title = title;
    mediaInfo.metadata.subtitle = "MediaPlayer Cast HD Stream";

    // Setup tracks for subtitle sync if a WebVTT source is provided
    if (subtitleUrl) {
      const track = new chrome.cast.media.Track(1, chrome.cast.media.TrackType.TEXT);
      track.trackContentId = subtitleUrl;
      track.trackContentType = "text/vtt";
      track.subtype = chrome.cast.media.TextTrackSubtype.SUBTITLES;
      track.name = "Active Captions";
      track.language = "en-US";
      mediaInfo.tracks = [track];
    }

    const request = new chrome.cast.media.LoadRequest(mediaInfo);
    request.autoplay = true;

    if (subtitleUrl) {
      request.activeTrackIds = [1];
    }

    return new Promise((resolve, reject) => {
      session.loadMedia(request, 
        () => resolve(),
        (err: any) => reject(err)
      );
    });
  }

  // Remote play command
  public play() {
    const session = this.getSession();
    const media = session?.getMediaSession();
    if (media) {
      media.play(null, () => {}, () => {});
    }
  }

  // Remote pause command
  public pause() {
    const session = this.getSession();
    const media = session?.getMediaSession();
    if (media) {
      media.pause(null, () => {}, () => {});
    }
  }

  // Remote seek command
  public seek(seconds: number) {
    const session = this.getSession();
    const media = session?.getMediaSession();
    const chrome = (window as any).chrome;
    if (media && chrome?.cast?.media) {
      const seekRequest = new chrome.cast.media.SeekRequest();
      seekRequest.currentTime = seconds;
      media.seek(seekRequest, () => {}, () => {});
    }
  }

  // Remote volume command
  public setVolume(volumeLevel: number, muted: boolean = false) {
    const session = this.getSession();
    if (session) {
      session.setReceiverVolumeLevel(volumeLevel, () => {}, () => {});
      session.setReceiverMuted(muted, () => {}, () => {});
    }
  }

  // Disconnect active session
  public disconnect() {
    if (this.castContext) {
      this.castContext.endCurrentSession(true);
      this.activeSession = null;
      this.sessionListeners.forEach((lis) => lis(null));
    }
  }
}

export const chromecastManager = new ChromecastManager();
