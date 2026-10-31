import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, HostListener, inject } from '@angular/core';
import Swal from 'sweetalert2';
import { EntradasdetailsComponent } from '../entradasdetails/entradasdetails.component';
import { EntradasService, type Entrada } from '../../../services/entradas.service';


@Component({
  selector: 'app-entradaslist',
  standalone: true,
  imports: [CommonModule, FormsModule, EntradasdetailsComponent],
  templateUrl: './entradaslist.component.html',
  styleUrl: './entradaslist.component.scss'
})
export class EntradaslistComponent implements OnInit {

  private readonly api = inject(EntradasService);

  entradas: Entrada[] = [];
  carregando = false;
  erroCarregamento = '';

  ngOnInit(): void {
    this.carregarEntradas();
  }

  carregarEntradas(): void {
    this.carregando = true;
    this.erroCarregamento = '';

    this.api.findAll().subscribe({
      next: registros => {
        this.entradas = registros;
        this.carregando = false;
      },
      error: erro => {
        console.error('Erro ao carregar entradas:', erro);
        this.carregando = false;
        this.erroCarregamento = erro.status === 0
          ? 'Sem conexão com o Spring Boot. Confirme a porta e o CORS.'
          : 'Não foi possível carregar entradas do banco de dados.';
      }
    });
  }

  // =====================================
  // VARIÁVEIS DOS FILTROS
  // =====================================

  filtroNome: string = '';
  filtroMes: string = '';

  valorMinimo: number | null = null;
  valorMaximo: number | null = null;

  // =====================================
  // NORMALIZAÇÃO DO TEXTO
  // IGNORA ACENTOS E MAIÚSCULAS
  // =====================================

  private normalizarTexto(texto: string): string {

    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();

  }

  // =====================================
  // FILTROS
  // =====================================

  get entradasFiltradas(): Entrada[] {

    // Normaliza o que o usuário digitou
    const nomePesquisado = this.normalizarTexto(
      this.filtroNome
    );

    return this.entradas

      .filter((entrada) => {

        // Normaliza o nome da entrada
        const nomeNormalizado = this.normalizarTexto(
          entrada.nomeEntrada
        );

        // FILTRO PELO NOME
        const atendeNome =
          !nomePesquisado ||
          nomeNormalizado.includes(nomePesquisado);

        // FILTRO PELO MÊS
        // Começa vazio, mostrando todos os meses
        const atendeMes =
          !this.filtroMes ||
          entrada.dataHora.startsWith(this.filtroMes);

        // FILTRO DE VALOR MÍNIMO
        // Valor deve ser MAIOR que o informado
        const atendeMinimo =
          this.valorMinimo == null ||
          entrada.valor > this.valorMinimo;

        // FILTRO DE VALOR MÁXIMO
        // Valor deve ser MENOR que o informado
        const atendeMaximo =
          this.valorMaximo == null ||
          entrada.valor < this.valorMaximo;

        return (
          atendeNome &&
          atendeMes &&
          atendeMinimo &&
          atendeMaximo
        );

      })

      // Mais recentes primeiro
      .sort((a, b) =>
        b.dataHora.localeCompare(a.dataHora)
      );
  }

  // =====================================
  // FORMATAÇÃO DE MOEDA
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
  // FORMATAÇÃO DE DATA E HORA
  // =====================================

  formatarData(dataHora: string): string {

    const [data, hora] = dataHora.split('T');
    const [ano, mes, dia] = data.split('-');

    return `${dia}/${mes}/${ano} às ${hora.slice(0, 5)}`;
  }

  // =====================================
  // SOMA DOS VALORES FILTRADOS
  // =====================================

  get totalFiltrado(): number {

    return this.entradasFiltradas.reduce(
      (total, entrada) => total + entrada.valor,
      0
    );
  }

  // =====================================
  // LIMPAR TODOS OS FILTROS
  // =====================================

  limparFiltros(): void {

    this.filtroNome = '';
    this.filtroMes = '';

    this.valorMinimo = null;
    this.valorMaximo = null;

  }

