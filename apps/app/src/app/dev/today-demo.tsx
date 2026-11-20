import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Platform, ScrollView, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { t } from '@studex/copy';
import {
  tally,
  isEligible,
  displayPercent,
  safeNowBudget,
  recovery,
  copyBand,
  type AttendancePolicy,
  type Mark,
  type Tally,
  type Units,
  type Baseline,
} from '@studex/core';
import {
  useTheme,
  Text,
  Card,
  Badge,
  Gauge,
  Button,
  Toast,
  haptic,
  Icon,
  IconButton,
  SegmentedControl,
  spacing,
  radii,
} from '@studex/ui';

/* ---------- clearly fictional fixture (dev only) ---------- */
const TODAY = '2026-11-20';
const POLICY: AttendancePolicy = {
  thresholdBp: 7500,
  rounding: 'half_up_integer',
  basis: 'overall',
  excused: null,
};
const THRESHOLD = POLICY.thresholdBp / 100;
// Term end is unknown: no horizon is declared, rather than a known-but-empty one.
const HORIZON = { termEndKnown: false, upcoming: [] as const };

interface Subject {
  name: string;
  room: string;
  kind: string;
  baseline: Baseline;
}
const SUBJECTS: Subject[] = [
  { name: 'DBMS', room: 'LH-204', kind: 'Lecture', baseline: { attended: 6, held: 8, asOf: null } },
  { name: 'OS', room: 'LH-105', kind: 'Lecture', baseline: { attended: 5, held: 7, asOf: null } },
  { name: 'CN', room: 'C-302', kind: 'Lab', baseline: { attended: 7, held: 9, asOf: null } },
  { name: 'DAA', room: 'LH-204', kind: 'Lecture', baseline: { attended: 6, held: 8, asOf: null } },
  {
    name: 'PE-II',
    room: 'Sports Cplx',
    kind: 'Elective',
    baseline: { attended: 6, held: 8, asOf: null },
  },
];

type SlotState = 'unmarked' | 'attended' | 'bunked' | 'cancelled';
interface Slot {
  id: string;
  subject: Subject;
  start: number; // minutes since midnight
  end: number;
  hours: number;
  state: SlotState;
  prev?: { state: SlotState; batch: number };
}
const INITIAL: Slot[] = [
  { id: '1', subject: SUBJECTS[0]!, start: 540, end: 600, hours: 1, state: 'attended' },
  { id: '2', subject: SUBJECTS[1]!, start: 600, end: 660, hours: 1, state: 'unmarked' },
  { id: '3', subject: SUBJECTS[2]!, start: 660, end: 780, hours: 2, state: 'unmarked' },
  { id: '4', subject: SUBJECTS[3]!, start: 840, end: 900, hours: 1, state: 'unmarked' },
  { id: '5', subject: SUBJECTS[4]!, start: 960, end: 1020, hours: 1, state: 'unmarked' },
];
const CLOCKS = [570, 750, 1050] as const; // Morning 9:30 · Midday 12:30 · Evening 17:30

type Action =
  | { type: 'mark'; id: string; state: 'attended' | 'bunked' | 'cancelled'; batch: number }
  | { type: 'reopen'; id: string }
  | { type: 'undo'; batch: number }
  | { type: 'sweep'; clock: number; batch: number };

function reducer(slots: Slot[], action: Action): Slot[] {
  switch (action.type) {
    case 'mark':
      return slots.map((s) =>
        s.id === action.id
          ? { ...s, prev: { state: s.state, batch: action.batch }, state: action.state }
          : s,
      );
    case 'reopen':
      return slots.map((s) => {
        if (s.id !== action.id) return s;
        const { prev: _prev, ...rest } = s;
        return { ...rest, state: 'unmarked' as const };
      });
    case 'undo':
      return slots.map((s) => {
        if (!s.prev || s.prev.batch !== action.batch) return s;
        const { prev, ...rest } = s;
        return { ...rest, state: prev.state };
      });
    case 'sweep':
      return slots.map((s) =>
        s.state === 'unmarked' && s.start <= action.clock
          ? { ...s, prev: { state: s.state, batch: action.batch }, state: 'attended' }
          : s,
      );
  }
}

function marksOf(slots: Slot[], subject?: Subject): Mark[] {
  const marks: Mark[] = [];
  for (const s of slots) {
    if (subject && s.subject !== subject) continue;
    if (s.state !== 'attended' && s.state !== 'bunked') continue;
    for (let i = 0; i < s.hours; i++) {
      marks.push({
        occurrenceKey: `${s.id}-${i}`,
        status: s.state,
        units: 1 as Units,
        localDate: TODAY,
      });
    }
  }
  return marks;
}

function fmt(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function Dot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
  );
}

