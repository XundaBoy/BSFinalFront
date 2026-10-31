
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';

import {
  EntradasService,
  type Entrada
} from '../../../services/entradas.service';

import {
  SaidasService,
  type Saida
} from '../../../services/saidas.service';

import { SaldoService } from '../../../services/saldo.service';

// =====================================
// MODELO DO EXTRATO
// =====================================

type TipoMovimentacao = 'entrada' | 'saida';

interface Movimentacao {
  id: number;
  tipo: TipoMovimentacao;
  nome: string;
  valor: number;
  dataHora: string | null;
}

@Component({
  selector: 'app-extratolist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './extratolist.component.html',
  styleUrl: './extratolist.component.scss'
})
export class ExtratolistComponent implements OnInit {

  // =====================================
  // SERVICES DO BACKEND
  // =====================================

  private entradasService = inject(EntradasService);
  private saidasService = inject(SaidasService);
  private saldoService = inject(SaldoService);

  // =====================================
  // DADOS RECEBIDOS DO MYSQL
  // =====================================

  entradas: Entrada[] = [];
  saidas: Saida[] = [];
  movimentacoes: Movimentacao[] = [];

  // Saldo calculado pelo Spring Boot
  saldo: number | null = null;

  // =====================================
  // CONTROLE DE CARREGAMENTO
  // =====================================

  carregando: boolean = false;
  erroCarregamento: string = '';
  dadosCompletos: boolean = false;

  // =====================================
  // FILTROS
  // =====================================

  filtroNome: string = '';
  filtroMes: string = '';
  filtroTipo: 'todos' | TipoMovimentacao = 'todos';

  // =====================================
  // INICIALIZAÇÃO
  // =====================================

  ngOnInit(): void {
    this.carregarExtrato();
  }

  // =====================================
  // BUSCAR DADOS DAS TRÊS APIS
  // =====================================

  carregarExtrato(): void {

    this.carregando = true;
    this.erroCarregamento = '';
    this.dadosCompletos = false;
    this.saldo = null;

    const avisos: string[] = [];

    forkJoin({

      // BUSCAR ENTRADAS
      entradas: this.entradasService.findAll().pipe(
        catchError((erro: unknown) => {
          console.error('Erro ao buscar entradas:', erro);

          avisos.push(
            'Não foi possível consultar as entradas.'
          );

          return of(null as Entrada[] | null);
        })
      ),

      // BUSCAR SAÍDAS
      saidas: this.saidasService.findAll().pipe(
        catchError((erro: unknown) => {
          console.error('Erro ao buscar saídas:', erro);

          avisos.push(
            'Não foi possível consultar as saídas.'
          );

          return of(null as Saida[] | null);
        })
      ),

      // BUSCAR SALDO
      saldo: this.saldoService.consultarSaldo().pipe(
        catchError((erro: unknown) => {
          console.error('Erro ao consultar saldo:', erro);

          avisos.push(
            'Não foi possível consultar o saldo.'
          );

          return of(null as number | null);
        })
      )

    }).subscribe({

      next: ({ entradas, saidas, saldo }) => {

        // GUARDA ENTRADAS E SAÍDAS
        this.entradas = entradas ?? [];
        this.saidas = saidas ?? [];

        // TRANSFORMA ENTRADAS EM MOVIMENTAÇÕES
        const listaEntradas: Movimentacao[] =
          this.entradas.map(entrada => ({

            id: entrada.id,
            tipo: 'entrada',
            nome: entrada.nomeEntrada,
            valor: Number(entrada.valor),
            dataHora: entrada.dataHora ?? null

          }));

        // TRANSFORMA SAÍDAS EM MOVIMENTAÇÕES
        const listaSaidas: Movimentacao[] =
          this.saidas.map(saida => ({

            id: saida.id,
            tipo: 'saida',
            nome: saida.nomeSaida,
            valor: Number(saida.valor),
            dataHora: saida.dataHora ?? null

          }));

        // JUNTA ENTRADAS E SAÍDAS
        this.movimentacoes = [
          ...listaEntradas,
          ...listaSaidas
        ];

        // ORDENA DA MAIS RECENTE PARA A MAIS ANTIGA
        this.movimentacoes.sort((a, b) =>
          (b.dataHora ?? '').localeCompare(a.dataHora ?? '')
        );

        // SALDO RECEBIDO DO BACKEND
        this.saldo =
          saldo !== null &&
          Number.isFinite(Number(saldo))
            ? Number(saldo)
            : null;

        if (saldo !== null && this.saldo === null) {
          avisos.push(
            'A API retornou um saldo inválido.'
          );
        }

        // CONFERE SE TODAS AS CONSULTAS FUNCIONARAM
        this.dadosCompletos =
          entradas !== null &&
          saidas !== null &&
          this.saldo !== null;

        this.erroCarregamento = avisos.join(' ');
        this.carregando = false;
      },

      error: (erro: unknown) => {

        console.error(
          'Erro inesperado no Extrato:',
          erro
        );

        this.erroCarregamento =
          'Não foi possível carregar o Extrato. ' +
          'Verifique o Spring Boot.';

        this.carregando = false;
      }

    });

  }

