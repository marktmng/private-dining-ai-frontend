import { API_URL } from "./constants";
import {
  getMicrophoneStream,
  stopMicrophoneStream,
} from "./microphone";

const REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
const REALTIME_MODEL = "gpt-realtime";
const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const VOICE = "alloy";
const RESTAURANT_INSTRUCTIONS = `
You are AIVORA, a concise professional private dining voice waiter.

Only help with restaurant ordering from the visible menu. If the user chats casually, briefly redirect to the menu.
Never output JSON, arrays, code, schemas, tool calls, or structured data.
Speak in plain natural English only.
Do not invent menu items.
Do not claim to place or send the order to the kitchen.
The app UI manages the order list, item matching, removals, and totals locally.
When the user adds, removes, or changes items, acknowledge briefly in words.
When the user asks for the total, tell them the calculated total is shown in Current Order.
If an item is unclear, ask the customer to confirm the item name.
`;

export type TranscriptRole = "user" | "assistant";

export interface TranscriptUpdate {
  id: string;
  isFinal: boolean;
  role: TranscriptRole;
  text: string;
}

export interface RealtimeVoiceCallbacks {
  onAssistantSpeakingChange?: (isSpeaking: boolean) => void;
  onDisconnected?: () => void;
  onError?: (message: string) => void;
  onReady?: () => void;
  onStatusChange?: (status: string) => void;
  onTranscript?: (update: TranscriptUpdate) => void;
}

export interface RealtimeVoiceSession {
  interrupt: () => void;
  stop: () => void;
}

interface TokenResponse {
  expires_at?: number;
  message?: string;
  session?: {
    model?: string;
  };
  success: boolean;
  token?: string;
}

interface RealtimeSessionConfig {
  audio: {
    input: {
      noise_reduction: {
        type: "near_field";
      };
      transcription: {
        model: string;
      };
      turn_detection: {
        create_response: boolean;
        interrupt_response: boolean;
        prefix_padding_ms: number;
        silence_duration_ms: number;
        type: "server_vad";
      };
    };
    output: {
      voice: typeof VOICE;
    };
  };
  instructions: string;
  model: string;
  output_modalities: ["audio"];
  type: "realtime";
}

interface RealtimeServerEvent {
  [key: string]: unknown;
  type: string;
}

interface RealtimeClientEvent {
  [key: string]: unknown;
  type: string;
}

class BrowserRealtimeVoiceSession implements RealtimeVoiceSession {
  private activeResponseId: string | null = null;
  private assistantSpeaking = false;
  private isStopped = false;
  private readonly assistantTranscripts = new Map<string, string>();
  private readonly userTranscripts = new Map<string, string>();

  constructor(
    private readonly peerConnection: RTCPeerConnection,
    private readonly dataChannel: RTCDataChannel,
    private readonly microphoneStream: MediaStream,
    private readonly remoteAudio: HTMLAudioElement,
    private readonly callbacks: RealtimeVoiceCallbacks
  ) {
    this.bindConnectionEvents();
  }

  interrupt(): void {
    if (!this.canSend() || !this.assistantSpeaking) return;

    if (this.activeResponseId) {
      this.send({
        type: "response.cancel",
        response_id: this.activeResponseId,
      });
    }

    this.send({
      type: "output_audio_buffer.clear",
    });

    this.setAssistantSpeaking(false);
  }

  stop(): void {
    this.cleanup(true);
  }

  private bindConnectionEvents(): void {
    this.dataChannel.addEventListener("open", () => {
      this.callbacks.onReady?.();
      this.callbacks.onStatusChange?.("Connected. Listening...");
    });

    this.dataChannel.addEventListener("message", (message) => {
      this.handleMessage(message);
    });

    this.dataChannel.addEventListener("error", () => {
      this.callbacks.onError?.("Realtime data channel error.");
    });

    this.dataChannel.addEventListener("close", () => {
      this.cleanup(true);
    });

    this.peerConnection.addEventListener("connectionstatechange", () => {
      const state = this.peerConnection.connectionState;

      if (state === "failed") {
        this.callbacks.onError?.("Realtime connection failed.");
        this.cleanup(true);
      }

      if (state === "disconnected") {
        this.callbacks.onStatusChange?.("Realtime connection interrupted.");
      }
    });

    this.peerConnection.addEventListener("track", (event) => {
      const [remoteStream] = event.streams;
      if (!remoteStream) return;

      this.remoteAudio.srcObject = remoteStream;
      void this.remoteAudio.play().catch(() => {
        this.callbacks.onStatusChange?.("Audio playback is blocked by the browser.");
      });
    });
  }