export default function TodayDemo() {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [slots, dispatch] = useReducer(reducer, INITIAL);
  const { clock: clockParam } = useLocalSearchParams<{ clock?: string }>();
  const webClock =
    Platform.OS === 'web' && typeof location !== 'undefined'
      ? new URLSearchParams(location.search).get('clock')
      : null;
  const [clockIdx, setClockIdx] = useState(() => {
    const idx = ['morning', 'midday', 'evening'].indexOf(webClock ?? clockParam ?? '');
    return idx >= 0 ? idx : 1;
  });
  const clock = CLOCKS[clockIdx]!;
  const [undoVisible, setUndoVisible] = useState(false);
  const [backAbove, setBackAbove] = useState(false);
  const wasEligible = useRef(true);
  const batchRef = useRef(0);

  // ── hero count-up ──
  const pctShared = useSharedValue(0);
  const [counted, setCounted] = useState(0);

  const tl: Tally = useMemo(() => {
    const per = SUBJECTS.map((s) => tally(s.baseline, marksOf(slots, s), POLICY));
    return per.reduce(
      (acc, s) => ({ attended: acc.attended + s.attended, held: acc.held + s.held }),
      { attended: 0, held: 0 },
    );
  }, [slots]);
  const eligible = isEligible(tl, POLICY) === true;
  const pct = displayPercent(tl, POLICY, 0);
  const pctNum = pct === null ? 0 : Number(pct);
  const budget = safeNowBudget(tl, HORIZON, POLICY);
  const rec = eligible ? null : recovery(tl, HORIZON, POLICY);
  const recN = rec && rec.kind === 'recoverable' ? rec.n : null;
  const band = copyBand(tl, eligible ? budget : 0, POLICY);
  const sentence =
    band === 'above' && budget !== null
      ? t('today.verdict.above', { percent: pct ?? '', n: budget, threshold: THRESHOLD })
      : band === 'close'
        ? t('today.verdict.close', { percent: pct ?? '', threshold: THRESHOLD })
        : band === 'below' && recN !== null
          ? t('today.verdict.below', { percent: pct ?? '', n: recN, threshold: THRESHOLD })
          : band === 'below' && rec && rec.kind === 'unreachable'
            ? t('today.verdict.unreachable', {
                percent: pct ?? '',
                max: rec.maxReachableDisplay ?? '—',
                threshold: THRESHOLD,
              })
            : '';
  const bandColor =
    band === 'below'
      ? theme.status.bunked
      : band === 'close'
        ? theme.status.close
        : theme.status.attended;

  useEffect(() => {
    if (reduce) {
      pctShared.value = pctNum / 100;
      return;
    }
    pctShared.value = withTiming(pctNum / 100, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
    const step = Math.max(16, 1200 / Math.max(1, Math.abs(pctNum)));
    const id = setInterval(() => {
      setCounted((c) => {
        if (c === pctNum) {
          clearInterval(id);
          return c;
        }
        return c + Math.sign(pctNum - c);
      });
    }, step);
    return () => clearInterval(id);
  }, [pctNum, pctShared, reduce]);

  useEffect(() => {
    if (!wasEligible.current && eligible) {
      haptic('backAbove');
      setBackAbove(true);
    }
    wasEligible.current = eligible;
  }, [eligible]);

  function mark(slot: Slot, state: 'attended' | 'bunked' | 'cancelled') {
    haptic('mark');
    dispatch({ type: 'mark', id: slot.id, state, batch: ++batchRef.current });
    setUndoVisible(true);
  }

  const now = slots.filter((s) => s.start <= clock && clock < s.end);
  const upcoming = slots.filter((s) => clock < s.start);
  const earlier = slots.filter((s) => s.end <= clock);
  const remaining = slots.filter((s) => s.state === 'unmarked' && s.start <= clock).length;
  const dateLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${TODAY}T00:00:00`));

  return (
    <>
      <Head>
        <title>Today demo — Studex</title>
      </Head>
      <View style={{ flex: 1, backgroundColor: theme.bg.grouped }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: insets.top + spacing[8],
            paddingHorizontal: spacing[20],
            paddingBottom: insets.bottom + spacing[40],
            gap: spacing[20],
          }}
        >
          {/* header */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="largeTitle">{t('today.title')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[8] }}>
                <Text variant="subhead" color="secondary">
                  {dateLabel}
                </Text>
                <Badge label={t('demo.badge')} color={theme.label.primary} />
              </View>
            </View>
            <IconButton onPress={() => {}} size={32} accessibilityLabel={t('a11y.profile')}>
              <Icon name="person" size={20} color="secondary" />
            </IconButton>
          </View>

          {/* hero card */}
          <Card style={{ alignItems: 'center', gap: spacing[16], paddingVertical: spacing[24] }}>
            <Gauge progress={pctShared} threshold={THRESHOLD} size={220} stroke={16}>
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 68,
                    lineHeight: 72,
                    fontWeight: '700',
                    letterSpacing: -1.5,
                    fontVariant: ['tabular-nums'],
                    color: theme.label.primary,
                  }}
                >
                  {reduce ? pctNum : counted}
                  <Text style={{ fontSize: 31, fontWeight: '700', color: theme.label.secondary }}>
                    %
                  </Text>
                </Text>
                <Text variant="footnote" color="secondary">
                  {t('today.card.caption')}
                </Text>
              </View>
            </Gauge>
            {sentence ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[8],
                  paddingHorizontal: spacing[8],
                }}
              >
                <Dot color={bandColor} size={8} />
                <Text variant="title3" style={{ fontWeight: '500', textAlign: 'center' }}>
                  {sentence}
                </Text>
              </View>
            ) : null}
          </Card>

          {/* sections */}
          {now.length > 0 ? (
            <Section title={t('today.section.now')}>
              {now.map((s) => (
                <ClassRow
                  key={s.id}
                  slot={s}
                  clock={clock}
                  isNow
                  onMark={mark}
                  onReopen={(sl) => dispatch({ type: 'reopen', id: sl.id })}
                />
              ))}
            </Section>
          ) : null}
          {upcoming.length > 0 ? (
            <Section title={t('today.section.upcoming')}>
              {upcoming.map((s, i) => (
                <ClassRow
                  key={s.id}
                  slot={s}
                  clock={clock}
                  menuUp={i === upcoming.length - 1}
                  onMark={mark}
                  onReopen={(sl) => dispatch({ type: 'reopen', id: sl.id })}
                />
              ))}
            </Section>
          ) : null}
          {earlier.length > 0 ? (
            <Section title={t('today.section.earlier')}>
              {earlier.map((s) => (
                <ClassRow
                  key={s.id}
                  slot={s}
                  clock={clock}
                  past
                  onMark={mark}
                  onReopen={(sl) => dispatch({ type: 'reopen', id: sl.id })}
                />
              ))}
            </Section>
          ) : null}

          {/* end-of-day sweep */}
          {clockIdx === 2 && remaining > 0 ? (
            <Card style={{ gap: spacing[12] }}>
              <Button
                title={t('today.sweep', { n: remaining })}
                onPress={() => {
                  haptic('endOfDaySweep');
                  dispatch({ type: 'sweep', clock, batch: ++batchRef.current });
                  setUndoVisible(true);
                }}
              />
            </Card>
          ) : null}

          {/* dev-only clock control */}
          <SegmentedControl
            options={[t('demo.clock.morning'), t('demo.clock.midday'), t('demo.clock.evening')]}
            selected={clockIdx}
            onChange={setClockIdx}
          />

          <Toast
            visible={undoVisible}
            message={t('toast.marked')}
            action={t('common.undo')}
            onAction={() => {
              setUndoVisible(false);
              dispatch({ type: 'undo', batch: batchRef.current });
            }}
            onHide={() => setUndoVisible(false)}
          />
          <Toast
            visible={backAbove}
            message={t('today.toast.recovered', { threshold: THRESHOLD })}
            onHide={() => setBackAbove(false)}
            durationMs={3000}
          />
        </ScrollView>
      </View>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing[8] }}>
      <Text variant="caption2" color="secondary" style={{ textTransform: 'uppercase' }}>
        {title}
      </Text>
      <Card style={{ padding: 0, overflow: 'hidden' }}>{children}</Card>
    </View>
  );
}

function subjectStats(slot: Slot) {
  const st = tally(slot.subject.baseline, marksOf([slot]), POLICY);
  const eligible = isEligible(st, POLICY) === true;
  if (eligible) {
    const k = safeNowBudget(st, HORIZON, POLICY) ?? 0;
    return { text: t('row.budget.spare', { n: k }), tone: k > 0 ? 'ok' : 'warn' };
  }
  const r = recovery(st, HORIZON, POLICY);
  if (r.kind === 'recoverable') {
    return { text: t('row.budget.below', { n: r.n }), tone: 'bad' };
  }
  const max = r.kind === 'unreachable' ? r.maxReachableDisplay : null;
  return { text: t('row.budget.unreachable', { max: max ?? '—' }), tone: 'bad' };
}

function ClassRow({
  slot,
  clock,
  isNow,
  past,
  onMark,
  onReopen,
  menuUp,
}: {
  slot: Slot;
  clock: number;
  isNow?: boolean;
  past?: boolean;
  menuUp?: boolean;
  onMark: (s: Slot, m: 'attended' | 'bunked' | 'cancelled') => void;
  onReopen: (s: Slot) => void;
}) {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const marked = slot.state !== 'unmarked';
  const future = slot.start > clock;
  const [menuOpen, setMenuOpen] = useState(false);
  const flash = useSharedValue(0);
  const [flashKind, setFlashKind] = useState<'attended' | 'bunked' | null>(null);
  const stats = useMemo(() => subjectStats(slot), [slot]);
  const toneColor =
    stats.tone === 'ok'
      ? theme.status.attended
      : stats.tone === 'warn'
        ? theme.status.close
        : theme.status.bunked;

  function press(kind: 'attended' | 'bunked') {
    setFlashKind(kind);
    flash.value = 1;
    setTimeout(
      () => {
        flash.value = 0;
        setFlashKind(null);
        onMark(slot, kind);
      },
      reduce ? 0 : 180,
    );
  }

  const flashColor =
    flashKind === 'attended'
      ? theme.status.attended
      : flashKind === 'bunked'
        ? theme.status.bunked
        : 'transparent';
  const flashStyle = useAnimatedStyle(() => ({
    backgroundColor: flash.value ? flashColor : theme.fill.control,
  }));

  const pillColor =
    slot.state === 'attended'
      ? theme.status.attended
      : slot.state === 'bunked'
        ? theme.status.bunked
        : theme.label.secondary;
  const pillLabel =
    slot.state === 'attended'
      ? t('today.state.attended')
      : slot.state === 'bunked'
        ? t('today.state.bunked')
        : t('today.state.cancelled');

  return (
    <Pressable
      accessibilityLabel={
        future && !marked ? t('a11y.class.options', { subject: slot.subject.name }) : undefined
      }
      onLongPress={future && !marked ? () => setMenuOpen(true) : undefined}
      delayLongPress={400}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[12],
          paddingVertical: 10,
          paddingHorizontal: spacing[16],
          minHeight: 56,
          borderBottomWidth: 1,
          borderBottomColor: theme.separator,
        },
        isNow ? { backgroundColor: theme.accentSoft } : null,
        menuOpen ? { zIndex: 20 } : null,
      ]}
    >
      {/* time column */}
      <View style={{ width: 56 }}>
        <Text variant="headline" tabular>
          {fmt(slot.start)}
        </Text>
        <Text variant="caption1" color="secondary" tabular>
          {fmt(slot.end)}
        </Text>
      </View>
      {/* subject + meta */}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[8] }}>
          <Text variant="headline">{slot.subject.name}</Text>
          {isNow ? <Badge label={t('today.badge.now')} /> : null}
        </View>
        <Text variant="subhead" color="secondary" numberOfLines={1}>
          {slot.subject.room} · {slot.subject.kind}
        </Text>
        {past && !marked ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: theme.label.tertiary,
              }}
            />
            <Text variant="caption1" color="secondary">
              {t('today.unmarked.prompt')}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Dot color={toneColor} />
            <Text variant="caption1" color="secondary" tabular>
              {stats.text}
            </Text>
          </View>
        )}
      </View>
      {/* actions */}
      {marked ? (
        <Pressable accessibilityRole="button" onPress={() => onReopen(slot)}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: theme.fill.control,
              borderRadius: radii.pill,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Dot color={pillColor} />
            <Text variant="caption1" color="secondary">
              {pillLabel}
            </Text>
          </View>
        </Pressable>
      ) : future ? (
        <View>
          <IconButton
            onPress={() => setMenuOpen((o) => !o)}
            size={36}
            accessibilityLabel={t('a11y.class.options', { subject: slot.subject.name })}
          >
            <Icon name="more" size={18} color="secondary" />
          </IconButton>
          {menuOpen ? (
            <View
              style={{
                position: 'absolute',
                bottom: menuUp ? 40 : undefined,
                top: menuUp ? undefined : 40,
                right: 0,
                zIndex: 10,
                backgroundColor: theme.bg.elevated,
                borderRadius: radii.md,
                borderCurve: 'continuous' as never,
                borderWidth: 1,
                borderColor: theme.separator,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 8 },
                elevation: 6,
                minWidth: 140,
              }}
            >
              <Pressable
                accessibilityRole="menuitem"
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  minHeight: 44,
                  justifyContent: 'center',
                }}
                onPress={() => {
                  setMenuOpen(false);
                  onMark(slot, 'cancelled');
                }}
              >
                <Text variant="body">{t('mark.cancelled')}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[8] }}>
          {(['attended', 'bunked'] as const).map((kind) => (
            <Animated.View
              key={kind}
              style={[
                { borderRadius: 22 },
                kind === flashKind ? flashStyle : { backgroundColor: theme.fill.control },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={kind === 'attended' ? t('mark.attended') : t('mark.bunked')}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => press(kind)}
              >
                <Icon name={kind} size={20} color="primary" />
              </Pressable>
            </Animated.View>
          ))}
        </View>
      )}
    </Pressable>
  );
}
