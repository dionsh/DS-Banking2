import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';

// importer per screens
import SignUp from '../screens/SignUp';
import Login from '../screens/Login';
import Register from '../screens/Register';
import IdentityVerification from '../screens/IdentityVerification';
import SavingsAccount from '../screens/SavingsAccount'
import Credit from '../screens/Credit'
import PublicServices from '../screens/PublicServices'
import AutomaticOrder from '../screens/AutomaticOrder'


import DrawerNavigation from './DrawerNavigation';
import LogOut from '../screens/LogOut';
import Profile from '../screens/Profile';
import PersonalDetails from '../screens/PersonalDetails';
import Settings from '../screens/Settings';
import Card from '../screens/Card';
import Transactions from '../screens/Transactions';
import TopUp from '../screens/TopUp';
import Notifications from '../screens/Notifications';
import Help from '../screens/Help';
import ApplePay from '../screens/ApplePay';
import PersonalizeCard from '../screens/PersonalizeCard';



const Stack = createNativeStackNavigator();

export default function StackNavigation() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="SignUp"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      
      <Stack.Screen name="SignUp" component={SignUp} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="IdentityVerification" component={IdentityVerification} />
       <Stack.Screen name="SavingsAccount" component={SavingsAccount} />
        <Stack.Screen name="Credit" component={Credit} />
        <Stack.Screen name="PublicServices" component={PublicServices} />
        <Stack.Screen name="AutomaticOrder" component={AutomaticOrder}/>
         <Stack.Screen name="LogOut" component={LogOut}/>
       <Stack.Screen name="Profile" component={Profile}/>
        <Stack.Screen name="PersonalDetails" component={PersonalDetails}/>
        <Stack.Screen name="Settings" component={Settings}/>
        <Stack.Screen name="Card" component={Card}/>
        <Stack.Screen name="Transactions" component={Transactions}/>
        <Stack.Screen name="TopUp" component={TopUp}/>
        <Stack.Screen name="Notifications" component={Notifications}/>
        <Stack.Screen name="Help" component={Help}/>
        <Stack.Screen name="ApplePay" component={ApplePay}/>
        <Stack.Screen name="PersonalizeCard" component={PersonalizeCard}/>
       
        

     
      <Stack.Screen name="MainApp" component={DrawerNavigation} />
    </Stack.Navigator>
  );
}