  private handleMessage(message: MessageEvent<string>): void {
    let event: RealtimeServerEvent;

    try {
      event = JSON.parse(message.data) as RealtimeServerEvent;
    } catch {
      return;
    }

    switch (event.type) {
      case "session.created":
      case "session.updated":
        this.callbacks.onStatusChange?.("Connected. Listening...");
        break;

      case "input_audio_buffer.speech_started":
        this.callbacks.onStatusChange?.("Listening...");
        this.interrupt();
        break;

      case "input_audio_buffer.speech_stopped":
        this.callbacks.onStatusChange?.("Thinking...");
        break;

      case "conversation.item.input_audio_transcription.delta":
        this.updateTranscript("user", event, readString(event, "delta"), false);
        break;

      case "conversation.item.input_audio_transcription.completed":
        this.replaceTranscript("user", event, readString(event, "transcript"), true);
        break;

      case "response.output_audio_transcript.delta":
        this.activeResponseId = readString(event, "response_id") || this.activeResponseId;
        this.setAssistantSpeaking(true);
        this.updateTranscript("assistant", event, readString(event, "delta"), false);
        break;

      case "response.output_audio_transcript.done":
        this.replaceTranscript(
          "assistant",
          event,
          readString(event, "transcript"),
          true
        );
        break;

      case "response.output_text.delta":
        this.activeResponseId = readString(event, "response_id") || this.activeResponseId;
        this.updateTranscript("assistant", event, readString(event, "delta"), false);
        break;

      case "response.output_text.done":
        this.replaceTranscript("assistant", event, readString(event, "text"), true);
        break;

      case "output_audio_buffer.started":
        this.activeResponseId = readString(event, "response_id") || this.activeResponseId;
        this.setAssistantSpeaking(true);
        this.callbacks.onStatusChange?.("AI speaking...");
        break;

      case "output_audio_buffer.stopped":
      case "output_audio_buffer.cleared":
        this.activeResponseId = null;
        this.setAssistantSpeaking(false);
        this.callbacks.onStatusChange?.("Listening...");
        break;

      case "response.done":
        this.activeResponseId = null;
        this.setAssistantSpeaking(false);
        this.callbacks.onStatusChange?.("Listening...");
        break;

      case "error":
        this.callbacks.onError?.(readServerError(event));
        break;
    }
  }

  private updateTranscript(
    role: TranscriptRole,
    event: RealtimeServerEvent,
    delta: string,
    isFinal: boolean
  ): void {
    if (!delta) return;

    const id = getTranscriptId(event);
    const transcripts = this.getTranscriptMap(role);
    const text = `${transcripts.get(id) ?? ""}${delta}`;
    transcripts.set(id, text);

    this.callbacks.onTranscript?.({
      id,
      isFinal,
      role,
      text,
    });
  }

  private replaceTranscript(
    role: TranscriptRole,
    event: RealtimeServerEvent,
    text: string,
    isFinal: boolean
  ): void {
    if (!text) return;

    const id = getTranscriptId(event);
    this.getTranscriptMap(role).set(id, text);

    this.callbacks.onTranscript?.({
      id,
      isFinal,
      role,
      text,
    });
  }

  private getTranscriptMap(role: TranscriptRole): Map<string, string> {
    return role === "user" ? this.userTranscripts : this.assistantTranscripts;
  }

  private setAssistantSpeaking(isSpeaking: boolean): void {
    if (this.assistantSpeaking === isSpeaking) return;

    this.assistantSpeaking = isSpeaking;
    this.callbacks.onAssistantSpeakingChange?.(isSpeaking);
  }

