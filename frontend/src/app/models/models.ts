export interface User {
  id: string;
  email: string;
  nome: string;
  casaId: string | null;
  habitanteId: string | null;
  ativo: boolean;
  notificacaoPrefs?: {
    quandoParticipo: boolean;
    quandoPaguei: boolean;
    mudancasEstado: boolean;
  };
}

export interface Casa {
  id: string;
  nome: string;
  morada: string | null;
  codigoConvite: string;
}

export interface Habitante {
  id: string;
  casaId: string;
  userId: string | null;
  nome: string;
  avatar: string;
  cor: string;
  ativo: boolean;
  dataEntrada: string;
  dataSaida: string | null;
}

export interface Categoria {
  id: string;
  casaId: string;
  nome: string;
  icone: string;
  cor: string;
}

export interface Participante {
  habitanteId: string;
  percentagem: number;
  valor: number;
}

export interface Despesa {
  id: string;
  descricao: string;
  categoriaId: string;
  categoriaNome?: string | null;
  categoriaIcone?: string;
  categoriaCor?: string;
  valor: number;
  data: string;
  mes: number;
  ano: number;
  pagoPor: string;
  participantes: Participante[];
  tipoDivisao: 'IGUAL' | 'PERCENTAGEM' | 'VALOR';
  recorrente: boolean;
  periodicidade?: string;
  estado: 'PAGA' | 'PENDENTE' | 'ANULADA';
  observacoes: string;
  anexoFileId: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  despesaId: string | null;
  lida: boolean;
  createdAt: string;
}
