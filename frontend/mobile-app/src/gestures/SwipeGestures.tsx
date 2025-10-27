import React from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_OUT_DURATION = 250;

/**
 * Swipeable Card Component
 * Supports swipe-to-delete, swipe-to-archive, swipe-to-approve
 */

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: { icon: string; text: string; color: string };
  rightAction?: { icon: string; text: string; color: string };
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction = { icon: '🗑️', text: 'Delete', color: '#ef4444' },
  rightAction = { icon: '✓', text: 'Approve', color: '#10b981' },
}) => {
  const pan = React.useRef(new Animated.ValueXY()).current;

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderMove: (evt, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: 0 });
      },
      
      onPanResponderRelease: (evt, gestureState) => {
        // Swipe right (approve)
        if (gestureState.dx > SWIPE_THRESHOLD && onSwipeRight) {
          Animated.timing(pan, {
            toValue: { x: SCREEN_WIDTH, y: 0 },
            duration: SWIPE_OUT_DURATION,
            useNativeDriver: false,
          }).start(() => {
            onSwipeRight();
            resetPosition();
          });
        }
        // Swipe left (delete)
        else if (gestureState.dx < -SWIPE_THRESHOLD && onSwipeLeft) {
          Animated.timing(pan, {
            toValue: { x: -SCREEN_WIDTH, y: 0 },
            duration: SWIPE_OUT_DURATION,
            useNativeDriver: false,
          }).start(() => {
            onSwipeLeft();
            resetPosition();
          });
        }
        // Not enough swipe, reset
        else {
          resetPosition();
        }
      },
    })
  ).current;

  const resetPosition = () => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      friction: 5,
    }).start();
  };

  const rotateCard = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const opacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  // Show action indicators
  const rightActionOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const leftActionOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Right action background */}
      <Animated.View style={[styles.actionBackground, styles.rightAction, { opacity: rightActionOpacity }]}>
        <Text style={styles.actionIcon}>{rightAction.icon}</Text>
        <Text style={styles.actionText}>{rightAction.text}</Text>
      </Animated.View>

      {/* Left action background */}
      <Animated.View style={[styles.actionBackground, styles.leftAction, { opacity: leftActionOpacity }]}>
        <Text style={styles.actionIcon}>{leftAction.icon}</Text>
        <Text style={styles.actionText}>{leftAction.text}</Text>
      </Animated.View>

      {/* Card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
          {
            transform: [
              { translateX: pan.x },
              { rotate: rotateCard },
            ],
            opacity,
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
};

/**
 * Pull-to-Refresh Component
 */

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const pullDistance = React.useRef(new Animated.Value(0)).current;

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => gestureState.dy > 0,
      onMoveShouldSetPanResponder: (evt, gestureState) => gestureState.dy > 0,
      
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0 && gestureState.dy < 150) {
          pullDistance.setValue(gestureState.dy);
        }
      },
      
      onPanResponderRelease: async (evt, gestureState) => {
        if (gestureState.dy > 80) {
          setRefreshing(true);
          pullDistance.setValue(80);
          
          await onRefresh();
          
          Animated.timing(pullDistance, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            setRefreshing(false);
          });
        } else {
          Animated.spring(pullDistance, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const spinValue = pullDistance.interpolate({
    inputRange: [0, 80],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[styles.refreshIndicator, { height: pullDistance }]}>
        <Animated.Text style={[styles.refreshIcon, { transform: [{ rotate: spinValue }] }]}>
          {refreshing ? '⏳' : '🔄'}
        </Animated.Text>
        <Text style={styles.refreshText}>
          {refreshing ? 'Refreshing...' : 'Pull to refresh'}
        </Text>
      </Animated.View>
      
      <Animated.View {...panResponder.panHandlers} style={{ flex: 1 }}>
        {children}
      </Animated.View>
    </View>
  );
};

/**
 * Swipe Navigation Between Screens
 */

interface SwipeNavigationProps {
  screens: Array<{ id: string; component: React.ReactNode }>;
  initialScreen?: number;
  onScreenChange?: (index: number) => void;
}

export const SwipeNavigation: React.FC<SwipeNavigationProps> = ({
  screens,
  initialScreen = 0,
  onScreenChange,
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(initialScreen);
  const pan = React.useRef(new Animated.ValueXY()).current;
  const screenWidth = SCREEN_WIDTH;

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 5;
      },
      
      onPanResponderMove: (evt, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: 0 });
      },
      
      onPanResponderRelease: (evt, gestureState) => {
        const threshold = screenWidth * 0.3;
        
        // Swipe right (previous screen)
        if (gestureState.dx > threshold && currentIndex > 0) {
          Animated.timing(pan, {
            toValue: { x: screenWidth, y: 0 },
            duration: 250,
            useNativeDriver: false,
          }).start(() => {
            setCurrentIndex(currentIndex - 1);
            onScreenChange?.(currentIndex - 1);
            pan.setValue({ x: 0, y: 0 });
          });
        }
        // Swipe left (next screen)
        else if (gestureState.dx < -threshold && currentIndex < screens.length - 1) {
          Animated.timing(pan, {
            toValue: { x: -screenWidth, y: 0 },
            duration: 250,
            useNativeDriver: false,
          }).start(() => {
            setCurrentIndex(currentIndex + 1);
            onScreenChange?.(currentIndex + 1);
            pan.setValue({ x: 0, y: 0 });
          });
        }
        // Reset
        else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.screenContainer,
          {
            transform: [
              { translateX: Animated.add(pan.x, new Animated.Value(-currentIndex * screenWidth)) },
            ],
          },
        ]}
      >
        {screens.map((screen, index) => (
          <View key={screen.id} style={[styles.screen, { width: screenWidth }]}>
            {screen.component}
          </View>
        ))}
      </Animated.View>

      {/* Page indicators */}
      <View style={styles.indicators}>
        {screens.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              index === currentIndex && styles.indicatorActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 8,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  rightAction: {
    backgroundColor: '#10b981',
    left: 0,
  },
  leftAction: {
    backgroundColor: '#ef4444',
    right: 0,
  },
  actionIcon: {
    fontSize: 32,
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 4,
  },
  refreshIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    overflow: 'hidden',
  },
  refreshIcon: {
    fontSize: 24,
  },
  refreshText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  screenContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  indicatorActive: {
    backgroundColor: '#007AFF',
    width: 24,
  },
});

