import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Despesa } from '../models/despesa.model';
import { Habitante } from '../models/habitante.model';
import { Categoria } from '../models/categoria.model';
import { Response } from 'express';

async function loadData(
  casaId: string,
  filters: { mes?: number; ano?: number; categoria?: string; habitante?: string }
) {
  const query: Record<string, unknown> = { casaId, estado: { $ne: 'ANULADA' } };
  if (filters.mes) query.mes = filters.mes;
  if (filters.ano) query.ano = filters.ano;
  if (filters.categoria) query.categoriaId = filters.categoria;
  if (filters.habitante) {
    query.$or = [
      { pagoPor: filters.habitante },
      { 'participantes.habitanteId': filters.habitante },
    ];
  }

  const [despesas, habitantes, categorias] = await Promise.all([
    Despesa.find(query).sort({ data: 1 }).lean(),
    Habitante.find({ casaId }).lean(),
    Categoria.find({ casaId }).lean(),
  ]);

  const habMap = new Map(habitantes.map((h) => [h._id.toString(), h.nome]));
  const catMap = new Map(categorias.map((c) => [c._id.toString(), c.nome]));

  return despesas.map((d) => ({
    data: new Date(d.data).toISOString().slice(0, 10),
    descricao: d.descricao,
    categoria: catMap.get(d.categoriaId.toString()) ?? '',
    valor: d.valor,
    pagoPor: habMap.get(d.pagoPor.toString()) ?? '',
    estado: d.estado,
  }));
}

export async function exportCsv(
  casaId: string,
  filters: { mes?: number; ano?: number; categoria?: string; habitante?: string },
  res: Response
) {
  const rows = await loadData(casaId, filters);
  const header = 'Data;Descrição;Categoria;Valor;Pago por;Estado\n';
  const body = rows
    .map(
      (r) =>
        `${r.data};${r.descricao};${r.categoria};${r.valor.toFixed(2)};${r.pagoPor};${r.estado}`
    )
    .join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=relatorio.csv');
  res.send('\uFEFF' + header + body);
}

export async function exportExcel(
  casaId: string,
  filters: { mes?: number; ano?: number; categoria?: string; habitante?: string },
  res: Response
) {
  const rows = await loadData(casaId, filters);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Despesas');
  ws.columns = [
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Descrição', key: 'descricao', width: 32 },
    { header: 'Categoria', key: 'categoria', width: 18 },
    { header: 'Valor', key: 'valor', width: 12 },
    { header: 'Pago por', key: 'pagoPor', width: 18 },
    { header: 'Estado', key: 'estado', width: 12 },
  ];
  rows.forEach((r) => ws.addRow(r));
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename=relatorio.xlsx');
  await wb.xlsx.write(res);
  res.end();
}

export async function exportPdf(
  casaId: string,
  filters: { mes?: number; ano?: number; categoria?: string; habitante?: string },
  res: Response
) {
  const rows = await loadData(casaId, filters);
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=relatorio.pdf');
  doc.pipe(res);
  doc.fontSize(18).text('Constantino — Relatório de Despesas', { underline: true });
  doc.moveDown();
  doc.fontSize(10);
  for (const r of rows) {
    doc.text(
      `${r.data} | ${r.descricao} | ${r.categoria} | ${r.valor.toFixed(2)} € | ${r.pagoPor} | ${r.estado}`
    );
  }
  doc.end();
}
