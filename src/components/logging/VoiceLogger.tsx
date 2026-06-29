'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Spinner } from '@/components/ui';
import { callAI } from '@/lib/ai/client';
import type { MealAnalysisServiceResult } from '@/lib/ai/service';

type VoiceState = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported';

interface VoiceLoggerProps {
  onResult:      (result: MealAnalysisServiceResult) => void;
  onError:       (error: string) => void;
  onBack:        () => void;
  onTypeInstead: () => void;
}

// Minimal interface for the parts of SpeechRecognition we use.
// The full type is in @types/dom-speech-recognition (not always available).
interface SR {
  continuous:     boolean;
  interimResults: boolean;
  lang:           string;
  onresult:       ((ev: SREvent) => void) | null;
  onend:          (() => void) | null;
  onerror:        ((ev: SRErrorEvent) => void) | null;
  start():        void;
  stop():         void;
  abort():        void;
}
interface SRResult { readonly transcript: string; }
interface SRResultList {
  readonly length: number;
  item(index: number): { isFinal: boolean; [0]: SRResult };
  [index: number]: { isFinal: boolean; [0]: SRResult };
}
interface SREvent { resultIndex: number; results: SRResultList; }
interface SRErrorEvent { error: string; }

type SRCtor = new () => SR;

function getSRCtor(): SRCtor | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

function MicIcon({ animated }: { animated: boolean }) {
  return (
    <svg
      width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"
      className={animated ? 'animate-pulse' : ''}
    >
      <rect x="11" y="2" width="10" height="16" rx="5" stroke="currentColor" strokeWidth="2"/>
      <path d="M6 16c0 5.523 4.477 10 10 10s10-4.477 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="16" y1="26" x2="16" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="10" y1="30" x2="22" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function VoiceLogger({ onResult, onBack, onTypeInstead }: VoiceLoggerProps) {
  const [state, setState]           = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg]     = useState('');

  const recognitionRef     = useRef<SR | null>(null);
  const finalTranscriptRef = useRef('');
  const mountedRef         = useRef(true);

  useEffect(() => {
    if (!getSRCtor()) setState('unsupported');
    return () => {
      mountedRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  const analyzeTranscript = useCallback(async (text: string) => {
    if (!mountedRef.current) return;
    setState('processing');
    try {
      const result = await callAI({
        capability: 'analyze_meal_text',
        payload:    { description: text },
      });
      if (mountedRef.current) onResult(result);
    } catch (e) {
      if (!mountedRef.current) return;
      setState('error');
      setErrorMsg(e instanceof Error ? e.message : 'Could not analyse speech. Please try again.');
    }
  }, [onResult]);

  function startListening() {
    const SR = getSRCtor();
    if (!SR) { setState('unsupported'); return; }

    const recognition = new SR();
    recognition.continuous     = false;
    recognition.interimResults = true;
    recognition.lang           = 'en-US';

    finalTranscriptRef.current = '';
    setTranscript('');
    setState('listening');

    recognition.onresult = (event: SREvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += chunk;
        } else {
          interim += chunk;
        }
      }
      setTranscript(finalTranscriptRef.current + interim);
    };

    recognition.onend = () => {
      if (!mountedRef.current) return;
      const text = finalTranscriptRef.current.trim();
      if (text) {
        analyzeTranscript(text);
      } else {
        // Only show error if we're still in listening state (not already processing)
        if (mountedRef.current) {
          setState('error');
          setErrorMsg('No speech detected. Tap the mic and try again.');
        }
      }
    };

    recognition.onerror = (event: SRErrorEvent) => {
      if (!mountedRef.current) return;
      recognition.abort();
      if (event.error === 'aborted') return; // user stopped — handled via onend
      setState('error');
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setErrorMsg('Microphone permission was denied. Please allow microphone access in your browser settings and try again.');
      } else if (event.error === 'audio-capture') {
        setErrorMsg('No microphone found. Please check your device.');
      } else if (event.error === 'network') {
        setErrorMsg('Network error during speech recognition. Please check your connection.');
      } else {
        setErrorMsg(`Speech error: ${event.error}. Please try again.`);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop(); // fires onend with whatever was captured
  }

  function reset() {
    recognitionRef.current?.abort();
    setState('idle');
    setTranscript('');
    setErrorMsg('');
    finalTranscriptRef.current = '';
  }

  // ── Unsupported ───────────────────────────────────────────────────────────

  if (state === 'unsupported') {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-card bg-surface-card border border-surface-input p-5 text-center">
          <p className="text-sm font-medium text-text-primary mb-1">Speech not supported</p>
          <p className="text-sm text-text-secondary">
            Your browser does not support the Web Speech API. Try Chrome or Safari on iOS / macOS.
          </p>
        </div>
        <Button variant="primary" onClick={onTypeInstead} fullWidth>Type instead</Button>
        <Button variant="ghost"   onClick={onBack}        fullWidth>Back</Button>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────

  const isListening  = state === 'listening';
  const isProcessing = state === 'processing';
  const isError      = state === 'error';

  return (
    <div className="flex flex-col gap-4">
      {/* Mic / spinner area */}
      <div className="rounded-card bg-surface-card border border-surface-input p-6 flex flex-col items-center gap-4">
        {isProcessing ? (
          <>
            <Spinner size="lg" />
            <p className="text-sm text-text-secondary">Analysing…</p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              aria-label={isListening ? 'Stop recording' : 'Start recording'}
              className={[
                'w-20 h-20 rounded-full flex items-center justify-center transition-colors',
                isListening
                  ? 'bg-error text-white'
                  : 'bg-brand-500 text-white hover:bg-brand-600',
              ].join(' ')}
            >
              <MicIcon animated={isListening} />
            </button>
            <p className="text-sm font-medium text-text-primary">
              {isListening ? 'Listening… tap to stop' : 'Tap to speak'}
            </p>
          </>
        )}

        {/* Live / final transcript */}
        {transcript && (
          <div className="w-full rounded-input bg-surface-input px-4 py-3 text-sm text-text-primary min-h-[56px]">
            {transcript}
          </div>
        )}

        {isListening && !transcript && (
          <p className="text-xs text-text-disabled italic">
            Say your meal, e.g. "Two eggs, toast and orange juice"
          </p>
        )}
      </div>

      {/* Error message */}
      {isError && errorMsg && (
        <p className="text-sm text-error px-1">{errorMsg}</p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {isError && (
          <Button variant="primary" onClick={reset} fullWidth>Try again</Button>
        )}
        <Button
          variant={isError ? 'secondary' : 'ghost'}
          onClick={onTypeInstead}
          fullWidth
        >
          Type instead
        </Button>
        <Button variant="ghost" onClick={onBack} fullWidth>Back</Button>
      </div>
    </div>
  );
}
