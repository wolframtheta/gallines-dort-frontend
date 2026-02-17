export interface Transaction {
  id: number;
  date: string;
  type: 'expense' | 'income';
  member: string;
  amount: number;
  description: string;
}

export interface NewTransaction {
  type: 'expense' | 'income';
  member: string;
  amount: string;
  description: string;
}

export interface SettlementRow {
  person: string;
  paid: number;
  held: number;
  netContribution: number;
  diff: number;
  fairShare: number;
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

export const COLORS = {
  bg: '#F7F4E8',
  primary: '#557A46',
  accent: '#B86B4D',
  highlight: '#F2C335',
  textMain: '#2D2A26',
  textLight: '#8C857B',
} as const;