  // =====================================
  // EXCLUIR ENTRADA NO BACKEND
  // =====================================
  async excluirEntrada(id: number): Promise<void> {
    const item = this.entradas.find(registro => registro.id === id);
    if (!item) return;

    const resultado = await Swal.fire({
      titleText: 'Confirmar exclusão',
      icon: 'warning',
      iconHtml: `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"/><path d="M8 6V4h8v2"/>
          <path d="M5 6l1 15h12l1-15"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
        </svg>`,
      text: `Tem certeza que deseja excluir "${item.nomeEntrada}"?\n` +
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

    if (!resultado.isConfirmed) return;

    this.api.deleteById(id).subscribe({
      next: () => {
        this.carregarEntradas();
        void Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          titleText: 'Entrada excluída com sucesso!',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
          background: '#ffffff',
          color: '#302c70'
        });
      },
      error: erro => {
        console.error('Erro ao excluir entrada:', erro);
        void Swal.fire({
          titleText: 'Erro ao excluir',
          text: erro.status === 0
            ? 'Não foi possível conectar ao Spring Boot.'
            : 'Não foi possível excluir esta entrada no banco de dados.',
          icon: 'error',
          confirmButtonColor: '#6355d9'
        });
      }
    });
  }

  // =====================================
  // IDENTIFICAR ENTRADAS PELO ID
  // =====================================

  identificarEntrada(
    index: number,
    entrada: Entrada
  ): number {

    return entrada.id;

  }


// =====================================
// MENU DE AÇÕES E MODAL DE EDIÇÃO
// =====================================
menuAbertoId: number | null = null;
menuTop = 0;
menuLeft = 0;
entradaEmEdicao: Entrada | null = null;
criandoEntrada = false;

get entradaMenuSelecionada(): Entrada | null {
  return this.entradas.find(item => item.id === this.menuAbertoId) ?? null;
}

alternarMenu(id: number, evento: MouseEvent): void {
  evento.stopPropagation();

  if (this.menuAbertoId === id) {
    this.fecharMenu();
    return;
  }

  const botao = evento.currentTarget as HTMLElement;
  const posicao = botao.getBoundingClientRect();
  const largura = 180;
  const altura = 102;
  const margem = 12;

  this.menuLeft = Math.max(margem, Math.min(
    posicao.right - largura,
    window.innerWidth - largura - margem
  ));

  this.menuTop = posicao.bottom + altura + margem > window.innerHeight
    ? Math.max(margem, posicao.top - altura - 6)
    : posicao.bottom + 6;

  this.menuAbertoId = id;
}

fecharMenu(): void {
  this.menuAbertoId = null;
}

@HostListener('document:click')
fecharMenuAoClicarFora(): void {
  this.fecharMenu();
}

@HostListener('window:resize')
fecharMenuAoRedimensionar(): void {
  this.fecharMenu();
}

@HostListener('document:keydown.escape')
fecharComEscape(): void {
  this.fecharMenu();
  this.fecharEdicao();
}

// Novo registro: utiliza o details com campos vazios.
abrirCadastro(): void {
  this.fecharMenu();
  this.entradaEmEdicao = null;
  this.criandoEntrada = true;
}

// Editar: utiliza o details preenchido com o registro selecionado.
abrirEdicao(): void {
  const selecionada = this.entradaMenuSelecionada;
  this.fecharMenu();

  if (!selecionada) return;

  this.criandoEntrada = false;
  // Cópia para preservar os dados até o usuário clicar em Salvar.
  this.entradaEmEdicao = { ...selecionada };
}

fecharEdicao(): void {
  this.entradaEmEdicao = null;
  this.criandoEntrada = false;
}

// Executado depois que o backend confirmou o salvamento.
aoSalvarEdicao(): void {
  const eraCadastro = this.criandoEntrada;
  this.fecharEdicao();
  this.carregarEntradas();
  void Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    titleText: eraCadastro
      ? 'Entrada cadastrada com sucesso!'
      : 'Entrada atualizada com sucesso!',
    showConfirmButton: false,
    timer: 1800,
    timerProgressBar: true,
    background: '#ffffff',
    color: '#302c70'
  });
}

// Usa o SweetAlert2 já existente no método excluirEntrada().
excluirSelecionada(): void {
  const id = this.menuAbertoId;
  this.fecharMenu();
  if (id !== null) void this.excluirEntrada(id);
}

}
