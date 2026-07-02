import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

import TabNavigation from "./TabNavigation";
import MyOffers from "../screens/MyOffers";
import Settings from "../screens/Settings";
import Home from "../screens/Home";
import SavingsAccount from "../screens/SavingsAccount";
import Credit from "../screens/Credit";
import PublicServices from "../screens/PublicServices";
import AutomaticOrder from "../screens/AutomaticOrder";
import LogOut from "../screens/LogOut";
import Profile from "../screens/Profile";
import PersonalDetails from "../screens/PersonalDetails";
import Card from "../screens/Card";
import Transfer from "../screens/Transfer";
import Transactions from "../screens/Transactions";
import NOVA from "../screens/NOVA";
import TopUp from "../screens/TopUp";
import SplitBill from "../screens/SplitBill";
import RoundItUp from "../screens/RoundItUp";
import WordleRewards from "../screens/WordleRewards";
import MySavings from "../screens/MySavings";
import Rewards from "../screens/Rewards";
import PartnerCashback from "../screens/PartnerCashback";
import DrivingGame from "../screens/DrivingGame";
import ApplePay from "../screens/ApplePay";
import AtmLocations from "../screens/AtmLocations";
import MyCharacter from "../screens/MyCharacter";
import InviteFriends from "../screens/InviteFriends";
import Subscriptions from "../screens/Subscriptions";
import Analytics from "../screens/Analytics";
import AICoach from "../screens/AICoach";
import InvestSimulator from "../screens/InvestSimulator";
import BudgetPlanner from "../screens/BudgetPlanner";
import SharedSavings from "../screens/SharedSavings";

const Drawer = createDrawerNavigator();

const LOGOUT_COLOR = "#FF3B30"; // Ngjyra kuqe per logout

export default function DrawerNavigation() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: colors.accent,
        drawerInactiveTintColor: colors.drawerInactive,
        drawerActiveBackgroundColor: colors.drawerActiveBg,
        drawerStyle: {
          backgroundColor: colors.background,
          width: 260,
        },
        drawerLabelStyle: {
          fontSize: 15,
          fontWeight: "600",
        },
      }}
    >
      <Drawer.Screen
        name="MainTabs"
        component={TabNavigation}
        options={{
          drawerLabel: t("menu.home"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="My Character"
        component={MyCharacter}
        options={{
          drawerLabel: t("menu.myCharacter"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="tshirt-crew-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Analytics"
        component={Analytics}
        options={{
          drawerLabel: "Analytics",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-donut" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="AI Coach"
        component={AICoach}
        options={{
          drawerLabel: "AI Coach",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="robot-happy-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Budget Planner"
        component={BudgetPlanner}
        options={{
          drawerLabel: "Budget Planner",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="wallet-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Shared Savings"
        component={SharedSavings}
        options={{
          drawerLabel: "Shared Savings",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Invest Simulator"
        component={InvestSimulator}
        options={{
          drawerLabel: "Invest Simulator",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="finance" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Invite Friends"
        component={InviteFriends}
        options={{
          drawerLabel: "Invite Friends",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="qrcode" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="My Offers"
        component={MyOffers}
        options={{
          drawerLabel: t("menu.offers"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="tag-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Cashback"
        component={PartnerCashback}
        options={{
          drawerLabel: t("menu.cashback"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="sale" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Subscriptions"
        component={Subscriptions}
        options={{
          drawerLabel: "Subscriptions",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="credit-card-multiple-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Settings"
        component={Settings}
        options={{
          drawerLabel: t("menu.settings"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="SavingsAccount"
        component={SavingsAccount}
        options={{
          drawerLabel: t("menu.savingsAccount"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bank-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Credit"
        component={Credit}
        options={{
          drawerLabel: t("menu.credit"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="credit-card-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="PublicServices"
        component={PublicServices}
        options={{
          drawerLabel: t("menu.publicServices"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="office-building-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="ATM Locations"
        component={AtmLocations}
        options={{
          drawerLabel: t("menu.atmLocations"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-marker-radius" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="AutomaticOrder"
        component={AutomaticOrder}
        options={{
          drawerLabel: t("menu.automaticOrder"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="autorenew" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Profile"
        component={Profile}
        options={{
          drawerLabel: t("menu.profile"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="PersonalDetails"
        component={PersonalDetails}
        options={{
          drawerLabel: t("menu.personalDetails"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-box-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Card"
        component={Card}
        options={{
          drawerLabel: t("menu.card"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="credit-card" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Apple Pay"
        component={ApplePay}
        options={{
          drawerLabel: t("menu.applePay"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="apple" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Transfer"
        component={Transfer}
        options={{
          drawerLabel: t("menu.transfer"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bank-transfer" color={color} size={size} />
          ),
        }}
      />


      <Drawer.Screen
        name="Transactions"
        component={Transactions}
        options={{
          drawerLabel: t("menu.transactions"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="swap-horizontal" color={color} size={size} />
          ),
        }}
      />


       <Drawer.Screen
        name="NOVA"
        component={NOVA}
        options={{
          drawerLabel: t("menu.nova"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-tie-voice-outline" color={color} size={size} />
          ),
        }}
      />


      <Drawer.Screen
        name="TopUp"
        component={TopUp}
        options={{
          drawerLabel: t("menu.topUp"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="phone-plus" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Split The Bill"
        component={SplitBill}
        options={{
          drawerLabel: t("menu.splitBill"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="call-split" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Round It Up"
        component={RoundItUp}
        options={{
          drawerLabel: t("menu.roundItUp"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="contactless-payment-circle-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Wordle Rewards"
        component={WordleRewards}
        options={{
          drawerLabel: t("menu.wordleRewards"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="gamepad-variant-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Driving Game"
        component={DrivingGame}
        options={{
          drawerLabel: t("menu.drivingGame"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="car-sports" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Savings"
        component={MySavings}
        options={{
          drawerLabel: t("menu.savings"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="piggy-bank-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="Rewards"
        component={Rewards}
        options={{
          drawerLabel: t("menu.rewards"),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="trophy-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="LogOut"
        component={LogOut}
        options={{
          drawerLabel: t("menu.logout"),
          drawerIcon: ({ size }) => (
            <MaterialCommunityIcons name="logout" color={LOGOUT_COLOR} size={size} />
          ),
          drawerLabelStyle: { color: LOGOUT_COLOR },
        }}
      />
    </Drawer.Navigator>
  );
}
