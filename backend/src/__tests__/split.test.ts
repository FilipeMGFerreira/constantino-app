import { calcularDivisao, minimizarTransferencias } from '../services/despesa-split.service';

describe('calcularDivisao', () => {
  it('divide igualmente e ajusta o último cêntimo', () => {
    const parts = calcularDivisao(100, 'IGUAL', [
      { habitanteId: 'aaaaaaaaaaaaaaaaaaaaaaaa' },
      { habitanteId: 'bbbbbbbbbbbbbbbbbbbbbbbb' },
      { habitanteId: 'cccccccccccccccccccccccc' },
    ]);
    expect(parts).toHaveLength(3);
    const sum = parts.reduce((s, p) => s + p.valor, 0);
    expect(sum).toBeCloseTo(100, 2);
  });

  it('valida percentagens', () => {
    expect(() =>
      calcularDivisao(90, 'PERCENTAGEM', [
        { habitanteId: 'aaaaaaaaaaaaaaaaaaaaaaaa', percentagem: 50 },
        { habitanteId: 'bbbbbbbbbbbbbbbbbbbbbbbb', percentagem: 40 },
      ])
    ).toThrow();
  });
});

describe('minimizarTransferencias', () => {
  it('calcula acertos João/Maria/Pedro', () => {
    // João paid 600, Maria 200, Pedro 100 — equal split 300 each
    const transfers = minimizarTransferencias([
      { habitanteId: 'joao', pago: 600, devido: 300, saldo: 300 },
      { habitanteId: 'maria', pago: 200, devido: 300, saldo: -100 },
      { habitanteId: 'pedro', pago: 100, devido: 300, saldo: -200 },
    ]);

    expect(transfers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ de: 'maria', para: 'joao', valor: 100 }),
        expect.objectContaining({ de: 'pedro', para: 'joao', valor: 200 }),
      ])
    );
    expect(transfers).toHaveLength(2);
  });
});
