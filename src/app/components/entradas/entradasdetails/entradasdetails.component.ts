
import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import {
  EntradasService,
  type Entrada,
  type EntradaPayload,
  type Moeda
} from '../../../services/entradas.service';

export type { Entrada } from '../../../services/entradas.service';

type ModoCotacao = 'AUTOMATICA' | 'MANUAL';

@Component({
    selector: 'app-entradasdetails',
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './entradasdetails.component.html',
    styleUrl: './entradasdetails.component.scss'
})
export class EntradasdetailsComponent implements OnInit {

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(EntradasService);

  @Input() emModal = false;
  @Input() entradaParaEditar: Entrada | null = null;

  @Output() salvo = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  nomeEntrada = '';
  valor: number | null = null;

  moedaOriginal: Moeda = 'BRL';
  origemCotacao: ModoCotacao = 'AUTOMATICA';
  cotacaoManual: number | null = null;

  modoEdicao = false;
  idEntrada: number | null = null;

  mensagemErro = '';
  salvando = false;

  // TAXAS PROVISORIAS
  // Futuramente serao consultadas na API de cambio.
  private readonly cotacoesPadrao: Record<Moeda, number> = {
    BRL: 5.38,
    PYG: 5890,
    USD: 1
  };

  private readonly formatadorUSD =
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD'
    });

  ngOnInit(): void {

    if (this.emModal) {
      if (this.entradaParaEditar) {
        this.preencherFormulario(this.entradaParaEditar);
      }
      return;
    }

    const parametro = this.route.snapshot.paramMap.get('id');

    if (parametro === null) {
      return;
    }

    const id = Number(parametro);

    if (!Number.isSafeInteger(id) || id <= 0) {
      this.mensagemErro = 'ID da entrada inválido.';
      return;
    }

    this.modoEdicao = true;
    this.idEntrada = id;

    this.api.findAll().subscribe({
      next: registros => {

        const encontrado = registros.find(
          item => item.id === id
        );

        if (encontrado) {
          this.preencherFormulario(encontrado);
        } else {
          this.mensagemErro =
            'Entrada não encontrada no banco de dados.';
        }
      },

      error: erro => {
        console.error(erro);
        this.mensagemErro =
          'Não foi possível carregar a entrada do servidor.';
      }
    });
  }

  // PREENCHER FORMULARIO NA EDICAO
  private preencherFormulario(item: Entrada): void {

    this.modoEdicao = true;
    this.idEntrada = item.id;

    this.nomeEntrada = item.nomeEntrada;
    this.valor = item.valor;

    this.moedaOriginal = item.moedaOriginal;

    this.origemCotacao =
      item.origemCotacao === 'MANUAL'
        ? 'MANUAL'
        : 'AUTOMATICA';

    this.cotacaoManual =
      this.origemCotacao === 'MANUAL'
        ? item.cotacaoPorUsd
        : null;
  }

  // QUANDO A MOEDA FOR ALTERADA
  alterarMoeda(): void {

    // Uma nova moeda comeca pela cotacao padrao.
    this.origemCotacao = 'AUTOMATICA';
    this.cotacaoManual = null;
  }

  // QUANDO O TIPO DE COTACAO FOR ALTERADO
  alterarOrigemCotacao(): void {

    if (this.origemCotacao === 'MANUAL') {
      this.cotacaoManual =
        this.cotacoesPadrao[this.moedaOriginal];
    } else {
      this.cotacaoManual = null;
    }
  }

  // SIMBOLO DA MOEDA SELECIONADA
  get simboloMoeda(): string {

    switch (this.moedaOriginal) {
      case 'BRL':
        return 'R$';
      case 'PYG':
        return '₲';
      case 'USD':
        return 'US$';
    }
  }

  // COTACAO UTILIZADA NA PREVIA
  get cotacaoAplicada(): number | null {

    if (this.moedaOriginal === 'USD') {
      return 1;
    }

    if (this.origemCotacao === 'MANUAL') {

      const cotacao = Number(this.cotacaoManual);

      if (
        this.cotacaoManual === null ||
        !Number.isFinite(cotacao) ||
        cotacao <= 0
      ) {
        return null;
      }

      return cotacao;
    }

    return this.cotacoesPadrao[this.moedaOriginal];
  }

  // CALCULO PARA EXIBICAO NO FORMULARIO
  get valorConvertidoUSD(): number | null {

    if (
      this.valor === null ||
      !Number.isFinite(this.valor) ||
      this.valor <= 0
    ) {
      return null;
    }

    const cotacao = this.cotacaoAplicada;

    if (cotacao === null || cotacao <= 0) {
      return null;
    }

    return Math.round(
      (this.valor / cotacao) * 100
    ) / 100;
  }

  formatarUSD(valor: number): string {
    return this.formatadorUSD.format(valor);
  }

  formatarCotacao(valor: number): string {

    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(valor);
  }

  // CANCELAR FORMULARIO
  cancelar(): void {

    if (this.salvando) {
      return;
    }

    if (this.emModal) {
      this.cancelado.emit();
    } else {
      void this.router.navigate(['/otc/entradas']);
    }
  }

  // SALVAR NOVA ENTRADA OU EDICAO
  salvar(): void {

    if (this.salvando) {
      return;
    }

    this.mensagemErro = '';

    const nome = this.nomeEntrada.trim();
    const numero = Number(this.valor);

    if (!nome) {
      this.mensagemErro = 'Informe o nome da entrada.';
      return;
    }

    if (nome.length > 255) {
      this.mensagemErro =
        'O nome deve ter no máximo 255 caracteres.';
      return;
    }

    if (
      this.valor === null ||
      !Number.isFinite(numero) ||
      numero < 0.01
    ) {
      this.mensagemErro =
        'Informe um valor maior ou igual a 0,01.';
      return;
    }

    // O guarani sera cadastrado em unidades inteiras.
    if (
      this.moedaOriginal === 'PYG' &&
      !Number.isInteger(numero)
    ) {
      this.mensagemErro =
        'Informe o valor em guaranis sem casas decimais.';
      return;
    }

    const centavos = numero * 100;

    if (
      Math.abs(
        centavos - Math.round(centavos)
      ) > 0.000001
    ) {
      this.mensagemErro =
        'O valor deve ter no máximo duas casas decimais.';
      return;
    }

    if (
      this.origemCotacao === 'MANUAL' &&
      this.moedaOriginal !== 'USD'
    ) {

      const cotacao = Number(this.cotacaoManual);

      if (
        this.cotacaoManual === null ||
        !Number.isFinite(cotacao) ||
        cotacao <= 0
      ) {
        this.mensagemErro =
          'Informe uma cotação manual maior que zero.';
        return;
      }
    }

    if (
      this.modoEdicao &&
      this.idEntrada === null
    ) {
      this.mensagemErro =
        'Não foi possível identificar a entrada para editar.';
      return;
    }

    // ENVIAMOS SOMENTE OS DADOS NECESSARIOS.
    // O SPRING BOOT CALCULA O VALOR EM USD.
    const dados: EntradaPayload = {

      nomeEntrada: nome,

      valor: Math.round(centavos) / 100,

      moedaOriginal: this.moedaOriginal,

      origemCotacao:
        this.moedaOriginal === 'USD'
          ? 'AUTOMATICA'
          : this.origemCotacao
    };

    if (
      dados.origemCotacao === 'MANUAL' &&
      this.cotacaoManual !== null
    ) {
      dados.cotacaoPorUsd = this.cotacaoManual;
    }

    this.salvando = true;

    const requisicao = this.modoEdicao
      ? this.api.updateById(this.idEntrada!, dados)
      : this.api.save(dados);

    requisicao.subscribe({

      next: () => {

        this.salvando = false;

        if (this.emModal) {
          this.salvo.emit();
        } else {
          void this.router.navigate(['/otc/entradas']);
        }
      },

      error: (erro: HttpErrorResponse) => {

        console.error('Erro na API de entradas:', erro);

        this.salvando = false;

        if (erro.status === 0) {
          this.mensagemErro =
            'Não foi possível conectar ao Spring Boot.';
        } else if (erro.status === 400) {
          this.mensagemErro =
            'Dados rejeitados. Confira a moeda, o valor e a cotação.';
        } else if (erro.status === 401) {
          this.mensagemErro =
            'Sua sessão expirou. Faça login novamente.';
        } else if (erro.status === 403) {
          this.mensagemErro =
            'Você não tem permissão para alterar entradas.';
        } else {
          this.mensagemErro =
            'Não foi possível salvar. Tente novamente.';
        }
      }
    });
  }
}
