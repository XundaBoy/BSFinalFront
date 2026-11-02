
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

  // VALOR SEMPRE EM USD
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

  private readonly entradasService = inject(EntradasService);
  private readonly saidasService = inject(SaidasService);
  private readonly saldoService = inject(SaldoService);

  // =====================================
  // DADOS RECEBIDOS DO MYSQL
  // =====================================

  entradas: Entrada[] = [];
  saidas: Saida[] = [];
  movimentacoes: Movimentacao[] = [];

  // SALDO EM USD CALCULADO PELO SPRING BOOT
  saldo: number | null = null;

  // =====================================
  // CONTROLE DE CARREGAMENTO
  // =====================================

  carregando = false;
  erroCarregamento = '';
  dadosCompletos = false;

  entradasDisponiveis = false;
  saidasDisponiveis = false;

  // =====================================
  // FILTROS
  // =====================================

  filtroNome = '';
  filtroMes = '';

  filtroTipo: 'todos' | TipoMovimentacao = 'todos';

  // =====================================
  // FORMATADOR EXCLUSIVO EM USD
  // =====================================

  private readonly formatadorUSD =
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  // =====================================
  // INICIALIZACAO
  // =====================================

  ngOnInit(): void {
    this.carregarExtrato();
  }

  // =====================================
  // CARREGAR DADOS DAS TRES APIS
  // =====================================

  carregarExtrato(): void {

    this.carregando = true;
    this.erroCarregamento = '';
    this.dadosCompletos = false;

    this.entradasDisponiveis = false;
    this.saidasDisponiveis = false;

    this.entradas = [];
    this.saidas = [];
    this.movimentacoes = [];
    this.saldo = null;

    const avisos: string[] = [];

    forkJoin({

      // BUSCAR ENTRADAS
      entradas: this.entradasService.findAll().pipe(
        catchError((erro: unknown) => {

          console.error(
            'Erro ao buscar entradas:',
            erro
          );

          avisos.push(
            'Não foi possível consultar as entradas.'
          );

          return of(null as Entrada[] | null);
        })
      ),

      // BUSCAR SAIDAS
      saidas: this.saidasService.findAll().pipe(
        catchError((erro: unknown) => {

          console.error(
            'Erro ao buscar saídas:',
            erro
          );

          avisos.push(
            'Não foi possível consultar as saídas.'
          );

          return of(null as Saida[] | null);
        })
      ),

      // BUSCAR SALDO EM USD
      saldo: this.saldoService.consultarSaldo().pipe(
        catchError((erro: unknown) => {

          console.error(
            'Erro ao consultar saldo:',
            erro
          );

          avisos.push(
            'Não foi possível consultar o saldo.'
          );

          return of(null as number | null);
        })
      )

    }).subscribe({

      next: ({ entradas, saidas, saldo }) => {

        // =====================================
        // VALIDAR OS VALORES CONVERTIDOS
        // =====================================

        const entradasValidas =
          entradas !== null &&
          entradas.every(entrada =>
            entrada.valorUsd !== null &&
            entrada.valorUsd !== undefined &&
            Number.isFinite(Number(entrada.valorUsd))
          );

        const saidasValidas =
          saidas !== null &&
          saidas.every(saida =>
            saida.valorUsd !== null &&
            saida.valorUsd !== undefined &&
            Number.isFinite(Number(saida.valorUsd))
          );

        if (entradas !== null && !entradasValidas) {
          avisos.push(
            'Existem entradas sem um valor USD válido.'
          );
        }

        if (saidas !== null && !saidasValidas) {
          avisos.push(
            'Existem saídas sem um valor USD válido.'
          );
        }

        this.entradasDisponiveis = entradasValidas;
        this.saidasDisponiveis = saidasValidas;

        this.entradas = entradasValidas
          ? entradas!
          : [];

        this.saidas = saidasValidas
          ? saidas!
          : [];

        // =====================================
        // ENTRADAS CONVERTIDAS PARA O EXTRATO
        // =====================================

        const listaEntradas: Movimentacao[] =
          this.entradas.map(entrada => ({

            id: entrada.id,

            tipo: 'entrada',

            nome: entrada.nomeEntrada,

            // USA O VALOR EM DOLAR
            valor: Number(entrada.valorUsd),

            dataHora: entrada.dataHora ?? null

          }));

        // =====================================
        // SAIDAS CONVERTIDAS PARA O EXTRATO
        // =====================================

        const listaSaidas: Movimentacao[] =
          this.saidas.map(saida => ({

            id: saida.id,

            tipo: 'saida',

            nome: saida.nomeSaida,

            // USA O VALOR EM DOLAR
            valor: Number(saida.valorUsd),

            dataHora: saida.dataHora ?? null

          }));

        // =====================================
        // JUNTAR MOVIMENTACOES
        // =====================================

        this.movimentacoes = [
          ...listaEntradas,
          ...listaSaidas
        ];

        // =====================================
        // ORDENAR DAS MAIS RECENTES
        // PARA AS MAIS ANTIGAS
        // =====================================

        this.movimentacoes.sort((a, b) =>
          (b.dataHora ?? '').localeCompare(
            a.dataHora ?? ''
          )
        );

        // =====================================
        // RECEBER SALDO EM USD DO BACKEND
        // =====================================

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

        // =====================================
        // VERIFICAR SE TUDO FOI CARREGADO
        // =====================================

        this.dadosCompletos =
          this.entradasDisponiveis &&
          this.saidasDisponiveis &&
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
          'Verifique se o Spring Boot está ligado.';

        this.carregando = false;
      }
    });
  }

  // =====================================
  // SOMAR VALORES EM CENTAVOS
  // EVITA PEQUENAS DIFERENCAS DECIMAIS
  // =====================================

  private somarEmUSD(valores: number[]): number {

    const totalCentavos = valores.reduce(
      (soma, valor) =>
        soma + Math.round(valor * 100),
      0
    );

    return totalCentavos / 100;
  }

  // =====================================
  // TOTAL DE ENTRADAS EM USD
  // =====================================

  get totalEntradas(): number {

    return this.somarEmUSD(
      this.entradas.map(entrada =>
        Number(entrada.valorUsd)
      )
    );
  }

  // =====================================
  // TOTAL DE SAIDAS EM USD
  // =====================================

  get totalSaidas(): number {

    return this.somarEmUSD(
      this.saidas.map(saida =>
        Number(saida.valorUsd)
      )
    );
  }

  // =====================================
  // COMPARAR SALDO DA API COM OS TOTAIS
  // TODOS OS VALORES EM USD
  // =====================================

  get saldoDivergente(): boolean {

    if (
      !this.dadosCompletos ||
      this.saldo === null
    ) {
      return false;
    }

    const saldoCalculado =
      this.totalEntradas - this.totalSaidas;

    return Math.abs(
      Math.round(this.saldo * 100) -
      Math.round(saldoCalculado * 100)
    ) > 1;
  }

  // =====================================
  // NORMALIZAR TEXTO PARA BUSCA
  // =====================================

  private normalizarTexto(texto: string): string {

    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }

  // =====================================
  // FILTRAR MOVIMENTACOES
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

      // FILTRO POR MES
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
  // FORMATAR TODOS OS VALORES EM USD
  // =====================================

  formatarMoeda(valor: number): string {

    return this.formatadorUSD.format(valor);
  }

  // =====================================
  // FORMATAR DATA E HORA
  // =====================================

  formatarData(dataHora: string | null): string {

    if (
      !dataHora ||
      !dataHora.includes('T')
    ) {
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
  // IDENTIFICAR MOVIMENTACAO
  // =====================================

  identificarMovimentacao(
    _index: number,
    movimentacao: Movimentacao
  ): string {

    // ENTRADAS E SAIDAS PODEM TER O MESMO ID
    return `${movimentacao.tipo}-${movimentacao.id}`;
  }
}
