import React, { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View, ActivityIndicator } from "react-native";
import { useTheme } from "../styles/ThemeProvider";

import { HomeScreen } from "../screens/home/HomeScreen";
import { ChatScreen } from "../screens/chat/ChatScreen";
import { WorkspaceScreen } from "../screens/workspace/WorkspaceScreen";
import { WorkspaceDetailScreen } from "../screens/workspace/WorkspaceDetailScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { AuthScreen } from "../screens/auth/AuthScreen";
import { useAuthStore } from "../store/useAuthStore";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ name, focused, color }: { name: string; focused: boolean; color: string }) {
  return (
    <View style={{
      width: 36,
      height: 28,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: focused ? color + "20" : "transparent",
    }}>
      <Ionicons name={name as any} size={22} color={color} />
    </View>
  );
}

const WsStack = createNativeStackNavigator();

function WorkspaceStack() {
  return (
    <WsStack.Navigator screenOptions={{ headerShown: false }}>
      <WsStack.Screen name="WorkspaceList" component={WorkspaceScreen} />
      <WsStack.Screen name="WorkspaceDetail" component={WorkspaceDetailScreen} />
    </WsStack.Navigator>
  );
}

function TabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: "transparent",
          borderTopWidth: 0,
          height: 82,
          paddingBottom: 26,
          paddingTop: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.3,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} color={focused ? colors.primary : colors.textTertiary} />,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: "Chat",
          tabBarIcon: ({ focused }) => <TabIcon name="chatbubble-ellipses" focused={focused} color={focused ? colors.primary : colors.textTertiary} />,
        }}
      />
      <Tab.Screen
        name="Workspace"
        component={WorkspaceStack}
        options={{
          tabBarLabel: "Workspace",
          tabBarIcon: ({ focused }) => <TabIcon name="grid" focused={focused} color={focused ? colors.primary : colors.textTertiary} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e: any) => {
            const state = navigation.getState();
            const wsRoute = state?.routes.find((r: any) => r.name === "Workspace");
            const wsState = wsRoute?.state;
            if (wsState && wsState.index > 0) {
              e.preventDefault();
              navigation.navigate("Workspace");
            }
          },
        })}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: "Settings",
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} color={focused ? colors.primary : colors.textTertiary} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const { colors } = useTheme();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={TabNavigator} />
      ) : (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ animationTypeForReplace: "pop" }}
        />
      )}
    </Stack.Navigator>
  );
}
