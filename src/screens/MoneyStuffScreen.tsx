import { ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'MoneyStuff'>;

type Transaction = {
  id: number;
  label: string;
  date: string;
  fund: 'Savings' | 'Fun Fund';
  amount: number;
  contributors: string[];
};

const TRANSACTIONS: Transaction[] = [
  { id: 1, label: 'Monthly deposit', date: 'Apr 3', fund: 'Savings', amount: 100, contributors: ['Natalia'] },
  { id: 2, label: 'Monthly deposit', date: 'Apr 3', fund: 'Savings', amount: 100, contributors: ['Suhayl'] },
  { id: 3, label: 'Monthly deposit', date: 'Apr 3', fund: 'Fun Fund', amount: 100, contributors: ['Natalia'] },
  { id: 4, label: 'Monthly deposit', date: 'Apr 3', fund: 'Fun Fund', amount: 100, contributors: ['Suhayl'] },
  {
    id: 5,
    label: 'Additional deposit',
    date: 'Mar 29',
    fund: 'Savings',
    amount: 56.25,
    contributors: ['Suhayl', 'Natalia'],
  },
  {
    id: 6,
    label: 'John Summit tix sold',
    date: 'Mar 13',
    fund: 'Savings',
    amount: 300,
    contributors: ['Suhayl'],
  },
  { id: 7, label: 'Monthly deposit', date: 'Mar 2', fund: 'Savings', amount: 100, contributors: ['Natalia'] },
  { id: 8, label: 'Monthly deposit', date: 'Mar 2', fund: 'Savings', amount: 100, contributors: ['Suhayl'] },
  { id: 9, label: 'Monthly deposit', date: 'Mar 2', fund: 'Fun Fund', amount: 100, contributors: ['Natalia'] },
  { id: 10, label: 'Monthly deposit', date: 'Mar 2', fund: 'Fun Fund', amount: 100, contributors: ['Suhayl'] },
];

const monthMap: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function getMonthFromDateToken(dateToken: string): number | null {
  const monthToken = dateToken.trim().split(' ')[0];
  const parsedMonth = monthMap[monthToken];
  return parsedMonth === undefined ? null : parsedMonth;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function MoneyStuffScreen({ navigation }: Props) {
  const totalBalance = TRANSACTIONS.reduce((sum, tx) => sum + tx.amount, 0);
  const savingsTotal = TRANSACTIONS.filter((tx) => tx.fund === 'Savings').reduce((sum, tx) => sum + tx.amount, 0);
  const funFundTotal = TRANSACTIONS.filter((tx) => tx.fund === 'Fun Fund').reduce((sum, tx) => sum + tx.amount, 0);
  const savingsPct = totalBalance > 0 ? savingsTotal / totalBalance : 0;
  const funFundPct = totalBalance > 0 ? funFundTotal / totalBalance : 0;

  const thisMonth = new Date().getMonth();
  const thisMonthTx = TRANSACTIONS.filter((tx) => getMonthFromDateToken(tx.date) === thisMonth);
  const nataliaTx = thisMonthTx.filter((tx) => tx.contributors.includes('Natalia'));
  const suhayllTx = thisMonthTx.filter((tx) => tx.contributors.includes('Suhayl'));
  const nataliaTotal = nataliaTx.reduce((sum, tx) => sum + tx.amount, 0);
  const suhayllTotal = suhayllTx.reduce((sum, tx) => sum + tx.amount, 0);
  const thisMonthTotal = thisMonthTx.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: 0,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
          style={{
            alignSelf: 'flex-start',
            paddingRight: 12,
            paddingVertical: 4,
          }}
        >
          <Text style={{ color: '#1a4030', fontSize: 32, lineHeight: 32 }}>‹</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 32, color: '#1a4030', fontWeight: '500', lineHeight: 36, textAlign: 'left' }}>
          Money stuff
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.netWorthLabel}>Our net worth:</Text>
        <Text style={styles.totalAmount}>{formatCurrency(totalBalance)}</Text>

        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <View style={[styles.card, { flex: 1, marginRight: 8 }]}> 
            <Text style={styles.sectionLabel}>SAVINGS</Text>
            <Text style={{ fontSize: 20, fontWeight: '500', color: '#1a4030', marginBottom: 8 }}>
              {formatCurrency(savingsTotal)}
            </Text>
            <View
              style={{
                width: '100%',
                height: 4,
                backgroundColor: 'rgba(90,138,106,0.2)',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <View style={{ width: `${savingsPct * 100}%`, height: '100%', backgroundColor: '#2a6a4a' }} />
            </View>
            <Text style={{ fontSize: 10, color: '#7aaa8a', marginTop: 8 }}>{`${Math.round(savingsPct * 100)}%`}</Text>
          </View>

          <View style={[styles.card, { flex: 1 }]}> 
            <Text style={styles.sectionLabel}>FUN FUND</Text>
            <Text style={{ fontSize: 20, fontWeight: '500', color: '#1a4030', marginBottom: 8 }}>
              {formatCurrency(funFundTotal)}
            </Text>
            <View
              style={{
                width: '100%',
                height: 4,
                backgroundColor: 'rgba(90,138,106,0.2)',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <View style={{ width: `${funFundPct * 100}%`, height: '100%', backgroundColor: '#7aaa8a' }} />
            </View>
            <Text style={{ fontSize: 10, color: '#7aaa8a', marginTop: 8 }}>{`${Math.round(funFundPct * 100)}%`}</Text>
          </View>
        </View>

        <View style={[styles.card, { marginBottom: 12 }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={styles.sectionLabel}>THIS MONTH</Text>
            <Text style={styles.greenText}>{`+${formatCurrency(thisMonthTotal)}`}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.mutedText}>Natalia</Text>
              <Text style={{ fontSize: 15, fontWeight: '500', color: '#1a4030', marginTop: 2 }}>
                {formatCurrency(nataliaTotal)}
              </Text>
            </View>

            <View style={{ width: 0.5, backgroundColor: 'rgba(90,138,106,0.2)' }} />

            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={styles.mutedText}>Suhayl</Text>
              <Text style={{ fontSize: 15, fontWeight: '500', color: '#1a4030', marginTop: 2 }}>
                {formatCurrency(suhayllTotal)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}> 
          {TRANSACTIONS.map((tx, index) => (
            <View key={tx.id}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.primaryText}>{tx.label}</Text>
                  <Text style={styles.mutedText}>{`${tx.date} · ${tx.fund} · ${tx.contributors.join(' + ')}`}</Text>
                </View>

                <Text style={styles.greenText}>{`+${formatCurrency(tx.amount)}`}</Text>
              </View>

              {index < TRANSACTIONS.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Made by Suhayl (with love) ♥ 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  screen: { flex: 1, backgroundColor: '#d4e9dc' },
  scroll: { padding: 22, paddingTop: 0 },
  sectionLabel: {
    fontSize: 11,
    color: '#5a8a6a',
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '500',
    color: '#1a4030',
    letterSpacing: 0,
    marginBottom: 18,
  },
  netWorthLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5a8a6a',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 2,
  },
  primaryText: { fontSize: 13, fontWeight: '500', color: '#1a4030' },
  mutedText: { fontSize: 11, color: '#7aaa8a' },
  greenText: { fontSize: 13, fontWeight: '500', color: '#2a6a4a' },
  divider: { height: 0.5, backgroundColor: 'rgba(90,138,106,0.2)' },
  footer: { textAlign: 'center', fontSize: 11, color: '#7aaa8a', paddingVertical: 18 },
} as const;