  private send(event: RealtimeClientEvent): void {
    if (!this.canSend()) return;

    this.dataChannel.send(JSON.stringify(event));
  }

  private canSend(): boolean {
    return this.dataChannel.readyState === "open";
  }

  private cleanup(shouldNotify: boolean): void {
    if (this.isStopped) return;

    this.isStopped = true;
    this.setAssistantSpeaking(false);
    stopMicrophoneStream(this.microphoneStream);

    this.remoteAudio.pause();
    this.remoteAudio.srcObject = null;

    if (this.dataChannel.readyState !== "closed") {
      this.dataChannel.close();
    }

    this.peerConnection.close();

    if (shouldNotify) {
      this.callbacks.onDisconnected?.();
    }
  }
}

export async function startRealtimeVoiceSession(
  callbacks: RealtimeVoiceCallbacks = {}
): Promise<RealtimeVoiceSession> {
  callbacks.onStatusChange?.("Requesting microphone...");

  const microphoneStream = await getMicrophoneStream();
  const remoteAudio = new Audio();
  remoteAudio.autoplay = true;
  remoteAudio.setAttribute("playsinline", "true");

  const peerConnection = new RTCPeerConnection();
  const dataChannel = peerConnection.createDataChannel("oai-events");
  const session = new BrowserRealtimeVoiceSession(
    peerConnection,
    dataChannel,
    microphoneStream,
    remoteAudio,
    callbacks
  );

  try {
    microphoneStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, microphoneStream);
    });

    callbacks.onStatusChange?.("Connecting to AI waiter...");

    const token = await fetchRealtimeToken();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    if (!offer.sdp) {
      throw new Error("Unable to create a Realtime connection offer.");
    }

    const answerSdp = await exchangeSdpForAnswer(
      token.token,
      offer.sdp,
      buildSessionConfig(token.model)
    );

    await peerConnection.setRemoteDescription({
      sdp: answerSdp,
      type: "answer",
    });

    return session;
  } catch (error) {
    session.stop();
    throw error;
  }
}

async function fetchRealtimeToken(): Promise<{
  model?: string;
  token: string;
}> {
  const response = await fetch(`${API_URL}/realtime/token`, {
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as TokenResponse | null;

  if (!response.ok || !body?.success || !body.token) {
    throw new Error(body?.message ?? "Unable to create a Realtime token.");
  }

  return {
    model: body.session?.model,
    token: body.token,
  };
}

async function exchangeSdpForAnswer(
  token: string,
  offerSdp: string,
  sessionConfig: RealtimeSessionConfig
): Promise<string> {
  const formData = new FormData();
  formData.append("sdp", offerSdp);
  formData.append("session", JSON.stringify(sessionConfig));

  const response = await fetch(REALTIME_CALLS_URL, {
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: "POST",
  });

  const answerSdp = await response.text();

  if (!response.ok) {
    throw new Error(
      answerSdp || `Realtime connection failed with status ${response.status}.`
    );
  }

  if (!answerSdp.trim()) {
    throw new Error("Realtime connection did not return an SDP answer.");
  }

  return answerSdp;
}

function buildSessionConfig(model = REALTIME_MODEL): RealtimeSessionConfig {
  return {
    audio: {
      input: {
        noise_reduction: {
          type: "near_field",
        },
        transcription: {
          model: TRANSCRIPTION_MODEL,
        },
        turn_detection: {
          create_response: true,
          interrupt_response: true,
          prefix_padding_ms: 300,
          silence_duration_ms: 650,
          type: "server_vad",
        },
      },
      output: {
        voice: VOICE,
      },
    },
    instructions: RESTAURANT_INSTRUCTIONS,
    model,
    output_modalities: ["audio"],
    type: "realtime",
  };
}

function getTranscriptId(event: RealtimeServerEvent): string {
  return (
    readString(event, "item_id") ||
    readString(event, "response_id") ||
    readString(event, "event_id") ||
    crypto.randomUUID()
  );
}

function readString(event: RealtimeServerEvent, key: string): string {
  const value = event[key];
  return typeof value === "string" ? value : "";
}

function readServerError(event: RealtimeServerEvent): string {
  const error = event.error;

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return "Realtime API error.";
}
