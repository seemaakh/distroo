import { createStackNavigator } from "@react-navigation/stack";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { OTPScreen } from "../screens/auth/OTPScreen";
import { RegisterStep2Screen } from "../screens/auth/RegisterStep2Screen";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  OTP: { phone: string };
  RegisterStep2: { phone: string; otpToken: string };
};

const Stack = createStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
      <Stack.Screen name="RegisterStep2" component={RegisterStep2Screen} />
    </Stack.Navigator>
  );
}
