export async function getMicrophoneStream(): Promise<MediaStream> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    throw new Error("This browser does not support microphone access.");
  }

  return navigator.mediaDevices.getUserMedia({
    audio: {
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
    },
  });
}

export function stopMicrophoneStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}
