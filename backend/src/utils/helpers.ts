export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function generateInviteCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const CATEGORIAS_SEED = [
  { nome: 'Água', icone: 'water_drop', cor: '#2196F3' },
  { nome: 'Luz', icone: 'bolt', cor: '#FFC107' },
  { nome: 'Gás', icone: 'local_fire_department', cor: '#FF5722' },
  { nome: 'Renda', icone: 'home', cor: '#2C2C2C' },
  { nome: 'Condomínio', icone: 'apartment', cor: '#607D8B' },
  { nome: 'Internet', icone: 'wifi', cor: '#3F51B5' },
  { nome: 'Telecomunicações', icone: 'phone', cor: '#009688' },
  { nome: 'Supermercado', icone: 'shopping_cart', cor: '#4CAF50' },
  { nome: 'Restaurante', icone: 'restaurant', cor: '#E91E63' },
  { nome: 'Combustível', icone: 'local_gas_station', cor: '#795548' },
  { nome: 'Saúde', icone: 'medical_services', cor: '#F44336' },
  { nome: 'Limpeza', icone: 'cleaning_services', cor: '#00BCD4' },
  { nome: 'Streaming', icone: 'play_circle', cor: '#9C27B0' },
  { nome: 'Educação', icone: 'school', cor: '#673AB7' },
  { nome: 'Lazer', icone: 'sports_esports', cor: '#FF9800' },
  { nome: 'Seguros', icone: 'security', cor: '#455A64' },
  { nome: 'Outras', icone: 'more_horiz', cor: '#9E9E9E' },
];
