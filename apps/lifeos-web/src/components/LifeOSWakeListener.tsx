import { useEffect, useRef } from "react";
import { useCommandLayer } from "../hooks/useCommandLayer";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const WAKE =
  /\b(?:hey\s+)?(?:ask\s+)?life\s*os\b|\blifeos\b|\bhey\s+life\b/i;

/**
 * When Ask LifeOS is closed, quietly listen for a "LifeOS" wake phrase and open the panel.
 * Browser-limited: works while the tab is open/foreground after mic permission.
 */
export function LifeOSWakeListener() {
  const { open, openCommand } = useCommandLayer();
  const armed = useRef(true);

  useEffect(() => {
    if (open) return;
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;

    let stopped = false;
    let rec: SpeechRecognitionLike | null = null;

    const start = () => {
      if (stopped || open) return;
      try {
        rec = new Ctor();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        rec.onresult = (ev) => {
          let transcript = "";
          for (let i = 0; i < ev.results.length; i++) {
            transcript += ev.results[i]![0]!.transcript;
          }
          if (!armed.current) return;
          if (WAKE.test(transcript)) {
            armed.current = false;
            const cleaned = transcript.replace(WAKE, "").trim();
            openCommand(cleaned || undefined, "ask");
            window.setTimeout(() => {
              armed.current = true;
            }, 2500);
          }
        };
        rec.onerror = () => {
          /* ignore no-speech / aborted — restart below */
        };
        rec.onend = () => {
          if (!stopped && !open) {
            window.setTimeout(start, 400);
          }
        };
        rec.start();
      } catch {
        /* mic blocked or busy */
      }
    };

    const t = window.setTimeout(start, 800);
    return () => {
      stopped = true;
      window.clearTimeout(t);
      try {
        rec?.stop();
      } catch {
        /* ignore */
      }
    };
  }, [open, openCommand]);

  return null;
}
