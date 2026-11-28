/**
 * The fence around the onboarding showcase (Onboarding v3, 02.11.2026). Everything inside reads the
 * demo store and the demo parents instead of the app's own, and nothing inside can be touched:
 * - StoreContext: useStore() reads the demo store. sync, listSync, notify, widget and feed stay
 *   subscribed to the app store only, so nothing here reaches the server or the real chat.
 * - PersonsContext: Julia and Tom's names and colours, never the family's own (no setNames, setColor).
 * - StillContext: the chat cards draw the same but ask nothing, open nothing, write nothing.
 * - pointerEvents none (style form, which react-native-web honours): no tap reaches a card. The player puts its own tap target above the stage.
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { StoreContext, type Store } from '../../state/store';
import { PersonsContext } from '../ui/Person';
import { StillContext } from '../ChatCards';
import { demoPersons } from '../../data/demoFamily';

export default function DemoStage({ store, children, style }: { store: Store; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <StoreContext.Provider value={store}>
      <PersonsContext.Provider value={demoPersons}>
        <StillContext.Provider value>
          <View style={[{ pointerEvents: 'none' }, style]}>{children}</View>
        </StillContext.Provider>
      </PersonsContext.Provider>
    </StoreContext.Provider>
  );
}
