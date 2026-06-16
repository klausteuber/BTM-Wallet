import React, { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@rneui/themed';
import { useTheme } from '../themes';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import ToolTipMenu from '../TooltipMenu';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import { ATM_LOCATIONS_SUBTITLE, ATM_LOCATIONS_TITLE } from '../../screen/settings/atmLocationsConfig';

const SettingsButton = () => {
  const { colors } = useTheme();
  const { navigate } = useExtendedNavigation();

  const atmLocationsAction = useMemo(
    () => ({
      id: 'atmLocations',
      text: ATM_LOCATIONS_TITLE,
      subtitle: ATM_LOCATIONS_SUBTITLE,
      icon: Platform.OS === 'ios' ? { iconValue: 'map' } : undefined,
    }),
    [],
  );

  const onPress = () => {
    navigate('Settings');
  };

  const onPressMenuItem = useCallback(
    (menuItem: string) => {
      switch (menuItem) {
        case atmLocationsAction.id:
          navigate('AtmLocations');
          break;
        case CommonToolTipActions.ManageWallet.id:
          navigate('ManageWallets');
          break;
        default:
          break;
      }
    },
    [atmLocationsAction.id, navigate],
  );

  const actions = useMemo(() => [atmLocationsAction, CommonToolTipActions.ManageWallet], [atmLocationsAction]);
  return (
    <ToolTipMenu onPressMenuItem={onPressMenuItem} actions={actions}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={loc.settings.default_title}
        testID="SettingsButton"
        style={[style.buttonStyle, { backgroundColor: colors.lightButton }]}
        onPress={onPress}
      >
        <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} />
      </TouchableOpacity>
    </ToolTipMenu>
  );
};

export default SettingsButton;

const style = StyleSheet.create({
  buttonStyle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignContent: 'center',
  },
});
