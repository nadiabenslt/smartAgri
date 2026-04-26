import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';

const ROUTE_COLORS: Record<string, string> = {
  index: '#34A853',        // Plant (Green)
  notifications: '#FABB05', // Bell (Yellow)
  scan: '#0088CC',         // Scan (Blue)
  stats: '#333333',        // Stats (Dark Grey)
  chat: '#333333',         // Chat (Dark Grey)
  profile: '#008080',      // Profile (Teal)
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          
          if (route.name === 'explore' || options.href === null) return null; // Hide tabs with href: null

          const isFocused = state.index === index;

          const onPress = () => {
            if (process.env.EXPO_OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const iconColor = ROUTE_COLORS[route.name] || '#8E8E93';

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={[styles.tabItem, isFocused && styles.tabItemFocused]}
              activeOpacity={0.7}
            >
              {options.tabBarIcon?.({ 
                focused: isFocused, 
                color: iconColor, 
                size: 30 
              })}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 35, // Increased bottom space
    left: 15,
    right: 15,
    zIndex: 100,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 35,
    paddingVertical: 18,
    paddingHorizontal: 15,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItemFocused: {
    transform: [{ scale: 1.15 }],
  }
});
