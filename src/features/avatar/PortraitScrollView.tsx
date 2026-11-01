import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';

const PortraitViewport = createContext<{
  root: React.RefObject<View | null>; top: number; height: number; revision: number;
} | null>(null);

/** Measure against scroll content once; scrolling only changes the visible interval. */
export function PortraitScrollView({ children, contentContainerStyle, onScroll, onLayout, onContentSizeChange, ...props }: ScrollViewProps) {
  const root = useRef<View>(null);
  const [viewport, setViewport] = useState({ top: 0, height: 0 });
  const [revision, setRevision] = useState(0);
  return <PortraitViewport.Provider value={{ root, ...viewport, revision }}>
    <ScrollView {...props} scrollEventThrottle={100}
      onContentSizeChange={(width, height) => { setRevision(value => value + 1); onContentSizeChange?.(width, height); }}
      onLayout={event => { setViewport(previous => ({ ...previous, height: event.nativeEvent.layout.height })); onLayout?.(event); }}
      onScroll={event => { const { contentOffset, layoutMeasurement } = event.nativeEvent;
        setViewport({ top: contentOffset.y, height: layoutMeasurement.height }); onScroll?.(event); }}>
      <View ref={root} collapsable={false} style={contentContainerStyle}>{children}</View>
    </ScrollView>
  </PortraitViewport.Provider>;
}

export function usePortraitVisibility() {
  const viewport = useContext(PortraitViewport);
  const ref = useRef<View>(null);
  const [bounds, setBounds] = useState<{ top: number; height: number }>();
  const root = viewport?.root;
  const revision = viewport?.revision;
  const onLayout = useCallback(() => {
    if (ref.current && root?.current) ref.current.measureLayout(root.current, (_x, top, _width, height) => {
      setBounds({ top, height });
    });
  }, [root]);
  useEffect(onLayout, [onLayout, revision]);
  const visible = !viewport || (!!bounds && bounds.top < viewport.top + viewport.height && bounds.top + bounds.height > viewport.top);
  return { ref, onLayout, visible };
}
