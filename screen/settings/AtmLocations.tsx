import { useNavigation } from '@react-navigation/native';
import { Icon } from '@rneui/themed';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import HeaderRightButton from '../../components/HeaderRightButton';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { ATM_LOCATIONS_API_URL, ATM_LOCATIONS_TILE_URL, ATM_LOCATIONS_TITLE, ATM_LOCATIONS_URL } from './atmLocationsConfig';

const AMERICA_BLUE = '#040766';
const AMERICA_RED = '#ED122E';
const STATUS_CHIP_BACKGROUND = 'rgba(237, 18, 46, 0.08)';
const SURFACE_TINT = '#F7F8FC';
const DEFAULT_REGION = {
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 34,
  longitudeDelta: 40,
};

const DAY_FIELDS = [
  { key: 'sunday', label: 'Sunday' },
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
] as const;

type RawCustomFields = Record<string, string | null | undefined>;

type RawStorepointLocation = {
  color?: string | null;
  custom_fields?: string | RawCustomFields | null;
  description?: string | null;
  email?: string | null;
  id: number;
  image_url?: string | null;
  loc_lat: number;
  loc_long: number;
  name: string;
  phone?: string | null;
  streetaddress: string;
  tags?: string | null;
  website?: string | null;
  sunday?: string | null;
  monday?: string | null;
  tuesday?: string | null;
  wednesday?: string | null;
  thursday?: string | null;
  friday?: string | null;
  saturday?: string | null;
};

type StorepointResponse = {
  success?: boolean;
  results?: {
    locations?: RawStorepointLocation[] | null;
  };
};

type AtmLocation = {
  address: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  description?: string;
  id: string;
  lid?: string;
  name: string;
  phone?: string;
  searchIndex: string;
  status?: string;
  tags: string[];
  todayHours?: string;
  website?: string;
};

const parseCustomFields = (customFields: RawStorepointLocation['custom_fields']): Record<string, string> => {
  if (!customFields) return {};

  if (typeof customFields === 'string') {
    try {
      const parsed = JSON.parse(customFields) as RawCustomFields;
      return Object.entries(parsed).reduce<Record<string, string>>((result, [key, value]) => {
        if (typeof value === 'string' && value.trim().length > 0) {
          result[key] = value.trim();
        }

        return result;
      }, {});
    } catch {
      return {};
    }
  }

  return Object.entries(customFields).reduce<Record<string, string>>((result, [key, value]) => {
    if (typeof value === 'string' && value.trim().length > 0) {
      result[key] = value.trim();
    }

    return result;
  }, {});
};

const normalizeText = (value?: string | null): string => {
  if (!value) return '';
  return value.replace(/\s+/g, ' ').trim();
};

