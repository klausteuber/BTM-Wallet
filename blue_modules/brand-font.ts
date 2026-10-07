import { StyleSheet, Text, TextInput, TextStyle } from 'react-native';

import { fontFor } from '../components/brand';

/**
 * Give every Text and TextInput in the app Rethink Sans, the website's typeface.
 *
 * Custom fonts don't synthesize weights reliably (Android especially), so the
 * style's fontWeight is turned into the matching per-weight file and dropped.
 * Text that already names a fontFamily (monospace addresses, icon fonts) is left
 * alone. React 19 ignores defaultProps on forwardRef components, so this wraps
 * the components' render functions instead.
 */
function withBrandFont(style: any): any {
  const flat: TextStyle | undefined = StyleSheet.flatten(style);
  if (flat && flat.fontFamily) return style;
  const fontFamily = fontFor(flat?.fontWeight);
  return [style, { fontFamily, fontWeight: undefined }];
}

function patch(component: any): void {
  if (!component || typeof component.render !== 'function' || component.__brandFont) return;
  const original = component.render;
  component.render = function render(props: any, ref: any) {
    return original.call(this, { ...props, style: withBrandFont(props.style) }, ref);
  };
  component.__brandFont = true;
}

patch(Text);
patch(TextInput);
