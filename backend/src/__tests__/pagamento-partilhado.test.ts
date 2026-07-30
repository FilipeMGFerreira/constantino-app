import { emDivida, estadoPartilhado } from '../utils/pagamento-partilhado';

describe('pagamento partilhado', () => {
  it('calcula emDivida com resto positivo', () => {
    expect(emDivida(50, 20)).toBeCloseTo(30, 2);
    expect(emDivida(50, 50)).toBe(0);
    expect(emDivida(50, 60)).toBe(0);
  });

  it('marca PAGA só quando todas as quotas estão quitadas (ε 0.02)', () => {
    expect(
      estadoPartilhado([
        { valor: 33.33, valorPago: 33.33 },
        { valor: 33.33, valorPago: 33.32 },
        { valor: 33.34, valorPago: 33.34 },
      ])
    ).toBe('PAGA');

    expect(
      estadoPartilhado([
        { valor: 50, valorPago: 25 },
        { valor: 50, valorPago: 50 },
      ])
    ).toBe('PENDENTE');
  });
});