const formatTag = (tag: string): string =>
  tag
    .split(' ')
    .map(part => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');

const formatStatus = (status?: string): string | undefined => {
  if (!status) return undefined;
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

const getTodayHours = (location: RawStorepointLocation): string | undefined => {
  const todayField = DAY_FIELDS[new Date().getDay()];
  const hours = normalizeText(location[todayField.key]);

  if (hours) {
    return `Today: ${hours}`;
  }

  const firstAvailableField = DAY_FIELDS.find(({ key }) => normalizeText(location[key]).length > 0);
  if (!firstAvailableField) return undefined;

  return `${firstAvailableField.label}: ${normalizeText(location[firstAvailableField.key])}`;
};

const sanitizePhoneNumber = (phone?: string): string | undefined => {
  if (!phone) return undefined;
  const normalized = phone.replace(/[^\d+]/g, '');
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeLocation = (location: RawStorepointLocation): AtmLocation | null => {
  if (!Number.isFinite(location.loc_lat) || !Number.isFinite(location.loc_long)) return null;

  const customFields = parseCustomFields(location.custom_fields);
  const customFieldValues = Object.values(customFields);
  const lid = customFieldValues.find(value => /^[A-Z]{2}\d+/i.test(value));
  const status = customFieldValues.find(value => /^(active|inactive|closed)$/i.test(value));
  const tags = normalizeText(location.tags)
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
  const name = normalizeText(location.name);
  const address = normalizeText(location.streetaddress);
  const website = normalizeText(location.website) || undefined;
  const phone = sanitizePhoneNumber(location.phone || undefined);
  const todayHours = getTodayHours(location);
  const description = normalizeText(location.description) || undefined;

  return {
    address,
    coordinate: {
      latitude: location.loc_lat,
      longitude: location.loc_long,
    },
    description,
    id: String(location.id),
    lid,
    name,
    phone,
    searchIndex: [name, address, ...tags, lid, status, website].filter(Boolean).join(' ').toLowerCase(),
    status,
    tags,
    todayHours,
    website,
  };
};

const buildDirectionsUrl = (location: AtmLocation): string => {
  const { latitude, longitude } = location.coordinate;
  const destination = `${latitude},${longitude}`;

  if (Platform.OS === 'ios') {
    return `http://maps.apple.com/?ll=${destination}&q=${encodeURIComponent(location.name)}`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
};

const AtmLocations: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const mapRef = useRef<MapView | null>(null);
  const [locations, setLocations] = useState<AtmLocation[]>([]);
  const [query, setQuery] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const openCurrentPageExternally = useCallback(() => {
    Linking.openURL(ATM_LOCATIONS_URL);
  }, []);

  const HeaderRightAction = useCallback(
    () => <HeaderRightButton title="Open" onPress={openCurrentPageExternally} disabled={false} testID="AtmLocationsOpen" />,
    [openCurrentPageExternally],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: HeaderRightAction,
    });
  }, [HeaderRightAction, navigation]);

  const loadLocations = useCallback(async () => {
    setErrorMessage('');

    try {
      const response = await fetch(`${ATM_LOCATIONS_API_URL}?rq`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as StorepointResponse;
      const nextLocations = (payload.results?.locations ?? []).map(normalizeLocation).filter(Boolean) as AtmLocation[];

      setLocations(nextLocations);
      setSelectedLocationId(previousSelection => previousSelection ?? nextLocations[0]?.id);
    } catch (error) {
      console.error('Failed to load ATM locations', error);
      setErrorMessage(loc.wallets.atm_map_error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const filteredLocations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return locations;

    return locations.filter(location => location.searchIndex.includes(normalizedQuery));
  }, [locations, query]);

  const selectedLocation = useMemo(
    () => filteredLocations.find(location => location.id === selectedLocationId) ?? filteredLocations[0],
    [filteredLocations, selectedLocationId],
  );

  useEffect(() => {
    if (!filteredLocations.length) {
      setSelectedLocationId(undefined);
      return;
    }

    if (!selectedLocation || !filteredLocations.some(location => location.id === selectedLocation.id)) {
      setSelectedLocationId(filteredLocations[0].id);
    }
  }, [filteredLocations, selectedLocation]);

  const fitMapToLocations = useCallback((nextLocations: AtmLocation[]) => {
    if (!mapRef.current || nextLocations.length === 0) return;

    mapRef.current.fitToCoordinates(
      nextLocations.map(location => location.coordinate),
      {
        animated: true,
        edgePadding: {
          top: 80,
          right: 50,
          bottom: 80,
          left: 50,
        },
      },
    );
  }, []);

  const centerMapOnLocation = useCallback((location: AtmLocation) => {
    mapRef.current?.animateToRegion(
      {
        ...location.coordinate,
        latitudeDelta: 0.22,
        longitudeDelta: 0.22,
      },
      250,
    );
  }, []);

  useEffect(() => {
    if (!isMapReady || filteredLocations.length === 0) return;

    if (filteredLocations.length === 1) {
      centerMapOnLocation(filteredLocations[0]);
      return;
    }

    fitMapToLocations(filteredLocations);
  }, [centerMapOnLocation, filteredLocations, fitMapToLocations, isMapReady, query]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadLocations();
  }, [loadLocations]);

  const handleSelectLocation = useCallback(
    (location: AtmLocation) => {
      setSelectedLocationId(location.id);
      centerMapOnLocation(location);
    },
    [centerMapOnLocation],
  );

  const handleOpenDirections = useCallback((location: AtmLocation) => {
    Linking.openURL(buildDirectionsUrl(location));
  }, []);

  const handleCallLocation = useCallback((location: AtmLocation) => {
    if (!location.phone) return;
    Linking.openURL(`tel:${location.phone}`);
  }, []);

  const handleOpenWebsite = useCallback((location: AtmLocation) => {
    if (!location.website) return;
    const websiteUrl = /^https?:\/\//i.test(location.website) ? location.website : `https://${location.website}`;
    Linking.openURL(websiteUrl);
  }, []);

  const resultsLabel =
    query.trim().length > 0
      ? loc.formatString(loc.wallets.atm_map_results_filtered, { count: filteredLocations.length })
      : loc.formatString(loc.wallets.atm_map_results, { count: filteredLocations.length });

  if (errorMessage && locations.length === 0) {
    return (
      <View style={[styles.errorRoot, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.foregroundColor }]}>{ATM_LOCATIONS_TITLE}</Text>
        <Text style={[styles.errorText, { color: colors.alternativeTextColor }]}>{errorMessage}</Text>
        <View style={styles.errorActionRow}>
          <Pressable style={styles.primaryAction} onPress={handleRefresh}>
            <Text style={styles.primaryActionText}>{loc.wallets.atm_map_retry}</Text>
          </Pressable>
        </View>
        <View style={styles.errorActionRow}>
          <Pressable style={styles.secondaryAction} onPress={openCurrentPageExternally}>
            <Text style={styles.secondaryActionText}>{loc.wallets.atm_map_open_browser}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.heroCard, { backgroundColor: SURFACE_TINT, borderColor: colors.lightBorder }]}>
          <View style={styles.heroHeader}>
            <View style={styles.liveBadge}>
              <Icon color="#FFFFFF" name="ellipse" size={10} type="ionicon" />
              <Text style={styles.liveBadgeText}>{loc.wallets.atm_map_live_badge}</Text>
            </View>
            <Text style={[styles.tapHint, { color: colors.alternativeTextColor }]}>{loc.wallets.atm_map_tap_hint}</Text>
          </View>

          <View style={[styles.searchShell, { backgroundColor: colors.elevated, borderColor: colors.lightBorder }]}>
            <Icon name="search-outline" type="ionicon" size={18} color={colors.alternativeTextColor} />
            <TextInput
              autoCorrect={false}
              autoCapitalize="words"
              clearButtonMode="never"
              onChangeText={setQuery}
              placeholder={loc.wallets.atm_map_search_placeholder}
              placeholderTextColor={colors.alternativeTextColor}
              style={[styles.searchInput, { color: colors.foregroundColor }]}
              value={query}
            />
            {query.length > 0 && (
              <Pressable accessibilityRole="button" onPress={() => setQuery('')} style={styles.clearSearchButton}>
                <Icon name="close-circle" type="ionicon" size={18} color={colors.alternativeTextColor} />
              </Pressable>
            )}
          </View>

          <Text style={[styles.helperText, { color: colors.alternativeTextColor }]}>{loc.wallets.atm_map_helper}</Text>
        </View>

        <View style={[styles.mapShell, { borderColor: colors.lightBorder, backgroundColor: colors.elevated }]}>
          <MapView
            ref={mapRef}
            initialRegion={DEFAULT_REGION}
            mapType={Platform.OS === 'android' ? 'none' : 'mutedStandard'}
            onMapReady={() => setIsMapReady(true)}
            rotateEnabled={false}
            toolbarEnabled={false}
            style={StyleSheet.absoluteFillObject}
          >
            {Platform.OS === 'android' && <UrlTile maximumZ={19} tileSize={256} urlTemplate={ATM_LOCATIONS_TILE_URL} zIndex={-1} />}
            {filteredLocations.map(location => (
              <Marker
                key={location.id}
                coordinate={location.coordinate}
                description={location.address}
                onPress={() => handleSelectLocation(location)}
                pinColor={selectedLocation?.id === location.id ? AMERICA_BLUE : AMERICA_RED}
                title={location.name}
              />
            ))}
          </MapView>

          {isLoading && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator color={AMERICA_BLUE} size="large" />
              <Text style={[styles.loadingText, { color: colors.foregroundColor }]}>{loc.wallets.atm_map_loading}</Text>
            </View>
          )}
        </View>

        {selectedLocation && (
          <View style={[styles.selectedCard, { backgroundColor: colors.elevated, borderColor: colors.lightBorder }]}>
            <View style={styles.selectedHeader}>
              <Text style={[styles.selectedEyebrow, { color: colors.alternativeTextColor }]}>{loc.wallets.atm_map_selected}</Text>
              {selectedLocation.todayHours ? (
                <View style={[styles.infoChip, { backgroundColor: colors.lightButton }]}>
                  <Icon color={AMERICA_BLUE} name="time-outline" size={13} type="ionicon" />
                  <Text style={[styles.infoChipText, { color: colors.foregroundColor }]} numberOfLines={1}>
                    {selectedLocation.todayHours}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.selectedTitle, { color: colors.foregroundColor }]} numberOfLines={2}>
              {selectedLocation.name}
            </Text>

            <View style={styles.detailRow}>
              <Icon color={colors.alternativeTextColor} name="location-outline" size={16} type="ionicon" />
              <Text style={[styles.selectedAddress, { color: colors.alternativeTextColor }]}>{selectedLocation.address}</Text>
            </View>
          </View>
        )}

        <View style={styles.resultsHeader}>
          <View style={[styles.resultsPill, { backgroundColor: colors.lightButton }]}>
            <Text style={[styles.resultsLabel, { color: colors.foregroundColor }]}>{resultsLabel}</Text>
          </View>
          {query.length > 0 && (
            <Pressable accessibilityRole="button" onPress={() => setQuery('')} style={styles.resultsClearButton}>
              <Text style={styles.clearSearchText}>{loc.wallets.atm_map_reset_search}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.resultsContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={AMERICA_BLUE} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredLocations.length === 0 ? (
          <View style={[styles.emptyState, { borderColor: colors.lightBorder, backgroundColor: colors.elevated }]}>
            <Text style={[styles.emptyStateText, { color: colors.foregroundColor }]}>{loc.wallets.atm_map_empty}</Text>
            <Pressable accessibilityRole="button" onPress={() => setQuery('')} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>{loc.wallets.atm_map_reset_search}</Text>
            </Pressable>
          </View>
        ) : (
          filteredLocations.map(location => {
            const isSelected = selectedLocation?.id === location.id;

            return (
              <Pressable
                key={location.id}
                accessibilityRole="button"
                onPress={() => handleSelectLocation(location)}
                style={[
                  styles.locationCard,
                  {
                    backgroundColor: colors.elevated,
                    borderColor: isSelected ? AMERICA_BLUE : colors.lightBorder,
                  },
                  isSelected ? styles.locationCardSelected : null,
                ]}
              >
                <View style={styles.locationCardHeader}>
                  <View style={styles.locationBadge}>
                    <Text style={styles.locationBadgeText}>{loc.wallets.atm_badge.toUpperCase()}</Text>
                  </View>
                  {location.lid ? (
                    <Text style={[styles.locationMeta, { color: colors.alternativeTextColor }]}>ID {location.lid}</Text>
                  ) : null}
                </View>

                <Text style={[styles.locationTitle, { color: colors.foregroundColor }]}>{location.name}</Text>

                <View style={styles.detailRow}>
                  <Icon color={colors.alternativeTextColor} name="location-outline" size={15} type="ionicon" />
                  <Text style={[styles.locationAddress, { color: colors.alternativeTextColor }]}>{location.address}</Text>
                </View>

                {(location.todayHours || location.status) && (
                  <View style={styles.metaRow}>
                    {location.todayHours ? (
                      <View style={[styles.infoChip, { backgroundColor: colors.lightButton }]}>
                        <Icon color={AMERICA_BLUE} name="time-outline" size={13} type="ionicon" />
                        <Text style={[styles.infoChipText, { color: colors.foregroundColor }]} numberOfLines={1}>
                          {location.todayHours}
                        </Text>
                      </View>
                    ) : null}
                    {formatStatus(location.status) ? (
                      <View style={[styles.infoChip, styles.statusChip]}>
                        <Icon color={AMERICA_RED} name="ellipse" size={10} type="ionicon" />
                        <Text style={[styles.infoChipText, { color: AMERICA_RED }]}>{formatStatus(location.status)}</Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {location.tags.length > 0 && (
                  <View style={styles.tagRow}>
                    {location.tags.slice(0, 3).map(tag => (
                      <View key={`${location.id}-${tag}`} style={[styles.tagChip, { backgroundColor: colors.lightButton }]}>
                        <Text style={[styles.tagChipText, { color: colors.foregroundColor }]}>{formatTag(tag)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.actionRow}>
                  <Pressable accessibilityRole="button" onPress={() => handleOpenDirections(location)} style={styles.actionPillPrimary}>
                    <Icon color="#FFFFFF" name="navigate-outline" size={16} type="ionicon" />
                    <Text style={styles.actionPillPrimaryText}>{loc.wallets.atm_map_directions}</Text>
                  </Pressable>

                  {location.phone ? (
                    <Pressable accessibilityRole="button" onPress={() => handleCallLocation(location)} style={styles.actionPillSecondary}>
                      <Icon color={AMERICA_BLUE} name="call-outline" size={16} type="ionicon" />
                      <Text style={styles.actionPillSecondaryText}>{loc.wallets.atm_map_call}</Text>
                    </Pressable>
                  ) : null}

                  {location.website ? (
                    <Pressable accessibilityRole="button" onPress={() => handleOpenWebsite(location)} style={styles.actionPillSecondary}>
                      <Icon color={AMERICA_BLUE} name="globe-outline" size={16} type="ionicon" />
                      <Text style={styles.actionPillSecondaryText}>{loc.wallets.atm_map_website}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

export default AtmLocations;

const styles = StyleSheet.create({
  actionPillPrimary: {
    alignItems: 'center',
    backgroundColor: AMERICA_BLUE,
    borderRadius: 999,
    flexDirection: 'row',
    justifyContent: 'center',
    marginRight: 8,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionPillPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  actionPillSecondary: {
    alignItems: 'center',
    backgroundColor: '#EEF0F4',
    borderRadius: 999,
    flexDirection: 'row',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 8,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionPillSecondaryText: {
    color: AMERICA_BLUE,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  actionRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 18,
  },
  clearSearchButton: {
    paddingLeft: 8,
  },
  clearSearchText: {
    color: AMERICA_BLUE,
    fontSize: 14,
    fontWeight: '700',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  detailRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginTop: 10,
  },
  emptyState: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 16,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorActionRow: {
    marginBottom: 12,
    width: '100%',
  },
  errorRoot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  heroHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoChip: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    marginRight: 8,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoChipText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
  },
  liveBadge: {
    alignItems: 'center',
    backgroundColor: AMERICA_RED,
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginLeft: 6,
  },
  locationAddress: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
  },
  locationBadge: {
    backgroundColor: AMERICA_RED,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  locationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  locationCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 14,
    marginHorizontal: 16,
    padding: 18,
  },
  locationCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  locationCardSelected: {
    elevation: 5,
    shadowColor: '#040766',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  locationMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  mapLoadingOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  mapShell: {
    borderRadius: 28,
    borderWidth: 1,
    height: 300,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#040766',
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: AMERICA_BLUE,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resultsClearButton: {
    paddingLeft: 12,
  },
  resultsContent: {
    paddingBottom: 32,
  },
  resultsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultsLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  resultsPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 10,
    paddingVertical: 0,
  },
  searchShell: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 54,
    paddingHorizontal: 14,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: '#EEF0F4',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryActionText: {
    color: AMERICA_BLUE,
    fontSize: 16,
    fontWeight: '700',
  },
  statusChip: {
    backgroundColor: STATUS_CHIP_BACKGROUND,
  },
  selectedAddress: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
  },
  selectedCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  selectedEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  selectedHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectedTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 10,
  },
  tapHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 12,
    textAlign: 'right',
  },
  tagChip: {
    borderRadius: 999,
    marginRight: 8,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
});
