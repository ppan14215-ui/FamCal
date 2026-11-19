/** Runs without the app when Android asks the widget to draw (added, resized, every 30 minutes). */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { HeuteWidget } from './HeuteWidget';
import { KEY, type Snapshot } from './snapshot';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;
  let snap: Snapshot | null = null;
  try { snap = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null'); } catch { snap = null; }
  props.renderWidget(<HeuteWidget snap={snap} />);
}
