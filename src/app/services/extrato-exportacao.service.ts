import { Injectable } from '@angular/core';

// =====================================
// MODELOS PARA EXPORTACAO DO EXTRATO
// =====================================

export interface ResumoExtrato {
  saldoAnterior: number;
  entradasPeriodo: number;
  saidasPeriodo: number;
  saldoFinal: number;
  quantidade: number;
  maiorEntrada: number;
  maiorSaida: number;
}

export interface MovimentacaoExtratoExportacao {
  id: number;
  nome: string;
  tipo: 'entrada' | 'saida';
  valor: number; // sempre USD, positivo no cadastro
  dataHora: string | null;
}

export interface DadosExportacaoExtrato {
  mes: string; // YYYY-MM
  mesTitulo: string;
  periodo: string;
  resumo: ResumoExtrato;
  movimentacoes: MovimentacaoExtratoExportacao[];
}

@Injectable({ providedIn: 'root' })
export class ExtratoExportacaoService {

  private readonly formatoUSD = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  private formatarUSD(valor: number): string {
    // Remove espaços não separáveis para boa renderização em PDF.
    return this.formatoUSD.format(valor).replace(/[\u00a0\u202f]/g, ' ');
  }

  private formatarData(dataHora: string | null): string {
    if (!dataHora) return 'Não informada';
    const [data, hora = ''] = dataHora.split('T');
    const [ano, mes, dia] = data.split('-');
    if (!ano || !mes || !dia) return 'Não informada';
    return hora
      ? `${dia}/${mes}/${ano} às ${hora.slice(0, 5)}`
      : `${dia}/${mes}/${ano}`;
  }

  // =====================================
  // EXPORTAR PDF
  // =====================================

  async exportarPdf(dados: DadosExportacaoExtrato): Promise<void> {
    // Bibliotecas só são carregadas quando o cliente solicita exportação.
    const [{ jsPDF }, { autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const larguraPagina = pdf.internal.pageSize.getWidth();
    const margem = 14;

    // Cabeçalho roxo.
    pdf.setFillColor(48, 44, 112);
    pdf.rect(0, 0, larguraPagina, 33, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(17);
    pdf.text('BS  |  FINANCEIRO', margem, 14);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('Extrato mensal de movimentações', margem, 23);

    pdf.setTextColor(48, 44, 112);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(17);
    pdf.text(dados.mesTitulo, margem, 44);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(112, 108, 129);
    pdf.text(`Período: ${dados.periodo}   |   Moeda: USD`, margem, 51);

    const cards = [
      { titulo: 'Saldo anterior', valor: dados.resumo.saldoAnterior, x: 14, y: 60, fundo: [248, 247, 253] as [number, number, number], cor: [48, 44, 112] as [number, number, number] },
      { titulo: 'Entradas no mês', valor: dados.resumo.entradasPeriodo, x: 108, y: 60, fundo: [234, 248, 240] as [number, number, number], cor: [39, 136, 91] as [number, number, number] },
      { titulo: 'Saídas no mês', valor: -dados.resumo.saidasPeriodo, x: 14, y: 88, fundo: [255, 240, 241] as [number, number, number], cor: [207, 88, 98] as [number, number, number] },
      { titulo: 'Saldo ao fim do mês', valor: dados.resumo.saldoFinal, x: 108, y: 88, fundo: [239, 237, 255] as [number, number, number], cor: [48, 44, 112] as [number, number, number] }
    ];

    for (const card of cards) {
      pdf.setFillColor(...card.fundo);
      pdf.roundedRect(card.x, card.y, 88, 23, 3, 3, 'F');
      pdf.setTextColor(101, 97, 121);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(card.titulo, card.x + 4, card.y + 8);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(...(card.valor < 0 ? [185, 59, 71] as [number,number,number] : card.cor));
      pdf.text(this.formatarUSD(card.valor), card.x + 4, card.y + 17);
    }

    // Dados complementares.
    pdf.setTextColor(91, 86, 112);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Movimentações: ${dados.resumo.quantidade}`, margem, 123);
    pdf.text(`Maior entrada: ${this.formatarUSD(dados.resumo.maiorEntrada)}`, 72, 123);
    pdf.text(`Maior saída: ${this.formatarUSD(dados.resumo.maiorSaida)}`, 139, 123);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(48, 44, 112);
    pdf.setFontSize(12);
    pdf.text('Movimentações do período', margem, 134);

    const linhas = dados.movimentacoes.map(item => [
      item.nome,
      item.tipo === 'entrada' ? 'Entrada' : 'Saída',
      `${item.tipo === 'entrada' ? '+' : '-'} ${this.formatarUSD(item.valor)}`,
      this.formatarData(item.dataHora)
    ]);

    autoTable(pdf, {
      startY: 139,
      head: [['Movimentação', 'Tipo', 'Valor (USD)', 'Data/hora']],
      body: linhas.length ? linhas : [['Nenhuma movimentação no mês.', '', '', '']],
      theme: 'striped',
      showHead: 'everyPage',
      margin: { top: 15, right: margem, bottom: 17, left: margem },
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [47, 44, 67],
        overflow: 'linebreak',
        valign: 'middle'
      },
      headStyles: { fillColor: [48, 44, 112], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [243, 244, 248] },
      columnStyles: {
        0: { cellWidth: 57 },
        1: { cellWidth: 25 },
        2: { cellWidth: 45, halign: 'right' },
        3: { cellWidth: 55 }
      }
    });

    const totalPaginas = pdf.getNumberOfPages();
    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      pdf.setPage(pagina);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(140, 136, 158);
      pdf.setFontSize(8);
      const yRodape = pdf.internal.pageSize.getHeight() - 9;
      pdf.text('BuchSilvaFinal • Valores em USD', margem, yRodape);
      pdf.text(`Página ${pagina} de ${totalPaginas}`, larguraPagina - margem, yRodape, {
        align: 'right'
      });
    }

    pdf.save(`BuchSilva_Extrato_${dados.mes}.pdf`);
  }
}
