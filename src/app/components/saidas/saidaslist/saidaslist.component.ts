
import {
  Component,
  OnInit,
  HostListener,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import {
  SaidasdetailsComponent
} from '../saidasdetails/saidasdetails.component';

import {
  SaidasService,
  type Saida
} from '../../../services/saidas.service';

@Component({
    selector: 'app-saidaslist',
    imports: [
        CommonModule,
        FormsModule,
        SaidasdetailsComponent
    ],
    templateUrl: './saidaslist.component.html',
    styleUrl: './saidaslist.component.scss'
})
export class SaidaslistComponent implements OnInit {

  private readonly api = inject(SaidasService);

  // =====================================
  // LISTA DE SAIDAS
  // =====================================

  saidas: Saida[] = [];

  carregando = false;
  erroCarregamento = '';

  ngOnInit(): void {
    this.carregarSaidas();
  }

  // =====================================
  // CARREGAR SAIDAS DO BACKEND
  // =====================================

  carregarSaidas(): void {

    this.carregando = true;
    this.erroCarregamento = '';

    this.api.findAll().subscribe({

      next: registros => {

        this.saidas = registros;
        this.carregando = false;
      },

      error: erro => {

        console.error(
          'Erro ao carregar saídas:',
          erro
        );

        this.carregando = false;

        this.erroCarregamento = erro.status === 0
          ? 'Sem conexão com o Spring Boot. Confirme a porta e o CORS.'
          : 'Não foi possível carregar saídas do banco de dados.';
      }
    });
  }

  // =====================================
  // FILTROS
  // =====================================

  filtroNome: string = '';
  filtroMes: string = '';

  // FILTROS FINANCEIROS EM USD
  valorMinimo: number | null = null;
  valorMaximo: number | null = null;

  // =====================================
  // NORMALIZAR TEXTO
  // IGNORA ACENTOS E MAIUSCULAS
  // =====================================

  private normalizarTexto(texto: string): string {

    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }

  // =====================================
  // FILTRAR SAIDAS
  // =====================================

  get saidasFiltradas(): Saida[] {

    const nomePesquisado = this.normalizarTexto(
      this.filtroNome
    );

    return this.saidas

      .filter((saida) => {

        // FILTRO POR NOME
        const nomeNormalizado = this.normalizarTexto(
          saida.nomeSaida
        );

        const atendeNome =
          !nomePesquisado ||
          nomeNormalizado.includes(nomePesquisado);

        // FILTRO POR MES
        const atendeMes =
          !this.filtroMes ||
          saida.dataHora.startsWith(this.filtroMes);

        // VALOR MINIMO EM USD
        const atendeMinimo =
          this.valorMinimo == null ||
          saida.valorUsd > this.valorMinimo;

        // VALOR MAXIMO EM USD
        const atendeMaximo =
          this.valorMaximo == null ||
          saida.valorUsd < this.valorMaximo;

        return (
          atendeNome &&
          atendeMes &&
          atendeMinimo &&
          atendeMaximo
        );
      })

      // MAIS RECENTES PRIMEIRO
      .sort((a, b) =>
        b.dataHora.localeCompare(a.dataHora)
      );
  }

  // =====================================
  // FORMATAR BRL, PYG E USD
  // =====================================

  formatarMoeda(
    valor: number,
    moeda: Saida['moedaOriginal'] = 'USD'
  ): string {

    if (moeda === 'PYG') {

      const formatado = new Intl.NumberFormat(
        'es-PY',
        {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }
      ).format(valor);

      return `₲ ${formatado}`;
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: moeda,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  }

  // =====================================
  // FORMATAR DATA E HORA
  // =====================================

  formatarData(dataHora: string): string {

    const [data, hora] = dataHora.split('T');
    const [ano, mes, dia] = data.split('-');

    return `${dia}/${mes}/${ano} às ${hora.slice(0, 5)}`;
  }

  // =====================================
  // TOTAL DAS SAIDAS EM USD
  // =====================================

  get totalFiltrado(): number {

    return this.saidasFiltradas.reduce(
      (total, saida) => total + saida.valorUsd,
      0
    );
  }

  // =====================================
  // LIMPAR FILTROS
  // =====================================

  limparFiltros(): void {

    this.filtroNome = '';
    this.filtroMes = '';

    this.valorMinimo = null;
    this.valorMaximo = null;
  }

  // =====================================
  // EXCLUIR SAIDA
  // =====================================

  async excluirSaida(id: number): Promise<void> {

    const item = this.saidas.find(
      registro => registro.id === id
    );

    if (!item) {
      return;
    }

    const resultado = await Swal.fire({

      titleText: 'Confirmar exclusão',

      icon: 'warning',

      iconHtml: `
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 6h18"/>
          <path d="M8 6V4h8v2"/>
          <path d="M5 6l1 15h12l1-15"/>
          <path d="M10 11v6"/>
          <path d="M14 11v6"/>
        </svg>
      `,

      text:
        `Tem certeza que deseja excluir "${item.nomeSaida}"?\n` +
        'Esta ação não poderá ser desfeita.',

      showCloseButton: true,
      showCancelButton: true,

      confirmButtonText: 'Excluir',
      cancelButtonText: 'Cancelar',

      reverseButtons: true,
      focusCancel: true,

      buttonsStyling: false,

      background: '#4b4b57',
      color: '#ffffff',

      customClass: {
        popup: 'bs-delete-popup',
        title: 'bs-delete-title',
        icon: 'bs-delete-icon',
        htmlContainer: 'bs-delete-message',
        actions: 'bs-delete-actions',
        confirmButton: 'bs-delete-confirm',
        cancelButton: 'bs-delete-cancel',
        closeButton: 'bs-delete-close'
      }
    });

    if (!resultado.isConfirmed) {
      return;
    }

    this.api.deleteById(id).subscribe({

      next: () => {

        this.carregarSaidas();

        void Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          titleText: 'Saída excluída com sucesso!',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
          background: '#ffffff',
          color: '#302c70'
        });
      },

      error: erro => {

        console.error('Erro ao excluir saída:', erro);

        void Swal.fire({
          titleText: 'Erro ao excluir',

          text: erro.status === 0
            ? 'Não foi possível conectar ao Spring Boot.'
            : 'Não foi possível excluir esta saída no banco de dados.',

          icon: 'error',
          confirmButtonColor: '#6355d9'
        });
      }
    });
  }

  // =====================================
  // IDENTIFICAR SAIDA PELO ID
  // =====================================

  identificarSaida(
    index: number,
    saida: Saida
  ): number {

    return saida.id;
  }

  // =====================================
  // MENU DOS TRES PONTINHOS
  // =====================================

  menuAbertoId: number | null = null;

  menuTop = 0;
  menuLeft = 0;

  saidaEmEdicao: Saida | null = null;
  criandoSaida = false;

  // =====================================
  // SAIDA SELECIONADA
  // =====================================

  get saidaMenuSelecionada(): Saida | null {

    return this.saidas.find(
      item => item.id === this.menuAbertoId
    ) ?? null;
  }

  // =====================================
  // ALTERNAR MENU
  // =====================================

  alternarMenu(
    id: number,
    evento: MouseEvent
  ): void {

    evento.stopPropagation();

    if (this.menuAbertoId === id) {
      this.fecharMenu();
      return;
    }

    const botao =
      evento.currentTarget as HTMLElement;

    const posicao =
      botao.getBoundingClientRect();

    const largura = 180;
    const altura = 102;
    const margem = 12;

    this.menuLeft = Math.max(
      margem,
      Math.min(
        posicao.right - largura,
        window.innerWidth - largura - margem
      )
    );

    this.menuTop =
      posicao.bottom + altura + margem >
      window.innerHeight
        ? Math.max(
            margem,
            posicao.top - altura - 6
          )
        : posicao.bottom + 6;

    this.menuAbertoId = id;
  }

  // =====================================
  // FECHAR MENU
  // =====================================

  fecharMenu(): void {
    this.menuAbertoId = null;
  }

  // =====================================
  // FECHAR MENU AO CLICAR FORA
  // =====================================

  @HostListener('document:click')
  fecharMenuAoClicarFora(): void {
    this.fecharMenu();
  }

  // =====================================
  // FECHAR MENU AO REDIMENSIONAR
  // =====================================

  @HostListener('window:resize')
  fecharMenuAoRedimensionar(): void {
    this.fecharMenu();
  }

  // =====================================
  // TECLA ESC
  // =====================================

  @HostListener('document:keydown.escape')
  fecharComEscape(): void {

    this.fecharMenu();
    this.fecharEdicao();
  }

  // =====================================
  // ABRIR CADASTRO
  // =====================================

  abrirCadastro(): void {

    this.fecharMenu();

    this.saidaEmEdicao = null;
    this.criandoSaida = true;
  }

  // =====================================
  // ABRIR EDICAO
  // =====================================

  abrirEdicao(): void {

    const selecionada =
      this.saidaMenuSelecionada;

    this.fecharMenu();

    if (!selecionada) {
      return;
    }

    this.criandoSaida = false;

    // FAZ UMA COPIA ANTES DE EDITAR
    this.saidaEmEdicao = {
      ...selecionada
    };
  }

  // =====================================
  // FECHAR MODAL
  // =====================================

  fecharEdicao(): void {

    this.saidaEmEdicao = null;
    this.criandoSaida = false;
  }

  // =====================================
  // APOS SALVAR CADASTRO OU EDICAO
  // =====================================

  aoSalvarEdicao(): void {

    const eraCadastro = this.criandoSaida;

    this.fecharEdicao();

    // ATUALIZA COM OS DADOS CONVERTIDOS
    this.carregarSaidas();

    void Swal.fire({

      toast: true,
      position: 'top-end',
      icon: 'success',

      titleText: eraCadastro
        ? 'Saída cadastrada com sucesso!'
        : 'Saída atualizada com sucesso!',

      showConfirmButton: false,

      timer: 1800,
      timerProgressBar: true,

      background: '#ffffff',
      color: '#302c70'
    });
  }

  // =====================================
  // EXCLUIR PELO MENU
  // =====================================

  excluirSelecionada(): void {

    const id = this.menuAbertoId;

    this.fecharMenu();

    if (id !== null) {
      void this.excluirSaida(id);
    }
  }
}
