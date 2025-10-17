import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent
} from 'react';
import './App.css';
import { HistoryMap, SyllableEntry, Tone } from './types';
import {
  clearAllData,
  loadHistories,
  loadSelectedVoice,
  saveHistories,
  saveSelectedVoice
} from './utils/storage';
import { computeAccuracy, computeWeight, recordHistory } from './utils/learning';
import { parseKey, pinyinWithTone } from './utils/pinyin';

const ROUND_SIZE = 20;
const WRONG_DELAY = 800;

type Phase = 'question' | 'correct' | 'incorrect' | 'summary';

type Mapping = Record<string, string | null>;

interface MistakeEntry {
  entry: SyllableEntry;
  userTone: Tone;
}

const useFeedbackSynth = () => {
  const contextRef = useRef<AudioContext | null>(null);

  const ensureContext = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    const audioCtor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!audioCtor) {
      return null;
    }
    if (!contextRef.current) {
      contextRef.current = new audioCtor();
    }
    if (contextRef.current.state === 'suspended') {
      contextRef.current.resume().catch(() => undefined);
    }
    return contextRef.current;
  }, []);

  const play = useCallback(
    (frequency: number, duration: number, type: OscillatorType = 'sine') => {
      const context = ensureContext();
      if (!context) {
        return;
      }
      const start = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.05);
    },
    [ensureContext]
  );

  const playCorrect = useCallback(() => play(880, 0.18, 'triangle'), [play]);
  const playWrong = useCallback(() => play(220, 0.32, 'sawtooth'), [play]);

  return { playCorrect, playWrong };
};

