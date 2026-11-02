
import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  inject
} from '@angular/core';


import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import {
  SaidasService,
  type Saida,
  type SaidaPayload,
  type Moeda,
  type OrigemCotacao
} from '../../../services/saidas.service';

export type { Saida } from '../../../services/saidas.service';

@Component({
    selector: 'app-saidasdetails',
    imports: [FormsModule, RouterLink],
    templateUrl: './saidasdetails.component.html',
    styleUrl: './saidasdetails.component.scss'
})
export class SaidasdetailsComponent implements OnInit {

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(SaidasService);

  @Input() emModal = false;
  @Input() saidaParaEditar: Saida | null = null;

  @Output() salvo = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  // CAMPOS DO FORMULARIO
  nomeSaida = '';
  valor: number | null = null;

  moedaOriginal: Moeda = 'BRL';
  origemCotacao: OrigemCotacao = 'AUTOMATICA';
  cotacaoManual: number | null = null;

  modoEdicao = false;
  idSaida: number | null = null;

  mensagemErro = '';
  salvando = false;

  // =====================================
  // COTACOES PROVISORIAS
  // =====================================

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

  // =====================================
  // INICIALIZACAO
  // =====================================

  ngOnInit(): void {

    if (this.emModal) {

      if (this.saidaParaEditar) {
        this.preencherFormulario(this.saidaParaEditar);
      }

      return;
    }

    // COMPATIBILIDADE COM ROTAS /new e /edit/:id
    const parametro = this.route.snapshot.paramMap.get('id');

    if (parametro === null) {
      return;
    }

    const id = Number(parametro);

    if (!Number.isSafeInteger(id) || id <= 0) {
      this.mensagemErro = 'ID da saída inválido.';
      return;
    }

    this.modoEdicao = true;
    this.idSaida = id;

    this.api.findAll().subscribe({

      next: registros => {

        const encontrado = registros.find(
          item => item.id === id
        );

        if (encontrado) {
          this.preencherFormulario(encontrado);
        } else {
          this.mensagemErro =
            'Saída não encontrada no banco de dados.';
        }
      },

      error: erro => {
        console.error(erro);

        this.mensagemErro =
          'Não foi possível carregar a saída do servidor.';
      }
    });
  }

  // =====================================
  // PREENCHER CAMPOS NA EDICAO
  // =====================================

  private preencherFormulario(item: Saida): void {

    this.modoEdicao = true;
    this.idSaida = item.id;

    this.nomeSaida = item.nomeSaida;
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

  // =====================================
  // TROCAR MOEDA
  // =====================================

  alterarMoeda(): void {

    this.origemCotacao = 'AUTOMATICA';
    this.cotacaoManual = null;
  }

  // =====================================
  // ALTERAR TIPO DE COTACAO
  // =====================================

  alterarOrigemCotacao(): void {

    if (this.origemCotacao === 'MANUAL') {
      this.cotacaoManual =
        this.cotacoesPadrao[this.moedaOriginal];
    } else {
      this.cotacaoManual = null;
    }
  }

  // =====================================
  // SIMBOLO DA MOEDA
  // =====================================

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

  // =====================================
  // COTACAO APLICADA
  // =====================================

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

  // =====================================
  // PREVIA DO VALOR EM USD
  // =====================================

  get valorConvertidoUSD(): number | null {

    const numero = Number(this.valor);
    const cotacao = this.cotacaoAplicada;

    if (
      this.valor === null ||
      !Number.isFinite(numero) ||
      numero <= 0 ||
      cotacao === null ||
      cotacao <= 0
    ) {
      return null;
    }

    // PREVIA VISUAL.
    // O SPRING BOOT FAZ O CALCULO DEFINITIVO.
    return Math.round(
      (numero / cotacao + Number.EPSILON) * 100
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

  // =====================================
  // CANCELAR CADASTRO OU EDICAO
  // =====================================

  cancelar(): void {

    if (this.salvando) {
      return;
    }

    if (this.emModal) {
      this.cancelado.emit();
    } else {
      void this.router.navigate(['/otc/saidas']);
    }
  }

  // =====================================
  // SALVAR SAIDA
  // =====================================

  salvar(): void {

    if (this.salvando) {
      return;
    }

    this.mensagemErro = '';

    const nome = this.nomeSaida.trim();
    const numero = Number(this.valor);

    // VALIDAR NOME
    if (!nome) {
      this.mensagemErro = 'Informe o nome da saída.';
      return;
    }

    if (nome.length > 255) {
      this.mensagemErro =
        'O nome deve ter no máximo 255 caracteres.';
      return;
    }

    // VALIDAR VALOR
    if (
      this.valor === null ||
      !Number.isFinite(numero) ||
      numero < 0.01
    ) {
      this.mensagemErro =
        'Informe um valor maior ou igual a 0,01.';
      return;
    }

    // GUARANI EM UNIDADES INTEIRAS
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
      !Number.isSafeInteger(Math.round(centavos)) ||
      Math.abs(
        centavos - Math.round(centavos)
      ) > 0.000001
    ) {
      this.mensagemErro =
        'O valor deve ter no máximo duas casas decimais.';
      return;
    }

    // VALIDAR COTACAO MANUAL
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

      const oitoDecimais = cotacao * 100000000;

      if (
        Math.abs(
          oitoDecimais - Math.round(oitoDecimais)
        ) > 0.000001
      ) {
        this.mensagemErro =
          'A cotação deve ter no máximo oito casas decimais.';
        return;
      }
    }

    // VALIDAR ID NA EDICAO
    if (
      this.modoEdicao &&
      this.idSaida === null
    ) {
      this.mensagemErro =
        'Não foi possível identificar a saída para editar.';
      return;
    }

    // =====================================
    // DADOS ENVIADOS PARA O BACKEND
    // =====================================

    const dados: SaidaPayload = {

      nomeSaida: nome,

      valor: Math.round(centavos) / 100,

      moedaOriginal: this.moedaOriginal,

      origemCotacao:
        this.moedaOriginal === 'USD'
          ? 'AUTOMATICA'
          : this.origemCotacao
    };

    // INCLUI COTACAO SOMENTE SE FOR MANUAL
    if (
      dados.origemCotacao === 'MANUAL' &&
      this.cotacaoManual !== null
    ) {
      dados.cotacaoPorUsd = this.cotacaoManual;
    }

    this.salvando = true;

    const requisicao = this.modoEdicao
      ? this.api.updateById(this.idSaida!, dados)
      : this.api.save(dados);

    requisicao.subscribe({

      next: () => {

        this.salvando = false;

        if (this.emModal) {
          this.salvo.emit();
        } else {
          void this.router.navigate(['/otc/saidas']);
        }
      },

      error: (erro: HttpErrorResponse) => {

        console.error('Erro na API de saídas:', erro);

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
            'Você não tem permissão para alterar saídas.';

        } else {

          this.mensagemErro =
            'Não foi possível salvar. Tente novamente.';
        }
      }
    });
  }
}
