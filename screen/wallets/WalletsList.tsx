import React, { useCallback, useEffect, useReducer, useRef, useMemo } from 'react';
import { useFocusEffect, useIsFocused, useRoute, RouteProp } from '@react-navigation/native';
import { Alert, findNodeHandle, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Icon } from '@rneui/themed';
import { getClipboardContent } from '../../blue_modules/clipboard';
import { isDesktop } from '../../blue_modules/environment';
import * as fs from '../../blue_modules/fs';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { ExtendedTransaction, Transaction, TWallet } from '../../class/wallets/types';
import presentAlert from '../../components/Alert';
import { FButton, FContainer } from '../../components/FloatButtons';
import { useTheme } from '../../components/themes';
import { TransactionListItem } from '../../components/TransactionListItem';
import WalletsCarousel from '../../components/WalletsCarousel';
import { useSizeClass, SizeClass } from '../../blue_modules/sizeClass';
import loc from '../../loc';
import { Chain } from '../../models/bitcoinUnits';
import ActionSheet from '../ActionSheet';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useStorage } from '../../hooks/context/useStorage';
import TotalWalletsBalance from '../../components/TotalWalletsBalance';
import { useSettings } from '../../hooks/context/useSettings';
import useMenuElements from '../../hooks/useMenuElements';
import SafeAreaSectionList from '../../components/SafeAreaSectionList';
import { scanQrHelper } from '../../helpers/scan-qr.ts';
import { createATMReceiveResetAction } from './atmReceiveNavigation';

const WalletsListSections = { CAROUSEL: 'CAROUSEL', TRANSACTIONS: 'TRANSACTIONS' };

type SectionData = {
  key: string;
  data: Transaction[] | string[];
};

enum ActionTypes {
  SET_LOADING,
  SET_WALLETS,
  SET_CURRENT_INDEX,
  SET_REFRESH_FUNCTION,
}

interface SetLoadingAction {
  type: ActionTypes.SET_LOADING;
  payload: boolean;
}

interface SetWalletsAction {
  type: ActionTypes.SET_WALLETS;
  payload: TWallet[];
}

interface SetCurrentIndexAction {
  type: ActionTypes.SET_CURRENT_INDEX;
  payload: number;
}

interface SetRefreshFunctionAction {
  type: ActionTypes.SET_REFRESH_FUNCTION;
  payload: () => void;
}

type WalletListAction = SetLoadingAction | SetWalletsAction | SetCurrentIndexAction | SetRefreshFunctionAction;

interface WalletListState {
  isLoading: boolean;
  wallets: TWallet[];
  currentWalletIndex: number;
  refreshFunction: () => void;
}

const initialState = {
  isLoading: false,
  wallets: [],
  currentWalletIndex: 0,
  refreshFunction: () => {},
};

function reducer(state: WalletListState, action: WalletListAction) {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ActionTypes.SET_WALLETS:
      return { ...state, wallets: action.payload };
    case ActionTypes.SET_CURRENT_INDEX:
      return { ...state, currentWalletIndex: action.payload };
    case ActionTypes.SET_REFRESH_FUNCTION:
      return { ...state, refreshFunction: action.payload };
    default:
      return state;
  }
}

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'WalletsList'>;
type RouteProps = RouteProp<DetailViewStackParamList, 'WalletsList'>;

