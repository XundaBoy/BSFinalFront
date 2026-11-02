import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SaldoService } from '../../services/saldo.service';
import {
  AgendaFinanceiraService,
  type AgendaFinanceira,
  type MoedaAgenda,
  type TipoAgenda
} from '../../services/agenda-financeira.service';

type AlertaProxima = 'Hoje' | 'Amanhã' | 'Próximo';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss'
})
export class InicioComponent implements OnInit {

  private readonly saldoService = inject(SaldoService);
  private readonly agendaService = inject(AgendaFinanceiraService);

  saldoCaixa: number | null = null;
  carregandoSaldo = false;
  erroSaldo = '';

  // Mesmos valores de referencia usados anteriormente no dashboard.
  // A agenda nao usa estas taxas: nao ha conversao dos seus valores.
  readonly cotacaoBrlPorUsd = 5.38;
  readonly cotacaoPygPorUsd = 5890;

  contasPagar: AgendaFinanceira[] = [];
  contasReceber: AgendaFinanceira[] = [];
  carregandoPagar = false;
  carregandoReceber = false;
  erroPagar = '';
  erroReceber = '';

  ngOnInit(): void {
    this.carregarSaldo();
    this.carregarAgenda('PAGAR');
    this.carregarAgenda('RECEBER');
  }

  carregarSaldo(): void {
    if (this.carregandoSaldo) return;
    this.carregandoSaldo = true;
    this.erroSaldo = '';

    this.saldoService.consultarSaldo().subscribe({
      next: saldo => {
        this.carregandoSaldo = false;
        if (saldo === null || saldo === undefined || !Number.isFinite(Number(saldo))) {
          this.saldoCaixa = null;
          this.erroSaldo = 'O servidor retornou um saldo inválido.';
          return;
        }
        this.saldoCaixa = Number(saldo);
      },
      error: erro => {
        console.error('Erro ao carregar saldo:', erro);
        this.saldoCaixa = null;
        this.carregandoSaldo = false;
        this.erroSaldo = erro.status === 0
          ? 'Não foi possível conectar ao Spring Boot.'
          : 'Não foi possível carregar o saldo.';
      }
    });
  }

  carregarAgenda(tipo: TipoAgenda): void {
    if (tipo === 'PAGAR') {
      if (this.carregandoPagar) return;
      this.carregandoPagar = true;
      this.erroPagar = '';
    } else {
      if (this.carregandoReceber) return;
      this.carregandoReceber = true;
      this.erroReceber = '';
    }

    this.agendaService.listar(tipo).subscribe({
      next: contas => {
        if (tipo === 'PAGAR') {
          this.contasPagar = contas;
          this.carregandoPagar = false;
        } else {
          this.contasReceber = contas;
          this.carregandoReceber = false;
        }
      },
      error: erro => {
        console.error(`Erro ao carregar agenda ${tipo}:`, erro);
        const mensagem = erro.status === 0
          ? 'Sem conexão com o Spring Boot.'
          : erro.status === 401
            ? 'Sessão expirada. Faça login novamente.'
            : 'Não foi possível consultar a agenda.';
        if (tipo === 'PAGAR') {
          this.contasPagar = [];
          this.carregandoPagar = false;
          this.erroPagar = mensagem;
        } else {
          this.contasReceber = [];
          this.carregandoReceber = false;
          this.erroReceber = mensagem;
        }
      }
    });
  }

  // Somente contas pendentes que vencem de HOJE ate 7 dias adiante.
  // Data sem horario, interpretada localmente para nao mudar de dia.
  private selecionarProximas(contas: AgendaFinanceira[]): AgendaFinanceira[] {
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + 7);

    return contas
      .filter(conta => {
        if (conta.status !== 'PENDENTE') return false;
        const dia = this.lerDataLocal(conta.dataHora);
        return dia >= hoje && dia <= limite;
      })
      .sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  }

  get proximasPagar(): AgendaFinanceira[] {
    return this.selecionarProximas(this.contasPagar);
  }

  get proximasReceber(): AgendaFinanceira[] {
    return this.selecionarProximas(this.contasReceber);
  }

  private lerDataLocal(dataHora: string): Date {
    const [ano, mes, dia] = dataHora.slice(0, 10).split('-').map(Number);
    return new Date(ano, mes - 1, dia);
  }

  alerta(conta: AgendaFinanceira): AlertaProxima {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const amanha = new Date(inicio);
    amanha.setDate(amanha.getDate() + 1);
    const vencimento = this.lerDataLocal(conta.dataHora);

    if (vencimento.getTime() === inicio.getTime()) return 'Hoje';
    if (vencimento.getTime() === amanha.getTime()) return 'Amanhã';
    return 'Próximo';
  }

  formatarData(dataHora: string): string {
    const [ano, mes, dia] = dataHora.slice(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  }

  formatarMoeda(valor: number, moeda: MoedaAgenda): string {
    if (moeda === 'PYG') {
      return `₲ ${new Intl.NumberFormat('es-PY', {
        maximumFractionDigits: 0
      }).format(Number(valor))}`;
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: moeda,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(valor));
  }

  formatarUSD(valor: number): string {
    return this.formatarMoeda(valor, 'USD');
  }

  formatarBRL(valor: number): string {
    return this.formatarMoeda(valor, 'BRL');
  }

  formatarPYG(valor: number): string {
    return this.formatarMoeda(valor, 'PYG');
  }

  identificarConta(_indice: number, conta: AgendaFinanceira): number {
    return conta.id;
  }
}