const LearnView = ({
  syllables,
  histories,
  onRecordResult,
  onPlay,
  baseMap,
  lastItemKey,
  setLastItemKey
}: {
  syllables: SyllableEntry[];
  histories: HistoryMap;
  onRecordResult: (key: string, result: 0 | 1) => void;
  onPlay: (entry: SyllableEntry | null) => void;
  baseMap: Record<
    string,
    {
      tone2: SyllableEntry | null;
      tone3: SyllableEntry | null;
    }
  >;
  lastItemKey: string | null;
  setLastItemKey: (key: string | null) => void;
}) => {
  const [phase, setPhase] = useState<Phase>('question');
  const [roundItems, setRoundItems] = useState<SyllableEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);
  const { playCorrect, playWrong } = useFeedbackSynth();
  const swipeStart = useRef<number | null>(null);

  const availableTraining = useMemo(
    () => syllables.filter((entry) => entry.hanzi),
    [syllables]
  );

  const buildRound = () => {
    if (availableTraining.length === 0) {
      setRoundItems([]);
      setPhase('summary');
      return;
    }
    const pool = [...availableTraining];
    const selected: SyllableEntry[] = [];
    let poolCopy = [...pool];
    for (let i = 0; i < Math.min(ROUND_SIZE, poolCopy.length); i += 1) {
      const weightedPool = poolCopy.map((item) => ({
        item,
        weight: computeWeight(histories, item.key)
      }));
      const total = weightedPool.reduce((acc, cur) => acc + cur.weight, 0);
      let target = Math.random() * total;
      let chosenIndex = 0;
      for (let j = 0; j < weightedPool.length; j += 1) {
        const segment = weightedPool[j];
        if (target < segment.weight) {
          chosenIndex = j;
          break;
        }
        target -= segment.weight;
      }
      const chosen = weightedPool[chosenIndex].item;
      if (i === 0 && chosen.key === lastItemKey && weightedPool.length > 1) {
        // avoid repetition by taking next
        chosenIndex = (chosenIndex + 1) % weightedPool.length;
      }
      const picked = weightedPool[chosenIndex].item;
      selected.push(picked);
      poolCopy = poolCopy.filter((entry) => entry.key !== picked.key);
    }
    setRoundItems(selected);
    setCurrentIndex(0);
    setPhase('question');
    setCorrectCount(0);
    setMistakes([]);
  };

  useEffect(() => {
    buildRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTraining.length]);

  const currentItem = roundItems[currentIndex] ?? null;

  useEffect(() => {
    if (!currentItem) {
      if (roundItems.length) {
        setPhase('summary');
      }
      return;
    }
    if (phase === 'question' || phase === 'incorrect') {
      onPlay(currentItem);
    }
    if (phase === 'correct') {
      const timeout = setTimeout(() => {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= roundItems.length) {
          setPhase('summary');
          setLastItemKey(currentItem.key);
        } else {
          setCurrentIndex(nextIndex);
          setPhase('question');
        }
      }, WRONG_DELAY);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [currentItem, phase, currentIndex, roundItems, onPlay, setLastItemKey]);

  const handleAnswer = (tone: Tone) => {
    if (!currentItem || phase !== 'question') {
      return;
    }
    const isCorrect = currentItem.tone === tone;
    onRecordResult(currentItem.key, isCorrect ? 1 : 0);
    if (isCorrect) {
      setCorrectCount((count) => count + 1);
      playCorrect();
      setPhase('correct');
    } else {
      playWrong();
      setMistakes((prev) => [...prev, { entry: currentItem, userTone: tone }]);
      setPhase('incorrect');
    }
  };

  const handleNextAfterWrong = () => {
    if (!currentItem || phase !== 'incorrect') {
      return;
    }
    const nextIndex = currentIndex + 1;
    if (nextIndex >= roundItems.length) {
      setPhase('summary');
      setLastItemKey(currentItem.key);
    } else {
      setCurrentIndex(nextIndex);
      setPhase('question');
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 1) {
      swipeStart.current = event.touches[0].clientX;
    }
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (swipeStart.current === null) {
      return;
    }
    const endX = event.changedTouches[0].clientX;
    const deltaX = endX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(deltaX) < 60) {
      return;
    }
    if (phase === 'incorrect') {
      handleNextAfterWrong();
      return;
    }
    if (phase !== 'question') {
      return;
    }
    if (deltaX < 0) {
      handleAnswer(2);
    } else {
      handleAnswer(3);
    }
  };

  if (!roundItems.length && phase !== 'summary') {
    return (
      <div className="empty-state">
        No playable syllables are available yet. Please ensure the mapping file
        is loaded.
      </div>
    );
  }

  if (phase === 'summary') {
    const accuracy = roundItems.length ? (correctCount / roundItems.length) * 100 : 0;
    return (
      <div className="round-summary">
        <div className="summary-metrics">
          <span>{accuracy.toFixed(0)}% accuracy</span>
          <span>
            {correctCount} / {roundItems.length}
          </span>
        </div>
        <div>
          <h3>Incorrect this round</h3>
          {mistakes.length === 0 ? (
            <p className="empty-state">Perfect round! 🎉</p>
          ) : (
            <div className="summary-list">
              {mistakes.map(({ entry }) => {
                const historyAcc = computeAccuracy(histories, entry.key) * 100;
                return (
                  <div key={`${entry.key}-summary`} className="summary-item">
                    <div>
                      <div>{entry.pinyin}</div>
                      <small>{historyAcc.toFixed(0)}% over last 20</small>
                    </div>
                    <button type="button" onClick={() => onPlay(entry)}>
                      ▶︎
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <button
          type="button"
          className="next-button"
          onClick={() => {
            buildRound();
          }}
        >
          Start new round
        </button>
      </div>
    );
  }

  const progressText = `${Math.min(currentIndex + 1, roundItems.length)} / ${roundItems.length}`;

  const tone2Entry = currentItem ? baseMap[currentItem.base]?.tone2 ?? null : null;
  const tone3Entry = currentItem ? baseMap[currentItem.base]?.tone3 ?? null : null;

  return (
    <div
      className="learn-container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="progress-text">{progressText}</div>
      <button
        type="button"
        className="speaker-button"
        onClick={() => {
          if (currentItem) {
            onPlay(currentItem);
          }
        }}
      >
        🔊
      </button>
      {phase === 'incorrect' && currentItem ? (
        <div className="feedback-buttons">
          <button
            type="button"
            className={`feedback-button ${currentItem.tone === 2 ? 'correct' : ''} ${
              tone2Entry && currentItem.tone !== 2 ? 'wrong' : ''
            }`}
            onClick={() => tone2Entry && onPlay(tone2Entry)}
            disabled={!tone2Entry}
          >
            Tone 2 (sample)
            <span className="sample-pinyin">{tone2Entry?.pinyin ?? 'Unavailable'}</span>
          </button>
          <button
            type="button"
            className={`feedback-button ${currentItem.tone === 3 ? 'correct' : ''} ${
              tone3Entry && currentItem.tone !== 3 ? 'wrong' : ''
            }`}
            onClick={() => tone3Entry && onPlay(tone3Entry)}
            disabled={!tone3Entry}
          >
            Tone 3 (sample)
            <span className="sample-pinyin">{tone3Entry?.pinyin ?? 'Unavailable'}</span>
          </button>
        </div>
      ) : (
        <div className="answer-buttons">
          <button
            type="button"
            className={`answer-button ${phase === 'correct' && currentItem?.tone === 2 ? 'correct' : ''}`}
            onClick={() => handleAnswer(2)}
            disabled={phase !== 'question'}
          >
            {tone2Entry?.pinyin ?? (currentItem ? pinyinWithTone(currentItem.base, 2) : 'Tone 2')}
          </button>
          <button
            type="button"
            className={`answer-button ${phase === 'correct' && currentItem?.tone === 3 ? 'correct' : ''}`}
            onClick={() => handleAnswer(3)}
            disabled={phase !== 'question'}
          >
            {tone3Entry?.pinyin ?? (currentItem ? pinyinWithTone(currentItem.base, 3) : 'Tone 3')}
          </button>
        </div>
      )}
      {phase === 'incorrect' && (
        <button type="button" className="next-button" onClick={handleNextAfterWrong}>
          Next
        </button>
      )}
    </div>
  );
};

const StatsView = ({
  syllables,
  histories,
  onPlay,
  onReset
}: {
  syllables: SyllableEntry[];
  histories: HistoryMap;
  onPlay: (entry: SyllableEntry | null) => void;
  onReset: () => void;
}) => {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <div className="stats-container">
      <button type="button" className="reset-button" onClick={() => setShowDialog(true)}>
        Reset all data
      </button>
      {showDialog && (
        <div className="round-summary" style={{ background: 'rgba(15,23,42,0.92)', padding: '1rem', borderRadius: '0.85rem' }}>
          <p>Are you sure you want to delete all local data (progress and settings)?</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="answer-button" onClick={() => setShowDialog(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="answer-button"
              style={{ background: 'rgba(248, 113, 113, 0.8)', color: '#450a0a' }}
              onClick={() => {
                setShowDialog(false);
                onReset();
              }}
            >
              Yes, reset
            </button>
          </div>
        </div>
      )}
      <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
        <table className="syllable-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Pinyin</th>
              <th>Play</th>
              <th>Accuracy</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            {syllables.map((entry) => {
              const accuracy = computeAccuracy(histories, entry.key) * 100;
              const weight = computeWeight(histories, entry.key);
              const disabled = !entry.hanzi;
              return (
                <tr
                  key={entry.key}
                  className={`syllable-row ${disabled ? 'disabled' : ''}`}
                >
                  <td>{entry.pinyin}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onPlay(entry)}
                      disabled={disabled}
                    >
                      ▶︎
                    </button>
                  </td>
                  <td>{accuracy.toFixed(0)}%</td>
                  <td>{weight.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function App() {
  const [tab, setTab] = useState<'learn' | 'stats'>('learn');
  const [syllables, setSyllables] = useState<SyllableEntry[]>([]);
  const [histories, setHistories] = useState<HistoryMap>(() => loadHistories());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [lastItemKey, setLastItemKey] = useState<string | null>(null);

  useEffect(() => {
    const base = import.meta.env.BASE_URL ?? './';
    fetch(`${base}pinyin_to_hanzi_zhCN.json`)
      .then((response) => response.json())
      .then((data: Mapping) => {
        const entries: SyllableEntry[] = Object.entries(data)
          .map(([key, hanzi]) => {
            const { base: baseSyllable, tone } = parseKey(key);
            return {
              key,
              base: baseSyllable,
              tone,
              pinyin: pinyinWithTone(baseSyllable, tone),
              hanzi
            };
          })
          .sort((a, b) => a.pinyin.localeCompare(b.pinyin));
        setSyllables(entries);
      })
      .catch((error) => {
        console.error('Failed to load mapping', error);
      });
  }, []);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) {
      return;
    }
    const loadVoices = () => {
      const zhVoices = synth
        .getVoices()
        .filter((voice) => voice.lang === 'zh-CN');
      setVoices(zhVoices);
    };
    loadVoices();
    synth.addEventListener('voiceschanged', loadVoices);
    return () => synth.removeEventListener('voiceschanged', loadVoices);
  }, []);

  useEffect(() => {
    if (!voices.length) {
      setSelectedVoice(null);
      return;
    }
    const storedVoiceUri = loadSelectedVoice();
    const matched = storedVoiceUri
      ? voices.find((voice) => voice.voiceURI === storedVoiceUri)
      : null;
    const voiceToUse = matched ?? voices[0];
    setSelectedVoice(voiceToUse);
    if (!matched || !storedVoiceUri) {
      saveSelectedVoice(voiceToUse.voiceURI);
    }
  }, [voices]);

  const baseMap = useMemo(() => {
    const map: Record<string, { tone2: SyllableEntry | null; tone3: SyllableEntry | null }> = {};
    syllables.forEach((entry) => {
      if (!map[entry.base]) {
        map[entry.base] = { tone2: null, tone3: null };
      }
      if (entry.tone === 2) {
        map[entry.base].tone2 = entry;
      }
      if (entry.tone === 3) {
        map[entry.base].tone3 = entry;
      }
    });
    return map;
  }, [syllables]);

  const handleRecordResult = (key: string, result: 0 | 1) => {
    setHistories((prev) => {
      const updated = recordHistory(prev, key, result);
      saveHistories(updated);
      return updated;
    });
  };

  const playEntry = (entry: SyllableEntry | null) => {
    if (!entry || !entry.hanzi) {
      return;
    }
    const synth = window.speechSynthesis;
    if (!synth) {
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(entry.hanzi);
    utterance.lang = 'zh-CN';
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    synth.speak(utterance);
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const base = import.meta.env.BASE_URL ?? './';
      navigator.serviceWorker
        .register(`${base}sw.js`)
        .catch((error) => console.error('Service worker registration failed', error));
    }
  }, []);

  const handleReset = () => {
    clearAllData();
    window.location.reload();
  };

  return (
    <div className="app-root">
      <main>
        <div className="header">
          <h1>Mandarin Tone Trainer</h1>
          {voices.length > 1 ? (
            <div className="voice-select">
              <label htmlFor="voice">Voice</label>
              <select
                id="voice"
                value={selectedVoice?.voiceURI ?? ''}
                onChange={(event) => {
                  const nextVoice = voices.find((voice) => voice.voiceURI === event.target.value);
                  if (nextVoice) {
                    setSelectedVoice(nextVoice);
                    saveSelectedVoice(nextVoice.voiceURI);
                  }
                }}
              >
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </div>
          ) : voices.length === 0 ? (
            <p>No zh-CN voice found. Please install a Mandarin voice in your system.</p>
          ) : null}
        </div>
        {tab === 'learn' ? (
          <LearnView
            syllables={syllables}
            histories={histories}
            onRecordResult={handleRecordResult}
            onPlay={playEntry}
            baseMap={baseMap}
            lastItemKey={lastItemKey}
            setLastItemKey={setLastItemKey}
          />
        ) : (
          <StatsView syllables={syllables} histories={histories} onPlay={playEntry} onReset={handleReset} />
        )}
      </main>
      <nav className="bottom-nav">
        <button
          type="button"
          className={tab === 'learn' ? 'active' : ''}
          onClick={() => setTab('learn')}
        >
          Learn
        </button>
        <button
          type="button"
          className={tab === 'stats' ? 'active' : ''}
          onClick={() => setTab('stats')}
        >
          Stats &amp; Settings
        </button>
      </nav>
    </div>
  );
}

export default App;
