# distro-app context
Expo managed workflow (blank-typescript)
Token storage: expo-secure-store ONLY. NEVER AsyncStorage. Zero exceptions.
Navigation: RootNavigator → role check → BuyerTabs or AdminTabs or AuthStack
API URL: EXPO_PUBLIC_API_URL (machine IP, not localhost)

@./docs/mobile-architecture.md
