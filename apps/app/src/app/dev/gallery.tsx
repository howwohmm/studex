import { ScrollView, View, useColorScheme } from 'react-native';
import Head from 'expo-router/head';

import { useSettled } from '@/lib/settled';
import { useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import {
  colors,
  typeScale,
  spacing,
  radii,
  Text,
  Button,
  IconButton,
  Icon,
  Card,
  ListRow,
  Chip,
  Badge,
  SegmentedControl,
  Gauge,
  NumberTicker,
  EmptyState,
  Skeleton,
  GlassSurface,
  ThemeProvider,
  useScheme,
  type TextVariant,
} from '@studex/ui';

function Swatch({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: value,
          borderWidth: 1,
          borderColor: '#8884',
        }}
      />
      <Text variant="caption1">{label}</Text>
    </View>
  );
}

function GallerySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="caption2" color="secondary" style={{ textTransform: 'uppercase' }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Gallery({ scheme }: { scheme: 'light' | 'dark' }) {
  const c = colors[scheme];
  const [seg, setSeg] = useState(0);
  const progress = useSharedValue(0.78);
  return (
    <View style={{ backgroundColor: c.bg.grouped, padding: 16, gap: 20 }}>
      <GallerySection title={`${scheme} — colors`}>
        <Swatch label="bg.grouped" value={c.bg.grouped} />
        <Swatch label="bg.surface" value={c.bg.surface} />
        <Swatch label="accent" value={c.accent} />
        <Swatch label="accentSoft" value={c.accentSoft} />
        <Swatch label="attended" value={c.status.attended} />
        <Swatch label="bunked" value={c.status.bunked} />
        <Swatch label="close" value={c.status.close} />
        <Swatch label="separator" value={c.separator} />
      </GallerySection>
      <GallerySection title="type scale">
        {(Object.keys(typeScale) as TextVariant[]).map((v) => (
          <Text
            key={v}
            variant={v}
            color={c.label.primary as never}
            style={{ color: c.label.primary }}
          >
            {v}
          </Text>
        ))}
      </GallerySection>
      <GallerySection title="spacing / radii">
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          {Object.values(spacing).map((s) => (
            <View
              key={s}
              style={{ width: s, height: s, backgroundColor: c.accentSoft, borderRadius: 2 }}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {Object.values(radii).map((r) => (
            <View
              key={r}
              style={{
                width: 40,
                height: 40,
                borderRadius: r,
                backgroundColor: c.accentSoft,
                borderWidth: 1,
                borderColor: c.accent,
              }}
            />
          ))}
        </View>
      </GallerySection>
      <GallerySection title="buttons">
        <Button title="Primary" onPress={() => {}} />
        <Button title="Tinted" variant="tinted" onPress={() => {}} />
        <Button title="Plain" variant="plain" onPress={() => {}} />
        <IconButton onPress={() => {}} accessibilityLabel="Add">
          <Icon name="plus" size={20} />
        </IconButton>
      </GallerySection>
      <GallerySection title="components">
        <Card>
          <Text>Card</Text>
        </Card>
        <ListRow title="List row" subtitle="Subtitle" trailing={<Chip label="78%" />} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Chip" />
          <Badge label="NOW" />
        </View>
        <SegmentedControl options={['One', 'Two', 'Three']} selected={seg} onChange={setSeg} />
        <Gauge progress={progress} threshold={75}>
          <NumberTicker value="78" variant="hero" />
        </Gauge>
        <Skeleton width="60%" />
        <EmptyState icon="folder" message="Empty state" />
        <GlassSurface style={{ padding: 16 }}>
          <Text>Glass surface</Text>
        </GlassSurface>
      </GallerySection>
    </View>
  );
}

export default function GalleryScreen() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const resolvedScheme = useScheme();
  const { settledProps } = useSettled(true, [resolvedScheme]);
  return (
    <>
      <Head>
        <title>{'Gallery — Studex'}</title>
      </Head>
      <ScrollView {...settledProps} style={{ flex: 1 }}>
        <Text variant="largeTitle" style={{ padding: 16 }}>
          Gallery ({scheme})
        </Text>
        <ThemeProvider scheme={scheme}>
          <Gallery scheme={scheme} />
        </ThemeProvider>
        <ThemeProvider scheme={scheme === 'dark' ? 'light' : 'dark'}>
          <Gallery scheme={scheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </ScrollView>
    </>
  );
}