const WalletsList: React.FC = () => {
  const [state, dispatch] = useReducer<React.Reducer<WalletListState, WalletListAction>>(reducer, initialState);
  const { isLoading } = state;
  const { sizeClass, isLarge } = useSizeClass();
  const walletsCarousel = useRef<any>();
  const currentWalletIndex = useRef<number>(0);
  const { registerTransactionsHandler, unregisterTransactionsHandler } = useMenuElements();
  const { wallets, getTransactions, refreshAllWalletTransactions } = useStorage();
  const { isTotalBalanceEnabled, isElectrumDisabled } = useSettings();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const navigation = useExtendedNavigation<NavigationProps>();
  const isFocused = useIsFocused();
  const route = useRoute<RouteProps>();
  const dataSource = getTransactions(undefined, 10);
  const walletsCount = useRef<number>(wallets.length);
  const walletActionButtonsRef = useRef<any>();
  const atmWallets = useMemo(() => wallets.filter(item => item.chain === Chain.ONCHAIN && item.allowReceive()), [wallets]);

  const stylesHook = StyleSheet.create({
    walletsListWrapper: {
      backgroundColor: colors.brandingColor,
    },
    listHeaderBack: {
      backgroundColor: colors.background,
      paddingTop: sizeClass === SizeClass.Large ? 8 : 0,
    },
    listHeaderText: {
      color: colors.foregroundColor,
      flexShrink: 1,
    },
    footerCard: {
      backgroundColor: colors.elevated,
      borderColor: colors.lightBorder,
      shadowColor: colors.shadowColor,
    },
    footerTitle: {
      color: colors.foregroundColor,
    },
    footerText: {
      color: colors.alternativeTextColor,
    },
    footerIcon: {
      backgroundColor: colors.lightButton,
    },
  });

  const refreshWallets = useCallback(
    async (index: number | undefined, showLoadingIndicator = true, showUpdateStatusIndicator = false) => {
      if (isElectrumDisabled) return;
      dispatch({ type: ActionTypes.SET_LOADING, payload: showLoadingIndicator });
      try {
        await refreshAllWalletTransactions(index, showUpdateStatusIndicator);
      } catch (error) {
        console.error(error);
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      }
    },
    [isElectrumDisabled, refreshAllWalletTransactions],
  );

  /**
   * Forcefully fetches TXs and balance for ALL wallets.
   * Triggered manually by user on pull-to-refresh.
   */
  const refreshTransactions = useCallback(() => {
    refreshWallets(undefined, true, true);
  }, [refreshWallets]);

  useEffect(() => {
    // Initial load of transactions without triggering scroll
    const initialLoad = async () => {
      if (isElectrumDisabled) return;
      try {
        await refreshAllWalletTransactions(undefined, true);
      } catch (error) {
        console.error(error);
      }
    };

    initialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(() => {
    console.debug('WalletsList onRefresh');
    refreshTransactions();
    // Optimized for Mac option doesn't like RN Refresh component. Menu Elements now handles it for macOS
  }, [refreshTransactions]);

  useEffect(() => {
    const screenKey = route.name;
    console.log(`[WalletsList] Registering handler with key: ${screenKey}`);
    registerTransactionsHandler(onRefresh, screenKey);

    return () => {
      console.log(`[WalletsList] Unmounting - cleaning up handler for: ${screenKey}`);
      unregisterTransactionsHandler(screenKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRefresh, registerTransactionsHandler, unregisterTransactionsHandler]);

  useFocusEffect(
    useCallback(() => {
      const screenKey = route.name;

      return () => {
        console.log(`[WalletsList] Blurred - cleaning up handler for: ${screenKey}`);
        unregisterTransactionsHandler(screenKey);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unregisterTransactionsHandler]),
  );

  useEffect(() => {
    // new wallet added - no longer auto-scrolls
    if (!isLarge) {
      // Just update the count, no scrolling
      walletsCount.current = wallets.length;
    }
  }, [isLarge, wallets]);

  const onBarScanned = useCallback(
    (value: any) => {
      if (!value) return;
      try {
        DeeplinkSchemaMatch.navigationRouteFor({ url: value }, completionValue => {
          triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
          // @ts-ignore: for now
          navigation.navigate(...completionValue);
        });
      } catch (e: any) {
        Alert.alert(loc.send.details_scan_error, e.message);
      }
    },
    [navigation],
  );

  const openAtmReceiveForWallet = useCallback(
    (wallet: TWallet) => {
      navigation.dispatch(createATMReceiveResetAction(wallet.getID()));
    },
    [navigation],
  );

  const handleOpenAtmReceive = useCallback(() => {
    if (atmWallets.length === 0) {
      navigation.navigate('AddWalletRoot');
      return;
    }

    if (atmWallets.length === 1) {
      openAtmReceiveForWallet(atmWallets[0]);
      return;
    }

    navigation.navigate('SelectWallet', {
      availableWallets: atmWallets,
      noWalletExplanationText: loc.wallets.atm_select_wallet_explanation,
      onWalletSelect: wallet => openAtmReceiveForWallet(wallet),
    });
  }, [atmWallets, navigation, openAtmReceiveForWallet]);

  const handleOpenAtmLocations = useCallback(() => {
    navigation.navigate('AtmLocations');
  }, [navigation]);

  const handleClick = useCallback(
    (item?: TWallet) => {
      if (item?.getID) {
        const walletID = item.getID();
        navigation.navigate('WalletTransactions', {
          walletID,
          walletType: item.type,
        });
      } else {
        navigation.navigate('AddWalletRoot');
      }
    },
    [navigation],
  );

  const onSnapToItem = useCallback(
    (e: { nativeEvent: { contentOffset: any } }) => {
      if (!isFocused) return;

      const contentOffset = e.nativeEvent.contentOffset;
      const index = Math.ceil(contentOffset.x / width);

      if (currentWalletIndex.current !== index) {
        console.debug('onSnapToItem', wallets.length === index ? 'NewWallet/Importing card' : index);
        if (wallets[index] && (wallets[index].timeToRefreshBalance() || wallets[index].timeToRefreshTransaction())) {
          refreshWallets(index, false, false);
        }
        currentWalletIndex.current = index;
      }
    },
    [isFocused, refreshWallets, wallets, width],
  );

  const renderListHeaderComponent = useCallback(() => {
    return (
      <View style={[styles.listHeaderBack, stylesHook.listHeaderBack]}>
        <Text
          textBreakStrategy="simple"
          style={[styles.listHeaderText, stylesHook.listHeaderText]}
          numberOfLines={2}
          adjustsFontSizeToFit={true}
        >
          {`${loc.wallets.home_activity_title}${'  '}`}
        </Text>
      </View>
    );
  }, [stylesHook.listHeaderBack, stylesHook.listHeaderText]);

  const handleLongPress = useCallback(() => {
    navigation.navigate('ManageWallets');
  }, [navigation]);

  const renderTransactionListsRow = useCallback(
    (item: ExtendedTransaction) => (
      <TransactionListItem key={item.hash} item={item} itemPriceUnit={item.walletPreferredBalanceUnit} walletID={item.walletID} />
    ),
    [],
  );

  const renderWalletsCarousel = useCallback(() => {
    return (
      <>
        <WalletsCarousel
          data={wallets}
          extraData={[wallets]}
          onPress={handleClick}
          handleLongPress={handleLongPress}
          onMomentumScrollEnd={onSnapToItem}
          ref={walletsCarousel}
          onNewWalletPress={handleClick}
          testID="WalletsList"
          horizontal
          scrollEnabled={isFocused}
          animateChanges={true}
        />
      </>
    );
  }, [handleClick, handleLongPress, isFocused, onSnapToItem, wallets]);

  const renderSectionItem = useCallback(
    (item: { section: any; item: ExtendedTransaction }) => {
      switch (item.section.key) {
        case WalletsListSections.CAROUSEL:
          return sizeClass === SizeClass.Large ? null : renderWalletsCarousel();
        case WalletsListSections.TRANSACTIONS:
          return renderTransactionListsRow(item.item);
        default:
          return null;
      }
    },
    [sizeClass, renderTransactionListsRow, renderWalletsCarousel],
  );

  const renderSectionHeader = useCallback(
    (section: { section: { key: any } }) => {
      if (sizeClass === SizeClass.Large) {
        return null;
      }

      switch (section.section.key) {
        case WalletsListSections.TRANSACTIONS:
          return renderListHeaderComponent();
        case WalletsListSections.CAROUSEL: {
          return isTotalBalanceEnabled ? (
            <View style={stylesHook.walletsListWrapper}>
              <TotalWalletsBalance />
            </View>
          ) : null;
        }
        default:
          return null;
      }
    },
    [sizeClass, isTotalBalanceEnabled, renderListHeaderComponent, stylesHook.walletsListWrapper],
  );

  const renderSectionFooter = useCallback(
    (section: { section: { key: any } }) => {
      switch (section.section.key) {
        case WalletsListSections.TRANSACTIONS:
          if (dataSource.length === 0 && !isLoading) {
            const hasWallets = wallets.length > 0;
            return (
              <View style={styles.footerRoot} testID="NoTransactionsMessage">
                <View style={[styles.footerCard, stylesHook.footerCard]}>
                  <View style={[styles.footerIcon, stylesHook.footerIcon]}>
                    <Icon
                      name={hasWallets ? 'receipt-outline' : 'shield-checkmark-outline'}
                      type="ionicon"
                      color={colors.foregroundColor}
                      size={22}
                    />
                  </View>
                  <Text style={[styles.footerTitle, stylesHook.footerTitle]}>
                    {hasWallets ? loc.wallets.home_empty_activity_title : loc.wallets.home_empty_setup_title}
                  </Text>
                  <Text style={[styles.footerText, stylesHook.footerText]}>
                    {hasWallets ? loc.wallets.home_empty_activity_text : loc.wallets.home_empty_setup_text}
                  </Text>
                </View>
              </View>
            );
          } else {
            return null;
          }
        default:
          return null;
      }
    },
    [
      colors.foregroundColor,
      dataSource.length,
      isLoading,
      stylesHook.footerCard,
      stylesHook.footerIcon,
      stylesHook.footerText,
      stylesHook.footerTitle,
      wallets.length,
    ],
  );

  const handlePrimaryActionButtonPressed = useCallback(() => {
    if (atmWallets.length === 0) {
      navigation.navigate('AddWalletRoot');
      return;
    }

    handleOpenAtmReceive();
  }, [atmWallets.length, handleOpenAtmReceive, navigation]);

  const pasteFromClipboard = useCallback(async () => {
    onBarScanned(await getClipboardContent());
  }, [onBarScanned]);

  const primaryButtonLongPress = useCallback(async () => {
    if (atmWallets.length === 0) {
      ActionSheet.showActionSheetWithOptions(
        {
          title: loc.wallets.atm_setup_title,
          options: [loc._.cancel, loc.wallets.atm_import_wallet],
          cancelButtonIndex: 0,
        },
        buttonIndex => {
          if (buttonIndex === 1) {
            // @ts-ignore react-navigation nested modal params
            navigation.navigate('AddWalletRoot', { screen: 'ImportWallet' });
          }
        },
      );
      return;
    }

    const isClipboardEmpty = (await getClipboardContent())?.trim().length === 0;

    const options = [loc._.cancel, loc.wallets.atm_action_show_qr, loc.wallets.list_long_choose, loc.wallets.list_long_scan];
    if (!isClipboardEmpty) {
      options.push(loc.wallets.paste_from_clipboard);
    }

    const props = { title: loc.receive.atm_title, options, cancelButtonIndex: 0 };

    const anchor = findNodeHandle(walletActionButtonsRef.current);

    if (anchor) {
      options.push(String(anchor));
    }

    ActionSheet.showActionSheetWithOptions(props, buttonIndex => {
      switch (buttonIndex) {
        case 0:
          break;
        case 1:
          handleOpenAtmReceive();
          break;
        case 2:
          fs.showImagePickerAndReadImage()
            .then(onBarScanned)
            .catch(error => {
              triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
              presentAlert({ title: loc.errors.error, message: error.message });
            });
          break;
        case 3:
          scanQrHelper().then(onBarScanned);
          break;
        case 4:
          if (!isClipboardEmpty) {
            pasteFromClipboard();
          }
          break;
      }
    });
  }, [atmWallets.length, handleOpenAtmReceive, navigation, onBarScanned, pasteFromClipboard]);

  const renderScanButton = useCallback(() => {
    const actionText =
      atmWallets.length === 0
        ? loc.wallets.atm_home_create_short
        : atmWallets.length === 1
          ? loc.wallets.atm_home_show_qr_short
          : loc.wallets.atm_home_show_qr_multi_short;

    const actionIcon =
      atmWallets.length === 0 ? (
        <Icon name="add-circle-outline" type="ionicon" color="#FFFFFF" />
      ) : (
        <Icon name="qr-code-outline" type="ionicon" color="#FFFFFF" size={18} />
      );

    return (
      <FContainer ref={walletActionButtonsRef}>
        <FButton
          onPress={handlePrimaryActionButtonPressed}
          onLongPress={primaryButtonLongPress}
          icon={actionIcon}
          text={actionText}
          testID="HomeScreenScanButton"
          variant="primary"
        />
        <FButton
          onPress={handleOpenAtmLocations}
          icon={<Icon name="location-outline" type="ionicon" color={colors.foregroundColor} />}
          text={loc.wallets.atm_home_map}
          testID="HomeScreenAtmMapButton"
          variant="secondary"
        />
      </FContainer>
    );
  }, [atmWallets.length, colors.foregroundColor, handleOpenAtmLocations, handlePrimaryActionButtonPressed, primaryButtonLongPress]);

  const sectionListKeyExtractor = useCallback((item: any, index: any) => {
    return `${item}${index}}`;
  }, []);

  const refreshProps = isDesktop || isElectrumDisabled ? {} : { refreshing: isLoading, onRefresh };

  const sections: SectionData[] = useMemo(() => {
    // On large screens, only show transactions section
    if (sizeClass === SizeClass.Large) {
      return [{ key: WalletsListSections.TRANSACTIONS, data: dataSource }];
    }

    // On smaller screens, show both carousel and transactions
    return [
      { key: WalletsListSections.CAROUSEL, data: [WalletsListSections.CAROUSEL] },
      { key: WalletsListSections.TRANSACTIONS, data: dataSource },
    ];
  }, [sizeClass, dataSource]);

  // Constants for layout calculations
  const TRANSACTION_ITEM_HEIGHT = 80;
  const CAROUSEL_HEIGHT = 258;
  const SECTION_HEADER_HEIGHT = 56; // Base height
  const LARGE_TITLE_EXTRA_HEIGHT = 20; // Additional height for large titles

  const getSectionHeaderHeight = useCallback(() => {
    return SECTION_HEADER_HEIGHT + (sizeClass === SizeClass.Large ? LARGE_TITLE_EXTRA_HEIGHT : 0);
  }, [sizeClass]);

  const getItemLayout = useCallback(
    (data: any, index: number) => {
      const headerHeight = getSectionHeaderHeight();

      if (sizeClass === SizeClass.Large) {
        // On large screens: only transaction items, no carousel
        return {
          length: TRANSACTION_ITEM_HEIGHT,
          offset: TRANSACTION_ITEM_HEIGHT * index,
          index,
        };
      } else {
        // On smaller screens: first item is carousel, rest are transactions
        // First section: Carousel
        if (index === 0) {
          return {
            length: CAROUSEL_HEIGHT,
            offset: 0,
            index,
          };
        }

        // Second section: Transactions
        // Need to account for:
        // 1. Carousel height
        // 2. Section header height for transactions section
        // 3. Transaction items
        const transactionIndex = index - 1; // Adjust index to account for carousel
        return {
          length: TRANSACTION_ITEM_HEIGHT,
          offset: CAROUSEL_HEIGHT + headerHeight + TRANSACTION_ITEM_HEIGHT * transactionIndex,
          index,
        };
      }
    },
    [sizeClass, getSectionHeaderHeight],
  );

  return (
    <>
      <SafeAreaSectionList<any | string, SectionData>
        renderItem={renderSectionItem}
        keyExtractor={sectionListKeyExtractor}
        renderSectionHeader={renderSectionHeader}
        initialNumToRender={10}
        renderSectionFooter={renderSectionFooter}
        sections={sections}
        floatingButtonHeight={70}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        getItemLayout={getItemLayout}
        ignoreTopInset={true} // Ignore top inset as the screen header already handles it
        {...refreshProps}
      />
      {renderScanButton()}
    </>
  );
};

export default WalletsList;

const styles = StyleSheet.create({
  listHeaderBack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 56,
  },
  listHeaderText: {
    fontWeight: 'bold',
    fontSize: 24,
    marginVertical: 16,
    flexWrap: 'wrap',
  },
  footerRoot: {
    paddingHorizontal: 24,
    paddingTop: 24,
    marginBottom: 116,
  },
  footerCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  footerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  footerTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'center',
  },
  footerText: {
    marginTop: 7,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 295,
  },
});
