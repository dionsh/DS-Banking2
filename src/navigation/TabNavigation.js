import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

//importi per screens te tab navigator
import Home from "../screens/Home";
import Transfer from "../screens/Transfer";
import MyCharacter from "../screens/MyCharacter";
import Settings from "../screens/Settings";
import NOVA from "../screens/NOVA";

const Tab = createBottomTabNavigator();

export default function TabNavigation() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tabInactive,

        tabBarStyle: {
          backgroundColor: colors.card,
          height: 70,
          paddingBottom: 10,
          borderTopWidth: 0,
          elevation: 8,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarLabel: t("tab.home"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-outline" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="Transfer"
        component={Transfer}
        options={{
          tabBarLabel: t("tab.transfer"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bank-transfer" color={color} size={size} />
          ),
        }}
      />

    <Tab.Screen
        name="NOVA"
        component={NOVA}
        options={{
          tabBarLabel: t("tab.nova"),
          tabBarIcon: ({ color, size }) => (
<MaterialCommunityIcons name="account-tie-voice-outline" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="My Character"
        component={MyCharacter}
        options={{
          tabBarLabel: t("tab.myCharacter"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="tshirt-crew-outline" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="Settings"
        component={Settings}
        options={{
          tabBarLabel: t("tab.settings"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}