  // =====================================
  // TOTAL DE ENTRADAS
  // =====================================

  get totalEntradas(): number {

    const soma = this.entradas.reduce(
      (total, entrada) =>
        total + Number(entrada.valor),
      0
    );

    return Math.round(soma * 100) / 100;
  }

  // =====================================
  // TOTAL DE SAÍDAS
  // =====================================

  get totalSaidas(): number {

    const soma = this.saidas.reduce(
      (total, saida) =>
        total + Number(saida.valor),
      0
    );

    return Math.round(soma * 100) / 100;
  }

  // =====================================
  // VERIFICAR SE O SALDO ESTÁ CORRETO
  // =====================================

  get saldoDivergente(): boolean {

    if (!this.dadosCompletos || this.saldo === null) {
      return false;
    }

    const saldoCalculado = Math.round(
      (this.totalEntradas - this.totalSaidas) * 100
    ) / 100;

    return Math.abs(
      this.saldo - saldoCalculado
    ) > 0.01;
  }

  // =====================================
  // NORMALIZAR TEXTO
  // =====================================

  private normalizarTexto(texto: string): string {

    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }

  // =====================================
  // FILTRAR MOVIMENTAÇÕES
  // =====================================

  get movimentacoesFiltradas(): Movimentacao[] {

    const nomePesquisado = this.normalizarTexto(
      this.filtroNome
    );

    return this.movimentacoes.filter(movimentacao => {

      // FILTRO POR NOME
      const atendeNome =
        !nomePesquisado ||
        this.normalizarTexto(movimentacao.nome)
          .includes(nomePesquisado);

      // FILTRO POR TIPO
      const atendeTipo =
        this.filtroTipo === 'todos' ||
        movimentacao.tipo === this.filtroTipo;

      // FILTRO POR MÊS
      const atendeMes =
        !this.filtroMes ||
        (
          movimentacao.dataHora?.startsWith(
            this.filtroMes
          ) ?? false
        );

      return (
        atendeNome &&
        atendeTipo &&
        atendeMes
      );

    });
  }

  // =====================================
  // LIMPAR FILTROS
  // =====================================

  limparFiltros(): void {

    this.filtroNome = '';
    this.filtroTipo = 'todos';
    this.filtroMes = '';
  }

  // =====================================
  // FORMATAR VALOR EM REAIS
  // =====================================

  private readonly formatadorMoeda =
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

  formatarMoeda(valor: number): string {
    return this.formatadorMoeda.format(valor);
  }

  // =====================================
  // FORMATAR DATA E HORA
  // =====================================

  formatarData(dataHora: string | null): string {

    if (!dataHora || !dataHora.includes('T')) {
      return 'Data não disponível';
    }

    const [data, hora] = dataHora.split('T');
    const [ano, mes, dia] = data.split('-');

    if (!ano || !mes || !dia || !hora) {
      return 'Data não disponível';
    }

    return `${dia}/${mes}/${ano} às ${hora.slice(0, 5)}`;
  }

  // =====================================
  // IDENTIFICAR MOVIMENTAÇÃO
  // =====================================

  identificarMovimentacao(
    _index: number,
    movimentacao: Movimentacao
  ): string {

    // IDs de entrada e saída podem se repetir
    return `${movimentacao.tipo}-${movimentacao.id}`;
  }

}
