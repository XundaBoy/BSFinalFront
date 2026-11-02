
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SaldoService } from '../../services/saldo.service';

// =====================================
// MODELO DAS CONTAS DEMONSTRATIVAS
// =====================================

interface ContaExemplo {
  vencimento: string;
  descricao: string;
  fornecedor: string;
  valor: number;
  situacao: 'Próxima' | 'Prevista';
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss'
})
export class InicioComponent implements OnInit {

  // =====================================
  // SERVICO DE SALDO DO SPRING BOOT
  // =====================================

  private readonly saldoService = inject(SaldoService);

  // =====================================
  // SALDO EM CAIXA
  // MESMO SALDO UTILIZADO NO EXTRATO
  // =====================================

  saldoCaixa: number | null = null;

  carregandoSaldo = false;
  erroSaldo = '';

  // =====================================
  // COTACOES PROVISORIAS
  // MESMOS VALORES DO APPLICATION.PROPERTIES
  // =====================================

  readonly cotacaoBrlPorUsd = 5.38;
  readonly cotacaoPygPorUsd = 5890;

  // =====================================
  // EXEMPLOS DE CONTAS A PAGAR
  // NAO SAO REGISTROS DO BANCO DE DADOS
  // =====================================

  readonly contasExemplo: ContaExemplo[] = [

    {
      vencimento: '2026-11-02',
      descricao: 'Aluguel comercial',
      fornecedor: 'Imobiliária Exemplo',
      valor: 2500.00,
      situacao: 'Próxima'
    },

    {
      vencimento: '2026-11-05',
      descricao: 'Energia elétrica',
      fornecedor: 'Distribuidora Exemplo',
      valor: 480.90,
      situacao: 'Próxima'
    },

    {
      vencimento: '2026-11-08',
      descricao: 'Internet',
      fornecedor: 'Provedor Exemplo',
      valor: 179.90,
      situacao: 'Prevista'
    },

    {
      vencimento: '2026-11-11',
      descricao: 'Serviços de manutenção',
      fornecedor: 'Prestadora Exemplo',
      valor: 850.00,
      situacao: 'Prevista'
    },

    {
      vencimento: '2026-11-15',
      descricao: 'Material de escritório',
      fornecedor: 'Papelaria Exemplo',
      valor: 320.50,
      situacao: 'Prevista'
    }
  ];

  // =====================================
  // FORMATADORES DE MOEDA
  // =====================================

  private readonly formatadorUSD =
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  private readonly formatadorBRL =
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  private readonly formatadorPYG =
    new Intl.NumberFormat('es-PY', {
      maximumFractionDigits: 0
    });

  // =====================================
  // INICIALIZACAO DO DASHBOARD
  // =====================================

  ngOnInit(): void {
    this.carregarSaldo();
  }

  // =====================================
  // BUSCAR SALDO REAL DO EXTRATO
  // =====================================

  carregarSaldo(): void {

    if (this.carregandoSaldo) {
      return;
    }

    this.carregandoSaldo = true;
    this.erroSaldo = '';

    this.saldoService.consultarSaldo().subscribe({

      next: saldo => {

        this.carregandoSaldo = false;

        if (
          saldo === null ||
          saldo === undefined ||
          !Number.isFinite(Number(saldo))
        ) {
          this.saldoCaixa = null;

          this.erroSaldo =
            'O servidor retornou um saldo inválido.';

          return;
        }

        this.saldoCaixa = Number(saldo);
      },

      error: erro => {

        console.error(
          'Erro ao consultar saldo em caixa:',
          erro
        );

        this.carregandoSaldo = false;
        this.saldoCaixa = null;

        this.erroSaldo = erro.status === 0
          ? 'Sem conexão com o Spring Boot.'
          : erro.status === 401
          ? 'Sessão expirada. Faça login novamente.'
          : 'Não foi possível consultar o saldo.';
      }
    });
  }

  // =====================================
  // FORMATAÇÃO DE VALORES
  // =====================================

  formatarUSD(valor: number): string {
    return this.formatadorUSD.format(valor);
  }

  formatarBRL(valor: number): string {
    return this.formatadorBRL.format(valor);
  }

  formatarPYG(valor: number): string {
    return `₲ ${this.formatadorPYG.format(valor)}`;
  }

  // =====================================
  // FORMATAR VENCIMENTO
  // SEM CONVERSAO DE FUSO HORARIO
  // =====================================

  formatarData(dataISO: string): string {

    const [ano, mes, dia] = dataISO.split('-');

    return `${dia}/${mes}/${ano}`;
  }
}
